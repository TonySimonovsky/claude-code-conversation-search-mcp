# Basic Usage Example

This example demonstrates how to use the Claude Conversation Search MCP server.

## Configuration

Add the following to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "claude-conversation-search": {
      "command": "npx",
      "args": ["claude-conversation-search-mcp"]
    }
  }
}
```

## Available Tools

Once configured, the following tools will be available in Claude:

### 1. Search Conversations
Search through your conversation history with natural language queries.

Example usage:
- "Search for conversations about React hooks"
- "Find where we discussed authentication"
- "Show me conversations about debugging"

### 2. List Projects
List all indexed Claude Code projects.

### 3. Get Conversation Context
Get the full context around a specific message by providing its ID.

### 4. Refresh Index
Manually refresh the conversation index to include the latest conversations.

## Example Workflow

1. Start by searching for a topic:
   ```
   search_conversations("React component optimization")
   ```

2. Review the results to find relevant conversations

3. Get more context if needed:
   ```
   get_conversation_context(messageId: "msg_123", contextSize: 5)
   ```

4. Use the information to continue your work or reference past solutions