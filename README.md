# Claude Conversation Search MCP

An MCP (Model Context Protocol) server that enables searching through Claude Code conversation history stored locally in `~/.claude/projects`.

## Features

- 🔍 **Full-text search** across all conversations with natural language queries
- 📝 **Smart query parsing** - Ask "Where did we create auth.js?" or "Show database optimizations"
- 🗂️ **Project filtering** to search within specific projects
- 📅 **Time-based filtering** (today, yesterday, last week, etc.)
- 🛠️ **Tool operation tracking** - Track file edits, bash commands, and more
- ⚡ **Lightning fast** - SQLite FTS5 provides instant search results
- 🔄 **Auto-indexing** - Automatically indexes new conversations
- 💾 **Incremental updates** - Only indexes new messages for efficiency

## Installation

### Via npm (recommended)

```bash
npm install -g claude-conversation-search-mcp
```

### From source

```bash
# Clone the repository
git clone https://github.com/yourusername/claude-conversation-search-mcp.git
cd claude-conversation-search-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Optional: Link globally
npm link
```

## Configuration

Add this MCP server to your Claude Code configuration:

### macOS
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "conversation-search": {
      "command": "npx",
      "args": ["claude-conversation-search-mcp"],
      "env": {
        "CONVERSATION_DB_PATH": "~/.claude/conversation-search.db",
        "INDEX_INTERVAL": "300000",
        "MAX_RESULTS": "20"
      }
    }
  }
}
```

### Windows
Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "conversation-search": {
      "command": "npx",
      "args": ["claude-conversation-search-mcp"],
      "env": {
        "CONVERSATION_DB_PATH": "%USERPROFILE%\\.claude\\conversation-search.db",
        "INDEX_INTERVAL": "300000",
        "MAX_RESULTS": "20"
      }
    }
  }
}
```

### Linux
Edit `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "conversation-search": {
      "command": "npx",
      "args": ["claude-conversation-search-mcp"]
    }
  }
}
```

### Configuration Options

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `CONVERSATION_DB_PATH` | Path to SQLite database | `~/.claude/conversation-search.db` |
| `INDEX_INTERVAL` | Auto-index interval in milliseconds | `300000` (5 minutes) |
| `MAX_RESULTS` | Maximum search results to return | `20` |
| `CLAUDE_PROJECTS_DIR` | Path to Claude projects directory | `~/.claude/projects` |
| `DEBUG` | Enable debug logging | `false` |

## Usage

Once configured, the following tools are available in Claude Code:

### Search Conversations

Search through your conversation history with natural language:

```
search_conversations("Where did we create auth.js?")
search_conversations("database optimization last week")
search_conversations("TypeError in index.ts")
```

**Query Examples:**
- **File operations**: `"created auth.js"`, `"edited config.json"`, `"modified database.ts"`
- **Topics**: `"discuss React hooks"`, `"security review"`, `"performance optimization"`
- **Errors**: `"TypeError"`, `"CORS error"`, `"undefined variable"`
- **Commands**: `"npm install lodash"`, `"git commit"`, `"database migration"`
- **Time filters**: `"today"`, `"yesterday"`, `"last week"`, `"this month"`
- **Project filters**: `"in project myapp"`, `"from backend-api"`

**Parameters:**
- `query` (required): Natural language search query
- `limit` (optional): Maximum results to return (default: 10)
- `includeContext` (optional): Include surrounding messages (default: true)

### List Projects

Get all indexed projects with statistics:

```
list_projects()
```

Returns project names, message counts, and last activity dates.

### Get Conversation Context

Retrieve full context around a specific message:

```
get_conversation_context("msg_abc123", contextSize: 5)
```

**Parameters:**
- `messageId` (required): The message ID to get context for
- `contextSize` (optional): Number of messages before/after (default: 5)

### Refresh Index

Manually trigger re-indexing:

```
refresh_index()
```

Useful after adding new projects or when auto-indexing is disabled.

## Advanced Usage

### Complex Queries

The query parser supports sophisticated natural language patterns:

```
# Find specific file operations
"Where did we create or modify authentication files?"

# Search by multiple criteria
"database migrations in project backend last week"

# Find specific error patterns
"TypeError or ReferenceError in React components"

# Search tool operations
"bash commands containing npm or yarn"

# Find code discussions
"Where did we discuss implementing caching?"
```

### Search Operators

- **AND**: Terms are ANDed by default (`"auth login"` finds messages with both)
- **OR**: Use "or" between terms (`"auth or login"`)
- **NOT**: Use "-" prefix (`"auth -test"` excludes test-related results)
- **Phrase**: Use quotes for exact phrases (`"user authentication"`)
- **Wildcard**: Use * for prefix matching (`"auth*"` matches auth, authentication, etc.)

### Time Filters

Supported time expressions:
- `today`, `yesterday`
- `last week`, `this week`
- `last month`, `this month`
- `last 7 days`, `last 30 days`
- Specific dates: `"on 2024-01-15"`, `"since January 1"`

## Development

### Setup Development Environment

```bash
# Clone and install
git clone <repository>
cd claude-conversation-search-mcp
npm install

# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Project Structure

```
src/
├── index.ts              # MCP server entry point
├── indexer/
│   ├── parser.ts        # JSONL conversation parser
│   ├── database.ts      # SQLite database operations
│   └── indexer.ts       # Indexing orchestration
├── search/
│   └── query.ts         # Natural language query parser
└── types/
    └── index.ts         # TypeScript type definitions
```

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Database Issues

If the search index becomes corrupted:

```bash
# Remove the database file
rm ~/.claude/conversation-search.db

# Restart Claude Code to trigger re-indexing
```

### Performance Optimization

For large conversation histories:

1. Increase `INDEX_INTERVAL` to reduce indexing frequency
2. Set `MAX_RESULTS` to limit result size
3. Use specific project filters in queries

### Debug Mode

Enable debug logging to troubleshoot issues:

```json
{
  "mcpServers": {
    "conversation-search": {
      "command": "npx",
      "args": ["claude-conversation-search-mcp"],
      "env": {
        "DEBUG": "true"
      }
    }
  }
}
```

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

Built using the [Model Context Protocol SDK](https://github.com/anthropics/model-context-protocol) by Anthropic.

## Support

For issues, feature requests, or questions:
- Open an issue on [GitHub](https://github.com/yourusername/claude-conversation-search-mcp/issues)
- Check existing issues for solutions
- Include debug logs when reporting bugs