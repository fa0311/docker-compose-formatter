import { parseArgs } from "node:util";
import { z } from "zod";

const NonNegIntFromString = z.coerce.number().int().min(0).or(z.undefined());

export const YamlOptionsSchema = z.object({
  blockQuote: z.union([z.boolean(), z.enum(["folded", "literal"])]).optional(),
  collectionStyle: z.enum(["any", "block", "flow"]).optional(),
  defaultKeyType: z
    .enum(["BLOCK_FOLDED", "BLOCK_LITERAL", "QUOTE_DOUBLE", "QUOTE_SINGLE", "PLAIN"])
    .optional(),
  defaultStringType: z
    .enum(["BLOCK_FOLDED", "BLOCK_LITERAL", "QUOTE_DOUBLE", "QUOTE_SINGLE", "PLAIN"])
    .optional(),
  directives: z.boolean().optional(),
  doubleQuotedAsJSON: z.boolean().optional(),
  doubleQuotedMinMultiLineLength: NonNegIntFromString.optional(),
  falseStr: z.string().optional(),
  flowCollectionPadding: z.boolean().optional(),
  indent: NonNegIntFromString.optional(),
  indentSeq: z.boolean().optional(),
  lineWidth: NonNegIntFromString.optional(),
  minContentWidth: NonNegIntFromString.optional(),
  nullStr: z.string().optional(),
  simpleKeys: z.boolean().optional(),
  singleQuote: z.boolean().optional(),
  trueStr: z.string().optional(),
  rootSortedKeys: z
    .array(z.string())
    .default(["name", "include", "services", "networks", "volumes", "configs", "secrets"]),
  serviceSortedKeys: z
    .array(z.string())
    .default([
      "extends",
      "image",
      "build",
      "container_name",
      "command",
      "entrypoint",
      "restart",
      "depends_on",
      "networks",
      "ports",
      "expose",
      "environment",
      "env_file",
      "secrets",
      "configs",
      "volumes",
      "tmpfs",
      "working_dir",
      "user",
      "group_add",
      "privileged",
      "cap_add",
      "cap_drop",
      "security_opt",
      "read_only",
      "deploy",
      "cpus",
      "mem_limit",
      "mem_reservation",
      "pids_limit",
      "ulimits",
      "extra_hosts",
      "dns",
      "dns_search",
      "hostname",
      "domainname",
      "healthcheck",
      "logging",
      "labels",
    ]),
  buildSortedKeys: z
    .array(z.string())
    .default([
      "context",
      "dockerfile",
      "args",
      "labels",
      "cache_from",
      "cache_to",
      "target",
      "network",
      "shm_size",
      "extra_hosts",
      "isolation",
      "privileged",
      "secrets",
      "ssh",
      "tags",
      "platforms",
      "pull",
    ]),
  healthcheckSortedKeys: z
    .array(z.string())
    .default([
      "test",
      "interval",
      "timeout",
      "retries",
      "start_period",
      "start_interval",
      "disable",
    ]),
  loggingSortedKeys: z.array(z.string()).default(["driver", "options"]),
  deploySortedKeys: z
    .array(z.string())
    .default([
      "mode",
      "replicas",
      "endpoint_mode",
      "labels",
      "placement",
      "resources",
      "restart_policy",
      "rollback_config",
      "update_config",
    ]),
  networkDefSortedKeys: z
    .array(z.string())
    .default([
      "driver",
      "driver_opts",
      "ipam",
      "external",
      "internal",
      "attachable",
      "enable_ipv6",
      "labels",
      "name",
    ]),
  volumeDefSortedKeys: z
    .array(z.string())
    .default(["driver", "driver_opts", "external", "labels", "name"]),
  input: z
    .array(z.string())
    .default([
      "target/**/docker-compose.yml",
      "target/**/docker-compose.yaml",
      "target/**/docker-compose.*.yml",
      "target/**/docker-compose.*.yaml",
      "target/**/compose.yml",
      "target/**/compose.yaml",
      "target/**/compose.*.yml",
      "target/**/compose.*.yaml",
    ]),
  baseDirs: z.array(z.string()).default(["target/"]),
  inputRenameExtensions: z.enum(["yml", "yaml"]).optional(),
  inputRenameName: z.enum(["docker-compose", "compose"]).optional(),
});

/**
 * Parses YAML options from command-line arguments.
 * @param {string[]} argv
 * @returns {Promise<z.infer<typeof YamlOptionsSchema>>}
 */
export const parseYamlOptionsFromArgs = async (argv = process.argv.slice(2)) => {
  const { values } = parseArgs({
    args: argv,
    options: {
      blockQuote: { type: "string" },
      collectionStyle: { type: "string" },
      commentString: { type: "string" },
      defaultKeyType: { type: "string" },
      defaultStringType: { type: "string" },
      doubleQuotedMinMultiLineLength: { type: "string" },
      falseStr: { type: "string" },
      indent: { type: "string" },
      lineWidth: { type: "string" },
      minContentWidth: { type: "string" },
      nullStr: { type: "string" },
      trueStr: { type: "string" },
      directives: { type: "boolean" },
      doubleQuotedAsJSON: { type: "boolean" },
      flowCollectionPadding: { type: "boolean" },
      indentSeq: { type: "boolean" },
      simpleKeys: { type: "boolean" },
      singleQuote: { type: "boolean" },
      rootSortedKeys: { type: "string", multiple: true },
      serviceSortedKeys: { type: "string", multiple: true },
      buildSortedKeys: { type: "string", multiple: true },
      healthcheckSortedKeys: { type: "string", multiple: true },
      loggingSortedKeys: { type: "string", multiple: true },
      deploySortedKeys: { type: "string", multiple: true },
      networkDefSortedKeys: { type: "string", multiple: true },
      volumeDefSortedKeys: { type: "string", multiple: true },
      input: { type: "string", multiple: true },
      baseDirs: { type: "string", multiple: true },
      inputRenameExtensions: { type: "string" },
      inputRenameName: { type: "string" },
    },
  });

  return await YamlOptionsSchema.parseAsync(values);
};
