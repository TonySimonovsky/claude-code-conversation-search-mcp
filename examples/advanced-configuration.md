# Advanced Configuration

## Custom Installation Path

If you want to install the MCP server locally for development:

```bash
# Clone the repository
git clone https://github.com/yourusername/claude-conversation-search-mcp.git
cd claude-conversation-search-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Configure Claude Desktop to use local installation
```

Add to Claude Desktop configuration:

```json
{
  "mcpServers": {
    "claude-conversation-search": {
      "command": "node",
      "args": ["/path/to/claude-conversation-search-mcp/lib/index.js"]
    }
  }
}
```

## Environment Variables

The server supports the following environment variables:

- `CLAUDE_PROJECTS_DIR`: Custom directory for Claude Code projects (defaults to `~/.claude/Projects`)
- `INDEX_REFRESH_INTERVAL`: How often to refresh the index in milliseconds (defaults to 300000 - 5 minutes)

Example configuration with environment variables:

```json
{
  "mcpServers": {
    "claude-conversation-search": {
      "command": "npx",
      "args": ["claude-conversation-search-mcp"],
      "env": {
        "CLAUDE_PROJECTS_DIR": "/custom/path/to/projects",
        "INDEX_REFRESH_INTERVAL": "600000"
      }
    }
  }
}
```

## Debugging

To enable debug logging, set the `DEBUG` environment variable:

```json
{
  "mcpServers": {
    "claude-conversation-search": {
      "command": "npx",
      "args": ["claude-conversation-search-mcp"],
      "env": {
        "DEBUG": "claude-conversation-search:*"
      }
    }
  }
}
```