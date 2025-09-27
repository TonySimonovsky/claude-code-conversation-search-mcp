# Configuration Guide

This document describes all available configuration options for the Claude Conversation Search MCP server.

## Configuration Overview

The server is configured via environment variables that can be set in your Claude Code MCP configuration files or through your shell environment.

## Configuration File Locations

Claude Code supports MCP configuration in these locations:

**Global Configuration (All Projects):**
```bash
~/.claude.json    # Global config file
```

**Project-Specific Configuration (Team Shared):**
```bash
.mcp.json         # In your project root directory
```

**Editing Configuration Files:**

```bash
# Edit global configuration
nano ~/.claude.json
# Or: code ~/.claude.json
# Or: vi ~/.claude.json

# Edit project configuration (creates if not exists)
nano .mcp.json
# Or: code .mcp.json
```

## Database Configuration

### `CONVERSATION_DB_PATH`
- **Type**: String (file path)
- **Default**: `~/.claude/conversation-search.db`
- **Description**: Path to the SQLite database file where conversation data is stored
- **Example**: `/path/to/custom/database.db`

### `DB_BACKUP_ENABLED`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Whether to enable automatic database backups
- **Example**: `true`

### `DB_BACKUP_INTERVAL`
- **Type**: Number (milliseconds)
- **Default**: `86400000` (24 hours)
- **Minimum**: `3600000` (1 hour)
- **Description**: Interval between automatic database backups
- **Example**: `43200000` (12 hours)

## Indexing Configuration

### `CLAUDE_PROJECTS_DIR`
- **Type**: String (directory path)
- **Default**: `~/.claude/projects`
- **Description**: Path to the Claude Code projects directory containing conversation files
- **Example**: `/custom/path/to/claude/projects`

### `INDEX_INTERVAL`
- **Type**: Number (milliseconds)
- **Default**: `300000` (5 minutes)
- **Description**: Interval for automatic re-indexing of new conversations
- **Example**: `600000` (10 minutes)

### `AUTO_INDEXING`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Whether to automatically index new conversation files
- **Example**: `false` (disable auto-indexing)

### `FULL_TEXT_MIN_LENGTH`
- **Type**: Number
- **Default**: `3`
- **Range**: 1-50
- **Description**: Minimum length for terms to be included in full-text search index
- **Example**: `2`

### `INDEX_BATCH_SIZE`
- **Type**: Number
- **Default**: `100`
- **Range**: 1-10000
- **Description**: Number of messages to process in each indexing batch
- **Example**: `500`

### `INDEX_THREADS`
- **Type**: Number
- **Default**: `1`
- **Range**: 1-16
- **Description**: Number of threads to use for parallel indexing (experimental)
- **Example**: `2`

## Search Configuration

### `MAX_RESULTS`
- **Type**: Number
- **Default**: `20`
- **Range**: 1-1000
- **Description**: Maximum number of search results to return
- **Example**: `50`

### `DEFAULT_CONTEXT_SIZE`
- **Type**: Number
- **Default**: `2`
- **Range**: 0-50
- **Description**: Default number of context messages to include before/after each result
- **Example**: `5`

### `SEARCH_TIMEOUT`
- **Type**: Number (milliseconds)
- **Default**: `30000` (30 seconds)
- **Range**: 1000-300000 (1 second - 5 minutes)
- **Description**: Maximum time to wait for search operations
- **Example**: `60000` (60 seconds)

## Performance Configuration

### `MAX_MEMORY_MB`
- **Type**: Number (megabytes)
- **Default**: `512`
- **Range**: 64-8192 (64MB - 8GB)
- **Description**: Maximum memory usage for the server process
- **Example**: `1024`

### `CACHE_SIZE`
- **Type**: Number
- **Default**: `1000`
- **Description**: Number of search results to cache in memory
- **Example**: `2000`

## Logging and Monitoring

### `DEBUG`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Enable debug logging for troubleshooting
- **Example**: `true`

### `LOG_LEVEL`
- **Type**: String
- **Default**: `info`
- **Options**: `error`, `warn`, `info`, `debug`
- **Description**: Minimum level of log messages to output
- **Example**: `debug`

### `LOG_TO_FILE`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Whether to write logs to a file in addition to console
- **Example**: `true`

### `LOG_FILE_PATH`
- **Type**: String (file path)
- **Default**: None (uses default log directory)
- **Description**: Custom path for log files when `LOG_TO_FILE` is enabled
- **Example**: `/var/log/claude-search.log`

## Security and Validation

### `ALLOWED_FILE_EXTENSIONS`
- **Type**: String (comma-separated)
- **Default**: `.jsonl`
- **Description**: File extensions allowed for indexing
- **Example**: `.jsonl,.json,.txt`

### `MAX_FILE_SIZE`
- **Type**: Number (bytes)
- **Default**: `104857600` (100MB)
- **Range**: 1024-1073741824 (1KB - 1GB)
- **Description**: Maximum size for individual conversation files
- **Example**: `52428800` (50MB)

## Complete Configuration Example

Here's a complete example of how to configure the MCP server in your Claude Code configuration:

**Option 1: Global configuration** (all projects) - Edit `~/.claude.json`:

```json
{
  "mcpServers": {
    "conversation-search": {
      "command": "claude-code-conversation-search-mcp",
      "args": [],
      "env": {
        "CONVERSATION_DB_PATH": "~/.claude/conversation-search.db",
        "CLAUDE_PROJECTS_DIR": "~/.claude/projects",
        "INDEX_INTERVAL": "300000",
        "AUTO_INDEXING": "true",
        "MAX_RESULTS": "50",
        "DEFAULT_CONTEXT_SIZE": "3",
        "SEARCH_TIMEOUT": "30000",
        "MAX_MEMORY_MB": "1024",
        "CACHE_SIZE": "2000",
        "DEBUG": "false",
        "LOG_LEVEL": "info",
        "LOG_TO_FILE": "false",
        "FULL_TEXT_MIN_LENGTH": "3",
        "INDEX_BATCH_SIZE": "100",
        "ALLOWED_FILE_EXTENSIONS": ".jsonl",
        "MAX_FILE_SIZE": "104857600",
        "DB_BACKUP_ENABLED": "false",
        "INDEX_THREADS": "1"
      }
    }
  }
}
```

**Option 2: Project-specific configuration** (team-shared) - Create `.mcp.json` in project root:

```json
{
  "mcpServers": {
    "conversation-search": {
      "command": "claude-code-conversation-search-mcp",
      "args": [],
      "env": {
        "MAX_RESULTS": "30",
        "DEBUG": "true"
      }
    }
  }
}
```

## Performance Tuning

### For Large Conversation Histories
- Increase `INDEX_BATCH_SIZE` to 500-1000
- Set `MAX_MEMORY_MB` to 1024 or higher
- Increase `CACHE_SIZE` to 5000+
- Consider setting `INDEX_THREADS` to 2-4 (experimental)

### For Low-Resource Systems
- Decrease `INDEX_BATCH_SIZE` to 50
- Set `MAX_MEMORY_MB` to 256 or lower
- Reduce `CACHE_SIZE` to 500
- Increase `INDEX_INTERVAL` to reduce CPU usage

### For Real-Time Updates
- Set `INDEX_INTERVAL` to 60000 (1 minute) or lower
- Enable `AUTO_INDEXING`
- Set `LOG_LEVEL` to `warn` to reduce logging overhead

## Troubleshooting

### High Memory Usage
- Reduce `CACHE_SIZE`
- Lower `MAX_MEMORY_MB`
- Decrease `INDEX_BATCH_SIZE`

### Slow Search Performance
- Increase `CACHE_SIZE`
- Set `SEARCH_TIMEOUT` to a higher value
- Consider rebuilding the index with `refresh_index()`

### Indexing Issues
- Enable `DEBUG` mode
- Check `CLAUDE_PROJECTS_DIR` path
- Verify file permissions
- Review `ALLOWED_FILE_EXTENSIONS` setting

### Configuration Validation Errors
All configuration values are validated on startup. If you see configuration errors:
1. Check the error message for specific validation requirements
2. Ensure numeric values are within allowed ranges
3. Verify file paths are accessible
4. Use the examples in this guide as reference