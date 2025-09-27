# Installation Guide

## Quick Installation

### Global Installation (Recommended)

```bash
npm install -g claude-code-conversation-search-mcp
```

### Local Installation

```bash
npm install claude-code-conversation-search-mcp
```

## Configuration

### Claude Code Integration

Add to your Claude Code MCP configuration file:

**Location**: `~/.claude/mcp.json` (or your configured MCP file)

```json
{
  "mcpServers": {
    "conversation-search": {
      "command": "claude-code-conversation-search",
      "args": []
    }
  }
}
```

### Environment Variables (Optional)

```bash
# Custom database location
export CONVERSATION_DB_PATH="~/my-conversations.db"

# Custom projects directory  
export CLAUDE_PROJECTS_DIR="~/my-projects"

# Enable debug logging
export DEBUG=true

# Custom indexing interval (milliseconds)
export INDEX_INTERVAL=300000

# Maximum search results
export MAX_RESULTS=50
```

## Verification

After installation, verify the server is working:

1. **Check installation**:
   ```bash
   claude-code-conversation-search --version
   ```

2. **Test MCP connection**:
   - Open Claude Code
   - Try running: "Search for React components"
   - You should see search results from your conversation history

## System Requirements

- **Node.js**: Version 18.0 or higher
- **Operating System**: macOS, Linux, Windows
- **Memory**: 512MB RAM minimum
- **Storage**: 100MB for database and indexes
- **Permissions**: Read access to Claude Code conversation files

## File Locations

### Default Paths

- **Database**: `~/.claude/conversation-search.db`
- **Conversation Files**: `~/.claude/projects/*/conversations/`
- **Configuration**: `~/.claude/mcp.json`

### Custom Paths

You can customize these locations using environment variables:

```bash
# Example: Custom setup
export CLAUDE_PROJECTS_DIR="/path/to/your/projects"
export CONVERSATION_DB_PATH="/path/to/your/database.db"
```

## Troubleshooting

### Common Issues

1. **"Command not found"**
   - Ensure global installation: `npm install -g claude-code-conversation-search-mcp`
   - Check PATH includes npm global bin directory

2. **"No conversations found"**
   - Verify Claude Code is creating conversation files
   - Check projects directory contains `.jsonl` files
   - Run index refresh in Claude Code

3. **"Permission denied"**
   - Ensure read permissions on `~/.claude/` directory
   - Check database file write permissions
   - Run with appropriate user permissions

4. **"Database errors"**
   - Delete database file to force recreation: `rm ~/.claude/conversation-search.db`
   - Restart Claude Code
   - Re-run search to rebuild index

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/user/claude-code-conversation-search-mcp/issues)
- **Documentation**: See `/examples` directory for usage examples
- **Debug Mode**: Set `DEBUG=true` for detailed logging

## Uninstallation

### Remove Global Installation

```bash
npm uninstall -g claude-code-conversation-search-mcp
```

### Clean Up Files

```bash
# Remove database
rm ~/.claude/conversation-search.db

# Remove from MCP configuration
# Edit ~/.claude/mcp.json and remove the conversation-search entry
```