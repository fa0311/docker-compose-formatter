import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { main } from "../src/index.js";
import { YamlOptionsSchema } from "../src/parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempDir = path.join(__dirname, "temp");

describe("main integration", () => {
  beforeEach(async () => {
    await fs.promises.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  it("basic sort", async () => {
    const input = path.join(
      __dirname,
      "fixtures/basic-sort/input/docker-compose.yaml",
    );
    const expected = path.join(
      __dirname,
      "fixtures/basic-sort/expected/docker-compose.yaml",
    );
    const work = path.join(tempDir, "docker-compose.yaml");

    await fs.promises.copyFile(input, work);

    const options = await YamlOptionsSchema.parseAsync({
      serviceSortedKeys: [
        "image",
        "build",
        "container_name",
        "restart",
        "ports",
        "environment",
        "volumes",
        "depends_on",
      ],
      input: [work],
      baseDirs: [tempDir],
    });
    await main(options);

    const actual = await fs.promises.readFile(work, "utf8");
    const exp = await fs.promises.readFile(expected, "utf8");
    expect(actual).toBe(exp);
  });

  it("rename", async () => {
    const input = path.join(
      __dirname,
      "fixtures/rename-test/input/compose.yml",
    );
    const expected = path.join(
      __dirname,
      "fixtures/rename-test/expected/docker-compose.yaml",
    );
    const work = path.join(tempDir, "compose.yml");

    await fs.promises.copyFile(input, work);

    const options = await YamlOptionsSchema.parseAsync({
      input: [work],
      baseDirs: [tempDir],
      inputRenameExtensions: "yaml",
      inputRenameName: "docker-compose",
    });
    await main(options);

    expect(fs.existsSync(work)).toBe(false);

    const renamed = path.join(tempDir, "docker-compose.yaml");
    const actual = await fs.promises.readFile(renamed, "utf8");
    const exp = await fs.promises.readFile(expected, "utf8");
    expect(actual).toBe(exp);
  });

  it("rename with suffix preserves suffix", async () => {
    const input = path.join(
      __dirname,
      "fixtures/rename-with-suffix/input/docker-compose.dev.yaml",
    );
    const expected = path.join(
      __dirname,
      "fixtures/rename-with-suffix/expected/docker-compose.dev.yaml",
    );
    const work = path.join(tempDir, "docker-compose.dev.yaml");

    await fs.promises.copyFile(input, work);

    const options = await YamlOptionsSchema.parseAsync({
      input: [work],
      baseDirs: [tempDir],
    });
    await main(options);

    const actual = await fs.promises.readFile(work, "utf8");
    const exp = await fs.promises.readFile(expected, "utf8");
    expect(actual).toBe(exp);
  });

  it("error when rename target exists", async () => {
    const work1 = path.join(tempDir, "compose.yml");
    const work2 = path.join(tempDir, "docker-compose.yaml");

    await fs.promises.writeFile(
      work1,
      "services:\n  app:\n    image: app:latest",
    );
    await fs.promises.writeFile(
      work2,
      "services:\n  db:\n    image: db:latest",
    );

    const options = await YamlOptionsSchema.parseAsync({
      input: [work1],
      baseDirs: [tempDir],
      inputRenameExtensions: "yaml",
      inputRenameName: "docker-compose",
    });

    await expect(main(options)).rejects.toThrow("File already exists");
  });

  it("advanced sort with hyphens", async () => {
    const input = path.join(
      __dirname,
      "fixtures/advanced-sort/input/docker-compose.yaml",
    );
    const expected = path.join(
      __dirname,
      "fixtures/advanced-sort/expected/docker-compose.yaml",
    );
    const work = path.join(tempDir, "docker-compose.yaml");

    await fs.promises.copyFile(input, work);

    const options = await YamlOptionsSchema.parseAsync({
      input: [work],
      baseDirs: [tempDir],
    });
    await main(options);

    const actual = await fs.promises.readFile(work, "utf8");
    const exp = await fs.promises.readFile(expected, "utf8");
    expect(actual).toBe(exp);
  });

  it("removes version key", async () => {
    const input = path.join(
      __dirname,
      "fixtures/version/input/docker-compose.yaml",
    );
    const expected = path.join(
      __dirname,
      "fixtures/version/expected/docker-compose.yaml",
    );
    const work = path.join(tempDir, "docker-compose.yaml");

    await fs.promises.copyFile(input, work);

    const options = await YamlOptionsSchema.parseAsync({
      input: [work],
      baseDirs: [tempDir],
    });
    await main(options);

    const actual = await fs.promises.readFile(work, "utf8");
    const exp = await fs.promises.readFile(expected, "utf8");
    expect(actual).toBe(exp);
  });

  it("nested sort with all features", async () => {
    const input = path.join(
      __dirname,
      "fixtures/nested-sort/input/docker-compose.yaml",
    );
    const expected = path.join(
      __dirname,
      "fixtures/nested-sort/expected/docker-compose.yaml",
    );
    const work = path.join(tempDir, "docker-compose.yaml");

    await fs.promises.copyFile(input, work);

    const options = await YamlOptionsSchema.parseAsync({
      input: [work],
      baseDirs: [tempDir],
    });
    await main(options);

    const actual = await fs.promises.readFile(work, "utf8");
    const exp = await fs.promises.readFile(expected, "utf8");
    expect(actual).toBe(exp);
  });
});
