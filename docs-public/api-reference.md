# API Reference

## MCP Tools

The server provides the following MCP tools for searching and managing conversation history:

### search_conversations

Search through conversation history with natural language queries.

**Parameters:**
- `query` (string, required): Search query
- `project` (string, optional): Filter by specific project
- `limit` (number, optional): Maximum results (default: 20)
- `contextSize` (number, optional): Context messages around results (default: 2)

**Example:**
```
Tool: search_conversations
Args: {
  "query": "React component implementation", 
  "limit": 10
}
```

**Response:**
Returns search results with conversation context, timestamps, and project information.

---

### list_projects

List all indexed projects with conversation counts.

**Parameters:** None

**Example:**
```
Tool: list_projects
Args: {}
```

**Response:**
Returns list of projects with metadata and conversation statistics.

---

### get_conversation_context

Get context around a specific message.

**Parameters:**
- `messageId` (string, required): Message UUID
- `contextSize` (number, optional): Messages before/after (default: 5)

**Example:**
```
Tool: get_conversation_context
Args: {
  "messageId": "msg-uuid-123",
  "contextSize": 3
}
```

---

### get_conversation_messages

Retrieve messages from a specific conversation.

**Parameters:**
- `conversationId` (string, required): Conversation/session ID
- `limit` (number, optional): Maximum messages (default: 50)
- `startFrom` (number, optional): Start index (default: 0)

**Example:**
```
Tool: get_conversation_messages
Args: {
  "conversationId": "session-456",
  "limit": 20
}
```

---

### refresh_index

Manually refresh the conversation index.

**Parameters:** None

**Example:**
```
Tool: refresh_index
Args: {}
```

**Response:**
Returns indexing status and statistics.

---

### get_config_info

Get current server configuration.

**Parameters:** None

**Example:**
```
Tool: get_config_info
Args: {}
```

---

### get_server_info

Get server version and system information.

**Parameters:** None

**Example:**
```
Tool: get_server_info
Args: {}
```

---

### list_tools

List all available MCP tools.

**Parameters:** None

**Example:**
```
Tool: list_tools
Args: {}
```

## Programmatic Usage

### ConversationSearchServer Class

For advanced integrations, you can use the server programmatically:

```javascript
import { ConversationSearchServer } from 'claude-code-conversation-search-mcp';

const server = new ConversationSearchServer({
  projectsDir: '/path/to/projects',
  dbPath: '/path/to/database.db',
  indexInterval: 0,
  autoIndexing: false
});

// Use the server
const result = await server.callTool('search_conversations', {
  query: 'authentication implementation'
});

console.log(result.content[0].text);

// Clean up
server.close();
```

### Configuration Options

```typescript
interface ServerConfig {
  // Database configuration
  dbPath?: string;
  dbBackupEnabled?: boolean;
  dbBackupInterval?: number;
  
  // Indexing configuration
  projectsDir?: string;
  indexInterval?: number;
  autoIndexing?: boolean;
  fullTextMinLength?: number;
  indexBatchSize?: number;
  
  // Search configuration
  maxResults?: number;
  defaultContextSize?: number;
  searchTimeout?: number;
  
  // Performance configuration
  maxMemoryMB?: number;
  cacheSize?: number;
  
  // Logging and monitoring
  debug?: boolean;
  logLevel?: string;
  logToFile?: boolean;
  logFilePath?: string;
  
  // Security and validation
  allowedFileExtensions?: string[];
  maxFileSize?: number;
  indexThreads?: number;
}
```

## Search Query Syntax

### Natural Language
The server understands natural language queries:

- "How do I implement authentication?"
- "Show me React component examples"
- "Find TypeScript error solutions"

### Keywords and Phrases
- Technical terms: `authentication`, `database`, `API`
- Framework names: `React`, `TypeScript`, `Node.js`
- Error types: `compile error`, `runtime exception`

### Advanced Filters
- Project-specific: Automatically detected from conversation context
- Time-based: Recent conversations prioritized
- Content-type: Code vs discussion content

## Response Format

All tool responses follow the MCP standard format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Response content here..."
    }
  ]
}
```

### Search Result Format

Search results include:
- **Match excerpts** with highlighted terms
- **Conversation context** (surrounding messages)
- **Project information** and file paths
- **Timestamps** and session IDs
- **Relevance scores** (when available)

### Error Handling

Errors are returned as text content with descriptive messages:

```json
{
  "content": [
    {
      "type": "text", 
      "text": "Error: Invalid search query - query cannot be empty"
    }
  ]
}
```

## Performance

- **Search speed**: < 5ms for typical queries
- **Index speed**: ~10ms per 1000 messages
- **Memory usage**: ~50MB for 10K conversations
- **Database size**: ~1MB per 1000 messages

## Limitations

- **File formats**: Only `.jsonl` conversation files supported
- **File size**: Maximum 100MB per conversation file
- **Search length**: Maximum 1000 characters per query
- **Concurrent access**: Single writer, multiple readers
- **Platform support**: Node.js 18+ required