# docker-compose-formatter

A CLI tool to automatically sort services, keys, and environment variables in Docker Compose (YAML) files

## Features

- **Service & Resource Sorting**: Alphabetically sort services, volumes, and networks
- **Key Order Standardization**: Sort keys (image, ports, environment, etc.) within each service in a specified order
- **YAML Formatting**: Standardize indentation, quotes, line width, and more
- **File Renaming**: Batch rename files (e.g., compose.yml → docker-compose.yaml)

## Format Example

`docker-compose-formatter` turns valid-but-noisy Compose YAML into a stable,
review-friendly layout in one pass: root sections are ordered, service keys move
into a predictable Compose-first order, and nested blocks such as `build` are
normalized too.

Before:

```yaml
volumes:
  cache_data:
    name: cache-volume
    driver: local

networks:
  frontend:
    name: frontend-network
    driver: bridge

services:
  app:
    volumes:
      - ./app:/app
    environment:
      DB_HOST: database
    ports:
      - "8080:8080"
    build:
      target: production
      dockerfile: Dockerfile
      context: .
    image: myapp:latest
```

After:

```yaml
services:
  app:
    image: myapp:latest
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "8080:8080"
    environment:
      DB_HOST: database
    volumes:
      - ./app:/app

networks:
  frontend:
    driver: bridge
    name: frontend-network

volumes:
  cache_data:
    driver: local
    name: cache-volume
```

## Name Grouping

Service, volume, and network names are not sorted alphabetically. Names sharing
a prefix split by `_` or `-` (e.g. `app` / `app-worker`) form a group, with the
shorter name first. Unrelated names keep their original position.

Before:

```yaml
services:
  redis:
  app-worker:
  app:
  database:
```

After:

```yaml
services:
  redis:
  app:
  app-worker:
  database:
```

`app` and `app-worker` were pulled together because of the shared `app` prefix;
`redis` and `database` kept their original positions because nothing else in
the list is related to them.

## Usage

### Run with Docker

```sh
docker run --rm -v "$PWD":/app/target ghcr.io/fa0311/docker-compose-formatter:latest
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

| Option                    | Type                              | Description                                                |
| ------------------------- | --------------------------------- | ---------------------------------------------------------- |
| `--rootSortedKeys`        | string[]                          | Specify key order at root level (e.g., services, networks) |
| `--serviceSortedKeys`     | string[]                          | Specify key order within services                          |
| `--buildSortedKeys`       | string[]                          | Specify key order within service build sections            |
| `--healthcheckSortedKeys` | string[]                          | Specify key order within service healthcheck sections      |
| `--loggingSortedKeys`     | string[]                          | Specify key order within service logging sections          |
| `--deploySortedKeys`      | string[]                          | Specify key order within service deploy sections           |
| `--networkDefSortedKeys`  | string[]                          | Specify key order within network definitions               |
| `--volumeDefSortedKeys`   | string[]                          | Specify key order within volume definitions                |
| `--input`                 | string[]                          | Glob patterns for target files                             |
| `--cwd`                   | string                            | Base directory for glob resolution and file I/O            |
| `--noIgnoreGitignored`    | boolean                           | Include files ignored by `.gitignore`                      |
| `--inputRenameExtensions` | `'yml'` \| `'yaml'`               | Standardize extensions (e.g., yml → yaml)                  |
| `--inputRenameName`       | `'docker-compose'` \| `'compose'` | Standardize file names                                     |

> For default values, see [parser.js](src/parser.js)

### YAML Formatting Options

Supported options:

| Option                             | Type                             | Description                          |
| ---------------------------------- | -------------------------------- | ------------------------------------ |
| `--blockQuote`                     | `'folded'` \| `'literal'`        | Block scalar style                   |
| `--collectionStyle`                | `'any'` \| `'block'` \| `'flow'` | Collection output style              |
| `--defaultKeyType`                 | string enum                      | Default key style                    |
| `--defaultStringType`              | string enum                      | Default string style                 |
| `--directives`                     | boolean                          | Include YAML directives              |
| `--doubleQuotedAsJSON`             | boolean                          | Use JSON-compatible double quotes    |
| `--doubleQuotedMinMultiLineLength` | number                           | Minimum length for multiline quotes  |
| `--falseStr`                       | string                           | Representation of false values       |
| `--flowCollectionPadding`          | boolean                          | Add spaces inside flow collections   |
| `--indent`                         | number                           | Indentation width (number of spaces) |
| `--indentSeq`                      | boolean                          | Indent sequence values               |
| `--lineWidth`                      | number                           | Maximum line width (0 to disable)    |
| `--minContentWidth`                | number                           | Minimum content width                |
| `--nullStr`                        | string                           | Representation of null values        |
| `--simpleKeys`                     | boolean                          | Require simple keys                  |
| `--singleQuote`                    | boolean                          | Use single quotes                    |
| `--trueStr`                        | string                           | Representation of true values        |

> For default values, see [parser.js](src/parser.js)

For more detailed options, refer to the [yaml official documentation](https://eemeli.org/yaml/#tostring-options).

### Examples

```sh
# Customize service key order
pnpm start -- --serviceSortedKeys image --serviceSortedKeys ports --serviceSortedKeys environment

# Customize root key order
pnpm start -- --rootSortedKeys services --rootSortedKeys networks --rootSortedKeys volumes

# Change indentation to 4 spaces
pnpm start -- --indent 4

# Standardize file names to docker-compose.yaml
pnpm start -- --inputRenameName docker-compose --inputRenameExtensions yaml

# Scan a specific directory for Docker Compose YAML variants
pnpm start -- --cwd ./my-project
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
