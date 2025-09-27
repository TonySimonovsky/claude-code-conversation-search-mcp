# Product Requirements Document (PRD)
## Claude Conversation Search MCP Server

### Executive Summary

**Project:** claude-conversation-search-mcp  
**Date:** September 2025  
**Project Path:** /Users/tonysimonovskiy/claude-mcp-servers/conversation-search  
**Resume Command:** `cd '/Users/tonysimonovskiy/claude-mcp-servers/conversation-search' && claude --resume [conversation-id]`

This project is an MCP (Model Context Protocol) server that enables powerful full-text search capabilities across Claude Code conversation history stored locally in `~/.claude/projects`. The server integrates seamlessly with Claude Code to provide Google-like search functionality for past conversations, code discussions, and development work.

### Problem Statement

Claude Code users accumulate extensive conversation history containing valuable discussions, code solutions, debugging sessions, and development decisions. However, finding specific information from past conversations is challenging without proper search functionality. Users need to:
- Quickly locate specific discussions about files, errors, or topics
- Find where particular code changes were made
- Reference past solutions and debugging approaches
- Track project evolution and decision history

### Solution Overview

The Claude Conversation Search MCP provides a local-first search solution that:
- **Indexes conversation history** using SQLite with FTS5 for lightning-fast full-text search
- **Parses natural language queries** to understand user intent and context
- **Integrates with Claude Code** via MCP protocol for seamless user experience
- **Maintains privacy** by operating entirely locally on user's machine
- **Provides intelligent filtering** by project, time, and content type

### Core Features

#### 1. Full-Text Search Engine
- **SQLite FTS5 Implementation**: High-performance full-text search with ranking
- **Natural Language Processing**: Parse queries like "Where did we create auth.js?" or "database optimization last week"
- **Smart Query Understanding**: Recognize file operations, topics, errors, commands, and time filters
- **Search Operators**: Support for AND/OR logic, phrase matching, wildcards, and exclusions

#### 2. MCP Tools Integration
**Four primary tools available to Claude Code:**

1. **`search_conversations`**: Main search functionality with natural language queries
   - Parameters: query (required), limit (optional), includeContext (optional)
   - Returns: Ranked search results with message highlights and context

2. **`list_projects`**: Display all indexed Claude Code projects
   - Returns: Project names, message counts, last activity dates

3. **`get_conversation_context`**: Retrieve full context around specific messages
   - Parameters: messageId (required), contextSize (optional)
   - Returns: Surrounding messages for complete context

4. **`refresh_index`**: Manual re-indexing trigger
   - Returns: Indexing status and statistics

#### 3. Intelligent Content Parsing
- **JSONL Format Support**: Parse Claude Code's native conversation format
- **Message Type Recognition**: Distinguish between user, assistant, tool_use, and tool_result messages
- **Tool Operation Tracking**: Index file edits, bash commands, and other tool operations
- **Context Preservation**: Maintain conversation flow and message relationships

#### 4. Auto-Indexing System
- **File System Watching**: Monitor `~/.claude/projects` for new conversations using Chokidar
- **Incremental Updates**: Only index new messages to optimize performance
- **Background Processing**: Non-blocking indexing that doesn't interfere with Claude Code
- **Configurable Intervals**: Adjustable auto-indexing frequency (default: 5 minutes)

### Technical Architecture

#### Technology Stack
- **Runtime**: Node.js 18+ with TypeScript
- **Database**: SQLite with FTS5 extension for full-text search
- **File Watching**: Chokidar for real-time file system monitoring
- **MCP Integration**: @modelcontextprotocol/sdk for Claude Code integration
- **Build System**: TypeScript compiler with npm scripts

#### Project Structure
```
src/
├── index.ts              # MCP server entry point and tool definitions
├── indexer/
│   ├── parser.ts        # JSONL conversation parser
│   ├── database.ts      # SQLite database operations and schema
│   └── indexer.ts       # Indexing orchestration and file watching
├── search/
│   ├── query.ts         # Natural language query parser
│   └── result-formatter.ts  # Search result formatting and highlighting
└── types/
    └── index.ts         # TypeScript type definitions
```

#### Database Schema
- **conversations**: Project metadata and conversation tracking
- **messages**: Individual message storage with full content
- **messages_fts**: FTS5 virtual table for full-text search
- **projects**: Project-level statistics and indexing status

### User Experience

#### Query Examples
- **File Operations**: "created auth.js", "edited config.json", "modified database.ts"
- **Topic Discussions**: "discuss React hooks", "security review", "performance optimization"  
- **Error Resolution**: "TypeError", "CORS error", "undefined variable"
- **Command History**: "npm install lodash", "git commit", "database migration"
- **Time-Based**: "today", "yesterday", "last week", "this month"
- **Project-Specific**: "in project myapp", "from backend-api"

#### Search Operators
- **Default AND**: Terms are ANDed by default ("auth login" finds both terms)
- **Explicit OR**: Use "or" between terms ("auth or login")
- **Exclusion**: Use "-" prefix ("auth -test" excludes test-related results)
- **Exact Phrases**: Use quotes ("user authentication")
- **Wildcards**: Use "*" for prefix matching ("auth*" matches authentication)

### Configuration & Deployment

#### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `CONVERSATION_DB_PATH` | SQLite database location | `~/.claude/conversation-search.db` |
| `INDEX_INTERVAL` | Auto-indexing frequency (ms) | `300000` (5 minutes) |
| `MAX_RESULTS` | Maximum search results | `20` |
| `CLAUDE_PROJECTS_DIR` | Claude projects directory | `~/.claude/projects` |
| `DEBUG` | Enable debug logging | `false` |

#### Installation Methods
1. **NPM Global**: `npm install -g claude-conversation-search-mcp`
2. **From Source**: Git clone, npm install, npm run build
3. **Development**: npm run dev for hot reload during development

### Performance & Scalability

#### Optimization Features
- **Incremental Indexing**: Only process new/modified conversations
- **Configurable Limits**: Adjustable result limits and indexing intervals
- **Efficient Storage**: SQLite with FTS5 provides optimal storage and query performance
- **Memory Management**: Streaming file processing for large conversation histories

#### Performance Targets
- **Search Response Time**: < 100ms for typical queries
- **Indexing Speed**: ~1000 messages/second on standard hardware
- **Memory Usage**: < 50MB baseline, scales with conversation history size
- **Storage Overhead**: ~30% of original conversation file sizes

### Success Metrics

#### User Adoption
- Integration rate with Claude Code installations
- Query frequency per active user
- Search success rate (clicks on results)

#### Technical Performance
- Average search response time
- Indexing completion rate
- Database size growth rate
- Error rates and reliability metrics

#### User Satisfaction
- Query result relevance scores
- Feature usage distribution (which tools are used most)
- User feedback on search quality

### Development Phases

#### Phase 1: Core Implementation ✅ (Completed)
- Basic MCP server setup with TypeScript
- SQLite database with FTS5 search
- JSONL conversation parsing
- Four primary MCP tools implementation

#### Phase 2: Advanced Features ✅ (Completed)
- Natural language query parsing
- Auto-indexing with file watching
- Search result highlighting and formatting
- Context retrieval functionality

#### Phase 3: Production Ready ✅ (Completed)
- Comprehensive documentation and README
- Error handling and logging
- Configuration options and environment variables
- npm package preparation

#### Phase 4: Enhancement (Future)
- Semantic search capabilities
- Advanced query filters and operators
- Search analytics and usage insights
- Performance optimizations for large datasets

### Future Enhancements

#### Semantic Search
- Vector embeddings for concept-based search
- Related conversation discovery
- Topic clustering and categorization

#### Advanced Analytics
- Conversation pattern analysis
- Most discussed topics identification
- Developer productivity insights

#### Integration Expansions
- Support for other AI coding assistants
- Export functionality for search results
- API endpoints for external integrations

### Risk Assessment

#### Technical Risks
- **Database Corruption**: Mitigated by backup strategies and rebuild capability
- **Performance Degradation**: Addressed through configurable limits and optimization
- **File System Permissions**: Handled with proper error handling and user guidance

#### User Experience Risks
- **Complex Configuration**: Mitigated by comprehensive documentation and examples
- **Search Quality**: Addressed through iterative query parser improvements
- **Version Compatibility**: Managed through semantic versioning and testing

This PRD represents a comprehensive local-first solution for Claude Code conversation search, providing users with powerful search capabilities while maintaining privacy and performance. The project successfully addresses the core problem of finding information in conversation history through intelligent indexing and natural language processing.