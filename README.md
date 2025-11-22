# docker-compose-formatter

A CLI tool to automatically sort services, keys, and environment variables in Docker Compose (YAML) files

## Features

- **Service & Resource Sorting**: Alphabetically sort services, volumes, and networks
- **Key Order Standardization**: Sort keys (image, ports, environment, etc.) within each service in a specified order
- **YAML Formatting**: Standardize indentation, quotes, line width, and more
- **File Renaming**: Batch rename files (e.g., compose.yml → docker-compose.yaml)

## Usage

### Run with Docker

```sh
docker run --rm -v "$PWD":/app/target ghcr.io/fa0311/docker-compose-formatter/docker-compose-formatter-docker:latest
```

### Run Locally

```sh
# Install dependencies
pnpm install

# Run
pnpm start
```

## Options

### Sorting Configuration

| Option                    | Type                              | Description                               |
| ------------------------- | --------------------------------- | ----------------------------------------- |
| `--sortedKeys`            | string[]                          | Specify key order within services         |
| `--input`                 | string[]                          | Glob patterns for target files            |
| `--baseDirs`              | string[]                          | Base directories for log output           |
| `--inputRenameExtensions` | `'yml'` \| `'yaml'`               | Standardize extensions (e.g., yml → yaml) |
| `--inputRenameName`       | `'docker-compose'` \| `'compose'` | Standardize file names                    |

> For default values, see [parser.js](src/parser.js)

### YAML Formatting Options

Key options:

| Option                     | Type    | Description                          |
| -------------------------- | ------- | ------------------------------------ |
| `--indent`                 | number  | Indentation width (number of spaces) |
| `--lineWidth`              | number  | Maximum line width (0 to disable)    |
| `--singleQuote`            | boolean | Use single quotes                    |
| `--defaultStringType`      | string  | Default string style                 |
| `--nullStr`                | string  | Representation of null values        |
| `--trueStr` / `--falseStr` | string  | Representation of boolean values     |

> For default values, see [parser.js](src/parser.js)

For more detailed options, refer to the [yaml official documentation](https://eemeli.org/yaml/#tostring-options).

### Examples

```sh
# Customize key order
pnpm start -- --sortedKeys image --sortedKeys ports --sortedKeys environment

# Change indentation to 4 spaces
pnpm start -- --indent 4

# Standardize file names to docker-compose.yaml
pnpm start -- --inputRenameName docker-compose --inputRenameExtensions yaml
```

## Development

### Setup

```sh
pnpm install
```

### Scripts

```sh
# Test
pnpm test          # Run once
pnpm test:watch    # Watch mode

# Lint & Format
pnpm lint          # Check only
pnpm lint:fix      # Auto-fix
pnpm format        # Format check
```

### Requirements

- Node.js >= 18.18.0

## License

MIT
