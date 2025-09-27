# Changelog

All notable changes to the Claude Conversation Search MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub Actions workflow for automated releases with standalone binaries
- Cross-platform standalone binaries (Linux, macOS, Windows) using pkg
- GitHub Releases documentation with installation and usage instructions
- CommonJS wrapper for pkg compatibility with ES modules

### Changed
- Enhanced package.json metadata for professional NPM publication
- Added comprehensive keywords for better discoverability  
- Added platform support indicators and Node.js engine requirements
- Added helpful npm scripts for package management (clean, prebuild, prepublishOnly, postinstall, test:all)
- Added pkg configuration and build scripts for standalone binary creation

## [1.1.0] - 2025-01-27

### Added
- `get_server_info` tool for retrieving server version, changelog, and system information
- Comprehensive unit test suite with Jest framework (38 tests covering parser, database, and search)
- Integration test suite for MCP protocol compliance (17 tests covering server initialization, tool execution, error handling, data persistence, and protocol compliance)
- Performance benchmark suite (9 tests covering indexing, search, memory usage, and database performance with large datasets up to 10K messages)
- Edge case test suite (20 tests covering corrupted files, permission issues, malformed data, database corruption, search edge cases, and resource handling)
- Test scripts (`npm test`, `npm run test:watch`, `npm run test:coverage`, `npm run test:performance`, `npm run test:edge-cases`) in package.json
- Examples directory with usage examples and MCP configuration templates
- Public documentation (installation guide, API reference) in docs-public/
- ESLint configuration with TypeScript support for code quality
- Lint scripts (`npm run lint`, `npm run lint:fix`) in package.json
- Comprehensive documentation with installation and usage examples
- Configuration options via environment variables
- MIT License

### Changed
- Migrated from CommonJS to ES2022 modules for better Node.js compatibility
- Updated all import statements to include .js extensions for ES module support
- Set package.json type to "module" for ES6 import support
- Improved error handling with user-friendly messages
- Enhanced README with troubleshooting section
- Made ConversationSearchServer class exportable for testing
- Improved get_server_info method compatibility with test environments
- Reorganized directory structure for NPM package publication
- Updated bin executable for ES module compatibility
- Enhanced package.json files array to include examples and documentation

### Fixed
- TypeScript compilation issues with ES module imports
- Reduced ESLint warnings by improving type definitions and removing unused variables
- Better SQLite compatibility with proper type handling for database queries
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