# Basic Usage Examples

## Installation

```bash
npm install -g claude-code-conversation-search-mcp
```

## Configuration

Add to your Claude Code MCP configuration:

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

## Common Search Queries

### 1. Finding Implementation Discussions
```
Where did we implement authentication?
```

### 2. Searching for Error Solutions
```
Show me TypeScript error solutions
```

### 3. Finding React Components
```
Find all React component discussions
```

### 4. Database-Related Conversations
```
Show database query optimizations
```

### 5. Project-Specific Searches
```
Search for "API endpoints" in the backend project
```

## Advanced Usage

### Search with Filters
- **Project filtering**: Automatically detects project context
- **Time-based filtering**: Recent conversations prioritized
- **Content type filtering**: Code discussions vs general chat

### Tool Operations
- `search_conversations` - Main search functionality
- `list_projects` - See all indexed projects
- `get_conversation_context` - Get surrounding messages
- `refresh_index` - Re-index conversation history

## Tips for Better Results

1. **Use specific terms**: Instead of "bug", try "authentication bug" or "database connection error"
2. **Include context**: "React component for user profiles" vs just "component"
3. **Search by concepts**: "error handling patterns", "database optimization", "testing strategies"
4. **Use natural language**: The search understands context and intent

## Environment Variables

```bash
# Custom database location
export CONVERSATION_DB_PATH="~/my-conversations.db"

# Custom projects directory
export CLAUDE_PROJECTS_DIR="~/my-projects"

# Enable debug logging
export DEBUG=true
```

## Troubleshooting

### No Results Found
- Run `refresh_index` tool to re-index conversations
- Check if Claude Code conversations are in `~/.claude/projects/`
- Verify file permissions on conversation files

### Slow Search
- Database rebuilds automatically if corrupted
- Large conversation histories may take time to index initially
- Subsequent searches are very fast (< 5ms)

### Permission Issues
- Ensure read access to `~/.claude/` directory
- Check database file permissions
- Run with appropriate user permissions