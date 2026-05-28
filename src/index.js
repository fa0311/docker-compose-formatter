import fs from "node:fs";
import path from "node:path";
import { globby } from "globby";
import YAML from "yaml";
import { parseYamlOptionsFromArgs } from "./parser.js";

/**
 * @param {YAML.Document} docs
 * @param {string[]} keys
 */
const sortByKey = (docs, keys) => {
  moveTrailingBlankLinesToNextKey(docs);

  const keyOrder = new Map(keys.map((key, index) => [key, index]));
  docs.items.sort((a, b) => keyOrder.get(a.key.value) - keyOrder.get(b.key.value));

  if (docs.items.length > 0) {
    delete docs.items[0].key.spaceBefore;
  }
};

/**
 * YAML sometimes attaches a blank line after an empty value to that value
 * rather than to the following key. Move that boundary marker before sorting.
 * @param {YAML.Document} docs
 */
const moveTrailingBlankLinesToNextKey = (docs) => {
  for (const [i, next] of docs.items.entries()) {
    if (i === 0) continue;
    if (next.key.spaceBefore) continue;
    if (takeTrailingBlankLine(docs.items[i - 1].value)) {
      next.key.spaceBefore = true;
    }
  }
};

/**
 * @param {YAML.Document | undefined} node
 * @returns {boolean}
 */
const takeTrailingBlankLine = (node) => {
  if (!node?.items || node.items.length === 0) return false;

  const lastItem = node.items[node.items.length - 1];
  if (lastItem.value?.spaceBefore && lastItem.value.value == null) {
    delete lastItem.value.spaceBefore;
    return true;
  }

  return takeTrailingBlankLine(lastItem.value);
};

/**
 * @param {YAML.Document | undefined} data
 * @param {(data: YAML.Document) => void} fn
 */
const getGuard = (data, fn) => {
  if (!data) return;
  if (!data.items || data.items.length === 0) return;
  fn(data);
};

/**
 * @param {YAML.Document} doc
 * @param {string} key
 */
const removeKey = (doc, key) => {
  const hasKey = doc.get(key) !== undefined;
  if (hasKey) doc.delete(key);
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
 * Sorts keys in a YAML document by the specified order.
 * @param {YAML.Document} data
 * @param {string[]} sortedKeys
 */
const sortKeysInDocument = (data, sortedKeys) => {
  sortByKey(
    data,
    data.items
      .map((item) => item.key.value)
      .sort((a, b) => {
        const indexA = sortedKeys.indexOf(a);
        const indexB = sortedKeys.indexOf(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      }),
  );
};

/**
 * Loops through items and applies a function to each item's value.
 * @param {YAML.Document | undefined} data
 * @param {(itemValue: YAML.Document) => void} fn
 */
const forEachItem = (data, fn) => {
  for (const item of data.items) {
    if (item.value) {
      fn(item.value);
    }
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
  const {
    rootSortedKeys,
    serviceSortedKeys,
    buildSortedKeys,
    healthcheckSortedKeys,
    loggingSortedKeys,
    deploySortedKeys,
    networkDefSortedKeys,
    volumeDefSortedKeys,
    input,
    cwd,
    inputRenameExtensions,
    inputRenameName,
    noIgnoreGitignored,
    ...yamlOptions
  } = options;

  for (const file of await globby(input, { cwd, gitignore: !noIgnoreGitignored })) {
    const filePath = path.resolve(cwd, file);
    const renamedFile = replaceName(file, inputRenameName, inputRenameExtensions);
    const renamedPath = path.resolve(cwd, renamedFile);
    console.log(`Sorting ${file}...`);

    const data = YAML.parseDocument(await fs.promises.readFile(filePath, "utf8"));
    removeKey(data, "version");

    // Sort root level keys
    if (data.contents && data.contents.items) {
      sortKeysInDocument(data.contents, rootSortedKeys);
    }

    // Sort service names, volume names, and network names
    getGuard(data.get("services"), (data) => sortKeyName(data));
    getGuard(data.get("volumes"), (data) => sortKeyName(data));
    getGuard(data.get("networks"), (data) => sortKeyName(data));

    // Sort service-level keys
    getGuard(data.get("services"), (servicesData) => {
      forEachItem(servicesData, (serviceData) => {
        getGuard(serviceData, (data) => sortKeysInDocument(data, serviceSortedKeys));
      });
    });

    // Sort nested elements in services
    getGuard(data.get("services"), (servicesData) => {
      forEachItem(servicesData, (serviceData) => {
        getGuard(serviceData.get("build"), (build) => sortKeysInDocument(build, buildSortedKeys));
        getGuard(serviceData.get("healthcheck"), (healthcheck) =>
          sortKeysInDocument(healthcheck, healthcheckSortedKeys),
        );
        getGuard(serviceData.get("logging"), (logging) =>
          sortKeysInDocument(logging, loggingSortedKeys),
        );
        getGuard(serviceData.get("deploy"), (deploy) =>
          sortKeysInDocument(deploy, deploySortedKeys),
        );
      });
    });

    // Sort network definitions
    getGuard(data.get("networks"), (networksData) => {
      forEachItem(networksData, (networkData) => {
        getGuard(networkData, (data) => sortKeysInDocument(data, networkDefSortedKeys));
      });
    });

    // Sort volume definitions
    getGuard(data.get("volumes"), (volumesData) => {
      forEachItem(volumesData, (volumeData) => {
        getGuard(volumeData, (data) => sortKeysInDocument(data, volumeDefSortedKeys));
      });
    });

    if (renamedFile === file) {
      await fs.promises.writeFile(filePath, data.toString(yamlOptions));
    } else {
      console.log(`Renaming to ${file} -> ${renamedFile}`);
      if (await checkFileExists(renamedPath)) {
        throw new Error(`File already exists: ${renamedFile}`);
      }
      await fs.promises.writeFile(renamedPath, data.toString(yamlOptions));
      await fs.promises.unlink(filePath);
    }
  }
};

const parsed = await parseYamlOptionsFromArgs();
await main(parsed);
