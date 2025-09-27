# Claude Code Conversation Search MCP

**Stop losing your Claude Code conversations.** Never again ask "where did we discuss that bug fix?" or lose hours of context when your terminal closes.

```bash
npm install -g claude-code-conversation-search-mcp
```

Find any conversation across all projects:
```bash
"where did we discuss the database issue?"
"find that authentication conversation"
"docker configuration we talked about yesterday"
```

Get the exact project, date, and command to resume instantly.

## Why You Need This

**The Problem:** Claude Code has no conversation search. When you close a terminal or switch projects, finding that important discussion becomes impossible. You're left scrolling through cryptic conversation titles hoping to recognize the right one.

**The Solution:** Search all your Claude Code conversations from any project session. Ask "where did we discuss authentication?" and instantly get the exact conversation with a resume command.

## Features

- **Find lost conversations**: Never lose track of important discussions again
- **Search across all projects**: Working in Project A but need info from Project B? Just search
- **Resume instantly**: Get exact `claude --resume` commands to continue where you left off  
- **Natural language**: Ask questions like you would a human - "find that Docker conversation"
- **Lightning fast**: Search thousands of conversations in milliseconds
- **Zero setup**: Install and it works immediately with your existing Claude Code

## Quick Start

Install and it auto-configures with Claude Code:

```bash
npm install -g claude-code-conversation-search-mcp
```

Search across all projects while working in any project.

## Usage

```bash
# Find lost conversations
"where did we discuss the login bug?"
"find that Docker conversation"
"database setup we talked about"

# Search by what you remember
"authentication error we fixed"
"API endpoint discussion yesterday"
"performance issue last week"

# Find solutions from other projects  
"how did we solve CORS issues?"
"Redis configuration that worked"
"deployment script we wrote"
```

Every search gives you:
- **Which project** the conversation was in
- **When it happened** (date and time)
- **What you discussed** (conversation summary)
- **Exact command** to resume: `cd '/path/to/project' && claude --resume abc123`

## Technical

Built with TypeScript, uses SQLite FTS5 for search, integrates via Model Context Protocol.

**System requirements:**
- Node.js 18+
- Claude Code with MCP support
- macOS, Linux, or Windows

**Performance:**
- Sub-second search across 10k+ conversations
- Real-time indexing with file watching
- Minimal memory footprint (~50MB)

**Storage:**
- SQLite database in `~/.claude/conversation-search/`
- Indexes conversation content, not file contents
- Automatic cleanup of deleted conversations

## Installation

### From source

```bash
# Clone the repository
git clone https://github.com/TonySimonovsky/claude-code-conversation-search-mcp.git
cd claude-code-conversation-search-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Optional: Link globally
npm link
```

## Configuration

### Automatic Setup (Recommended)

After installation, the MCP server auto-configures with Claude Code. No manual configuration needed!

### Manual Configuration (Optional)

If you need custom configuration, choose one of these approaches:

**Option 1: Command Line (Recommended)**
```bash
# Add globally for all projects
claude mcp add conversation-search claude-code-conversation-search-mcp

# Add for current project only (creates .mcp.json)
claude mcp add --scope project conversation-search claude-code-conversation-search-mcp
```

**Option 2: Edit Configuration Files Directly**

**Global configuration** (all projects):
```bash
# Edit the global Claude Code config (run from anywhere)
nano ~/.claude.json
# Or use your preferred editor: code ~/.claude.json
```

```json
{
  "mcpServers": {
    "conversation-search": {
      "command": "claude-code-conversation-search-mcp",
      "args": []
    }
  }
}
```

**Project-specific configuration** (team-shared):
```bash
# Create project config file (run from project root)
nano .mcp.json
# Or: code .mcp.json
```

```json
{
  "mcpServers": {
    "conversation-search": {
      "command": "claude-code-conversation-search-mcp",
      "args": []
    }
  }
}
```

### Configuration Options

The MCP server supports extensive configuration through environment variables. Here are the most commonly used options:

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `CONVERSATION_DB_PATH` | Path to SQLite database | `~/.claude/conversation-search.db` |
| `CLAUDE_PROJECTS_DIR` | Path to Claude projects directory | `~/.claude/projects` |
| `INDEX_INTERVAL` | Auto-index interval in milliseconds | `300000` (5 minutes) |
| `MAX_RESULTS` | Maximum search results to return | `20` |
| `DEFAULT_CONTEXT_SIZE` | Default context messages before/after | `2` |
| `AUTO_INDEXING` | Enable automatic indexing | `true` |
| `DEBUG` | Enable debug logging | `false` |

**📖 For complete configuration options and performance tuning, see [Configuration Guide](docs/configuration.md)**

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

### Get Message Context

Retrieve full context around a specific message:

```
get_message_context("msg_abc123", contextSize: 5)
```

**Parameters:**
- `messageId` (required): The message ID to get context for
- `contextSize` (optional): Number of messages before/after (default: 5)

### Get Conversation Messages

Retrieve messages from a specific conversation:

```
get_conversation_messages("conv_456", limit: 50, startFrom: 0)
get_conversation_messages("conv_456", limit: 10, startFrom: -1)  # Last 10 messages
get_conversation_messages("conv_456", limit: 20, startFrom: -10) # 20 messages starting from 10th from end
```

**Parameters:**
- `conversationId` (required): The conversation ID to get messages from
- `limit` (optional): Number of messages to return (default: 50)
- `startFrom` (optional): Starting position - `0`=first, `-1`=last, `-10`=10th from end (default: 0)

### List Tools

Show all available tools with their signatures:

```
list_tools()
```

Returns automatically generated tool signatures and descriptions. Updates automatically when new tools are added.

### Refresh Index

Manually trigger re-indexing:

```
refresh_index()
```

Useful after adding new projects or when auto-indexing is disabled.

### Get Server Information

Show server version, changelog, and system information:

```
get_server_info()
```

Displays current version, recent changes, system status, and available tools.

## Advanced Usage

### Complex Queries

Our built-in query parser supports sophisticated natural language patterns:

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
cd claude-code-conversation-search-mcp
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
      "args": ["claude-code-conversation-search-mcp"],
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

## Credits

Developed by Tony AI Champ & Claude Code, 09-2025

## Support

For issues, feature requests, or questions:
- Open an issue on [GitHub](https://github.com/TonySimonovsky/claude-code-conversation-search-mcp/issues)
- Check existing issues for solutions
- Include debug logs when reporting bugs