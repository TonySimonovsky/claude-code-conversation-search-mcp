# Changelog

All notable changes to the Claude Conversation Search MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- ESLint configuration with TypeScript support for code quality
- Lint scripts (`npm run lint`, `npm run lint:fix`) in package.json
- Comprehensive documentation with installation and usage examples
- Configuration options via environment variables
- MIT License

### Changed
- Set package.json type to "module" for ES6 import support
- Improved error handling with user-friendly messages
- Enhanced README with troubleshooting section

### Fixed
- Removed unused variables to improve code quality

## [1.0.0] - 2025-01-15

### Added
- Initial release
- Full-text search across Claude Code conversations
- Natural language query parsing
- Project and time-based filtering
- Tool operation tracking (file edits, bash commands)
- SQLite FTS5 for fast search results
- Auto-indexing with incremental updates
- MCP tools:
  - `search_conversations` - Search with natural language queries
  - `list_projects` - List all indexed projects
  - `get_conversation_context` - Get message context
  - `refresh_index` - Manual re-indexing

### Technical Features
- TypeScript implementation
- Better-sqlite3 for database operations
- Chokidar for file watching
- MCP SDK integration

[Unreleased]: https://github.com/TonySimonovsky/claude-code-conversation-search-mcp/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/TonySimonovsky/claude-code-conversation-search-mcp/releases/tag/v1.0.0