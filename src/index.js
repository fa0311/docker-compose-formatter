import fs from "node:fs";
import YAML from "yaml";
import { parseYamlOptionsFromArgs } from "./parser.js";

/**
 * @param {YAML.Document} docs
 * @param {string[]} keys
 */
const sortByKey = (docs, keys) => {
  for (const key of keys) {
    const data = docs.get(key, true);
    docs.delete(key);
    docs.add({ key: key, value: data });
  }
};

const getGuard = (data, fn) => {
  if (!data) return;
  if (data.items.length === 0) return;
  fn(data);
};

/**
 * @template T
 * @param {T[]} array
 * @param {(a: T, b: T) => number} compare
 * @returns {T[]}
 */
const blockPartialSort = (array, compare) => {
  const n = array.length;
  if (n <= 1) return array.slice();

  /** @type {number[]} */
  const parent = Array.from({ length: n }, (_, i) => i);
  /** @type {number[]} */
  const rank = new Array(n).fill(0);

  /**
   * @param {number} x
   * @returns {number}
   */
  function find(x) {
    if (parent[x] !== x) {
      parent[x] = find(parent[x]);
    }
    return parent[x];
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  function union(x, y) {
    let rx = find(x);
    let ry = find(y);
    if (rx === ry) return;
    if (rank[rx] < rank[ry]) {
      parent[rx] = ry;
    } else if (rank[rx] > rank[ry]) {
      parent[ry] = rx;
    } else {
      parent[ry] = rx;
      rank[rx]++;
    }
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const c = compare(array[i], array[j]);
      if (c !== 0) {
        union(i, j);
      }
    }
  }

  /** @type {Map<number, number[]>} */
  const groups = new Map();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!groups.has(r)) {
      groups.set(r, []);
    }
    groups.get(r).push(i);
  }

  /** @type {{firstIndex: number, items: T[]}[]} */
  const blocks = [];

  for (const indices of groups.values()) {
    const firstIndex = Math.min(...indices);
    const items = indices.map((idx) => array[idx]);
    items.sort(compare);
    blocks.push({ firstIndex, items });
  }

  blocks.sort((a, b) => a.firstIndex - b.firstIndex);

  /** @type {T[]} */
  const result = [];
  for (const block of blocks) {
    result.push(...block.items);
  }
  return result;
};

/**
 * Sorts the services in the Docker Compose file.
 * @param {YAML.Document | undefined} data
 */
const sortKeyName = (data) => {
  sortByKey(
    data,
    blockPartialSort(
      data.items.map((item) => item.key.value),
      (a, b) => {
        const splitA = a.split(/[_-]/);
        const splitB = b.split(/[_-]/);
        if (splitA.length < splitB.length) {
          if (splitA.every((part, index) => part === splitB[index])) {
            return -1;
          }
        }
        if (splitB.length < splitA.length) {
          if (splitB.every((part, index) => part === splitA[index])) {
            return 1;
          }
        }
        return 0;
      },
    ),
  );
};
/**
 * Sorts the entire Docker Compose file.
 * @param {YAML.Document} data
 * @param {string[]} sortedKeys
 */
const sortServicesKeys = (data, sortedKeys) => {
  for (const service of data.items) {
    const serviceData = service.value;
    sortByKey(
      serviceData,
      serviceData.items
        .map((item) => item.key.value)
        .sort((a, b) => {
          const indexA = sortedKeys.indexOf(a);
          const indexB = sortedKeys.indexOf(b);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          if (indexA !== -1 && indexB === -1) return 0;
          return indexA - indexB;
        }),
    );
  }
};

/**
 * Replaces the name and/or extension of a file path.
 * @param {string} file - The original file path.
 * @param {string|undefined} name - The new name for the file (without extension).
 * @param {string|undefined} ext - The new extension for the file (with dot).
 * @returns {string} - The modified file path.
 */
const replaceName = (file, name, ext) => {
  const parts = file.split("/");
  const filenameParts = parts[parts.length - 1].split(".");

  if (name) {
    filenameParts[0] = name;
    parts[parts.length - 1] = filenameParts.join(".");
  }
  if (ext) {
    filenameParts[filenameParts.length - 1] = ext;
    parts[parts.length - 1] = filenameParts.join(".");
  }
  return parts.join("/");
};

/**
 * Replaces the base directory in a file path.
 * @param {string} file - The original file path.
 * @param {string} baseDir - The base directory to replace.
 * @returns {string} - The modified file path.
 */
const replaceDir = (file, baseDirs) => {
  for (const baseDir of baseDirs) {
    if (file.startsWith(baseDir)) {
      return file.slice(baseDir.length);
    }
  }
  return file;
};

/**
 * Checks if a file exists.
 * @param {string} filepath - The path to the file.
 * @returns {Promise<boolean>} - True if the file exists, false otherwise.
 */
const checkFileExists = (filepath) => {
  return new Promise((resolve) => {
    fs.access(filepath, fs.constants.F_OK, (error) => {
      resolve(!error);
    });
  });
};

/**
 * Main function to sort Docker Compose files.
 * @param {z.infer<typeof YamlOptionsSchema>} options
 */
export const main = async (options) => {
  const { sortedKeys, input, baseDirs, inputRenameExtensions, inputRenameName, ...yamlOptions } =
    options;

  for await (const file of fs.promises.glob(input)) {
    const renamedFile = replaceName(file, inputRenameName, inputRenameExtensions);
    const logFrom = replaceDir(file, baseDirs);
    const logTo = replaceDir(renamedFile, baseDirs);
    console.log(`Sorting ${logFrom}...`);

    const data = YAML.parseDocument(await fs.promises.readFile(file, "utf8"));
    getGuard(data.get("services"), (data) => sortKeyName(data));
    getGuard(data.get("volumes"), (data) => sortKeyName(data));
    getGuard(data.get("networks"), (data) => sortKeyName(data));
    getGuard(data.get("services"), (data) => sortServicesKeys(data, sortedKeys));

    if (renamedFile === file) {
      await fs.promises.writeFile(file, data.toString(yamlOptions));
    } else {
      console.log(`Renaming to ${logFrom} -> ${logTo}`);
      if (await checkFileExists(renamedFile)) {
        throw new Error(`File already exists: ${logTo}`);
      }
      await fs.promises.writeFile(renamedFile, data.toString(yamlOptions));
      await fs.promises.unlink(file);
    }
  }
};

const parsed = await parseYamlOptionsFromArgs();
await main(parsed);
