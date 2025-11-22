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
 * Sorts the services in the Docker Compose file.
 * @param {YAML.Document | undefined} data
 */
const sortKeyName = (data) => {
  sortByKey(
    data,
    data.items
      .map((item) => item.key.value)
      .sort((a, b) => {
        const splitA = a.split(/[_-]/);
        const splitB = b.split(/[_-]/);
        if (splitA.every((part, index) => part === splitB[index])) {
          return -1;
        }
        if (splitB.every((part, index) => part === splitA[index])) {
          return 1;
        }
        return 0;
      }),
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

const parsed = await parseYamlOptionsFromArgs();

const { sortedKeys, input, baseDirs, inputRenameExtensions, inputRenameName, ...yamlOptions } =
  parsed;

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
