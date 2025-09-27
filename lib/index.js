#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { ConversationIndexer } from './indexer/indexer.js';
import { QueryParser } from './search/query.js';
import { ResultFormatter } from './search/result-formatter.js';
import { createUserFriendlyError, getErrorResponse, ConfigurationError, SearchError } from './utils/errors.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
export class ConversationSearchServer {
    server;
    indexer;
    queryParser;
    resultFormatter;
    config;
    indexingTimer;
    constructor(testConfig) {
        try {
            this.config = testConfig ? { ...this.loadConfig(), ...testConfig } : this.loadConfig();
            this.setupLogging();
            const projectsPath = this.resolveHome(this.config.projectsDir || '~/.claude/projects');
            const dbPath = this.resolveHome(this.config.dbPath || '~/.claude/conversation-search.db');
            this.indexer = new ConversationIndexer(projectsPath, dbPath);
            this.queryParser = new QueryParser();
            this.resultFormatter = new ResultFormatter();
            this.server = new Server({
                name: 'claude-code-conversation-search',
                version: '1.0.0',
            }, {
                capabilities: {
                    tools: {},
                },
            });
            this.setupHandlers();
            this.log('Server initialized successfully');
        }
        catch (error) {
            this.logError('Failed to initialize server', error);
            throw createUserFriendlyError(error, 'Failed to initialize conversation search server. Check configuration and file permissions.');
        }
    }
    loadConfig() {
        const config = {
            // Database configuration
            dbPath: process.env.CONVERSATION_DB_PATH,
            dbBackupEnabled: process.env.DB_BACKUP_ENABLED === 'true',
            dbBackupInterval: process.env.DB_BACKUP_INTERVAL ? parseInt(process.env.DB_BACKUP_INTERVAL) : 86400000, // 24 hours
            // Indexing configuration
            projectsDir: process.env.CLAUDE_PROJECTS_DIR,
            indexInterval: process.env.INDEX_INTERVAL ? parseInt(process.env.INDEX_INTERVAL) : 300000, // 5 minutes
            autoIndexing: process.env.AUTO_INDEXING !== 'false', // Default true
            fullTextMinLength: process.env.FULL_TEXT_MIN_LENGTH ? parseInt(process.env.FULL_TEXT_MIN_LENGTH) : 3,
            indexBatchSize: process.env.INDEX_BATCH_SIZE ? parseInt(process.env.INDEX_BATCH_SIZE) : 100,
            // Search configuration
            maxResults: process.env.MAX_RESULTS ? parseInt(process.env.MAX_RESULTS) : 20,
            defaultContextSize: process.env.DEFAULT_CONTEXT_SIZE ? parseInt(process.env.DEFAULT_CONTEXT_SIZE) : 2,
            searchTimeout: process.env.SEARCH_TIMEOUT ? parseInt(process.env.SEARCH_TIMEOUT) : 30000, // 30 seconds
            // Performance configuration
            maxMemoryMB: process.env.MAX_MEMORY_MB ? parseInt(process.env.MAX_MEMORY_MB) : 512,
            cacheSize: process.env.CACHE_SIZE ? parseInt(process.env.CACHE_SIZE) : 1000,
            // Logging and monitoring
            debug: process.env.DEBUG === 'true',
            logLevel: process.env.LOG_LEVEL || 'info',
            logToFile: process.env.LOG_TO_FILE === 'true',
            logFilePath: process.env.LOG_FILE_PATH,
            // Security and validation
            allowedFileExtensions: process.env.ALLOWED_FILE_EXTENSIONS ?
                process.env.ALLOWED_FILE_EXTENSIONS.split(',').map(ext => ext.trim()) :
                ['.jsonl'],
            maxFileSize: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) : 104857600, // 100MB
            indexThreads: process.env.INDEX_THREADS ? parseInt(process.env.INDEX_THREADS) : 1,
        };
        this.validateConfig(config);
        return config;
    }
    validateConfig(config) {
        // Validate numeric configurations
        if (config.indexInterval !== undefined && (isNaN(config.indexInterval) || config.indexInterval < 0)) {
            throw new ConfigurationError('INDEX_INTERVAL must be a positive number');
        }
        if (config.maxResults !== undefined && (isNaN(config.maxResults) || config.maxResults < 1 || config.maxResults > 1000)) {
            throw new ConfigurationError('MAX_RESULTS must be between 1 and 1000');
        }
        if (config.defaultContextSize !== undefined && (isNaN(config.defaultContextSize) || config.defaultContextSize < 0 || config.defaultContextSize > 50)) {
            throw new ConfigurationError('DEFAULT_CONTEXT_SIZE must be between 0 and 50');
        }
        if (config.searchTimeout !== undefined && (isNaN(config.searchTimeout) || config.searchTimeout < 1000 || config.searchTimeout > 300000)) {
            throw new ConfigurationError('SEARCH_TIMEOUT must be between 1000ms and 300000ms (5 minutes)');
        }
        if (config.maxMemoryMB !== undefined && (isNaN(config.maxMemoryMB) || config.maxMemoryMB < 64 || config.maxMemoryMB > 8192)) {
            throw new ConfigurationError('MAX_MEMORY_MB must be between 64MB and 8GB');
        }
        if (config.indexBatchSize !== undefined && (isNaN(config.indexBatchSize) || config.indexBatchSize < 1 || config.indexBatchSize > 10000)) {
            throw new ConfigurationError('INDEX_BATCH_SIZE must be between 1 and 10000');
        }
        if (config.fullTextMinLength !== undefined && (isNaN(config.fullTextMinLength) || config.fullTextMinLength < 1 || config.fullTextMinLength > 50)) {
            throw new ConfigurationError('FULL_TEXT_MIN_LENGTH must be between 1 and 50');
        }
        if (config.maxFileSize !== undefined && (isNaN(config.maxFileSize) || config.maxFileSize < 1024 || config.maxFileSize > 1073741824)) {
            throw new ConfigurationError('MAX_FILE_SIZE must be between 1KB and 1GB');
        }
        if (config.indexThreads !== undefined && (isNaN(config.indexThreads) || config.indexThreads < 1 || config.indexThreads > 16)) {
            throw new ConfigurationError('INDEX_THREADS must be between 1 and 16');
        }
        if (config.dbBackupInterval !== undefined && (isNaN(config.dbBackupInterval) || config.dbBackupInterval < 3600000)) {
            throw new ConfigurationError('DB_BACKUP_INTERVAL must be at least 1 hour (3600000ms)');
        }
        // Validate log level
        const validLogLevels = ['error', 'warn', 'info', 'debug'];
        if (config.logLevel && !validLogLevels.includes(config.logLevel)) {
            throw new ConfigurationError(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
        }
        // Validate file extensions
        if (config.allowedFileExtensions) {
            const invalidExts = config.allowedFileExtensions.filter(ext => !ext.startsWith('.') || ext.length < 2);
            if (invalidExts.length > 0) {
                throw new ConfigurationError(`Invalid file extensions: ${invalidExts.join(', ')}. Extensions must start with '.' and be at least 2 characters`);
            }
        }
    }
    resolveHome(filePath) {
        if (filePath.startsWith('~')) {
            return path.join(os.homedir(), filePath.slice(1));
        }
        return filePath;
    }
    setupLogging() {
        if (!this.config.debug) {
            console.error = () => { };
        }
    }
    log(message) {
        if (this.config.debug) {
            console.error(`[INFO] ${new Date().toISOString()} - ${message}`);
        }
    }
    logError(message, error) {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
        if (error && this.config.debug) {
            console.error(error);
        }
    }
    async startBackgroundIndexing() {
        try {
            this.log('Starting background indexing...');
            await this.indexer.indexAll((message) => {
                this.log(message);
            });
            if (this.config.indexInterval && this.config.indexInterval > 0) {
                this.indexingTimer = setInterval(() => {
                    this.performIncrementalIndex();
                }, this.config.indexInterval);
                this.log(`Scheduled incremental indexing every ${this.config.indexInterval}ms`);
            }
        }
        catch (error) {
            this.logError('Error during background indexing', error);
        }
    }
    async performIncrementalIndex() {
        try {
            this.log('Performing incremental index update...');
            const result = await this.indexer.indexAll((message) => {
                this.log(message);
            });
            this.log(`Incremental indexing complete: ${result.messagesIndexed} new messages`);
        }
        catch (error) {
            this.logError('Error during incremental indexing', error);
        }
    }
    setupHandlers() {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: this.getTools(),
        }));
        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            switch (name) {
                case 'search_conversations':
                    return await this.searchConversations(args);
                case 'list_projects':
                    return await this.listProjects();
                case 'get_message_context':
                    return await this.getMessageContext(args);
                case 'get_conversation_messages':
                    return await this.getConversationMessages(args);
                case 'refresh_index':
                    return await this.refreshIndex();
                case 'get_config_info':
                    return await this.getConfigInfo();
                case 'get_server_info':
                    return await this.getServerInfo();
                case 'list_tools':
                    return await this.listTools();
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        });
    }
    getTools() {
        return [
            {
                name: 'search_conversations',
                description: 'Search through Claude Code conversation history',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search query (e.g., "where did we create auth.js", "discuss React hooks", "fix CORS error")',
                        },
                        limit: {
                            type: 'number',
                            description: 'Maximum number of results to return (default: 10)',
                            default: 10,
                        },
                        includeContext: {
                            type: 'boolean',
                            description: 'Include surrounding messages for context (default: true)',
                            default: true,
                        },
                    },
                    required: ['query'],
                },
            },
            {
                name: 'list_projects',
                description: 'List all indexed Claude Code projects',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'get_message_context',
                description: 'Get full context around a specific message',
                inputSchema: {
                    type: 'object',
                    properties: {
                        messageId: {
                            type: 'string',
                            description: 'The message ID to get context for',
                        },
                        contextSize: {
                            type: 'number',
                            description: 'Number of messages before and after to include (default: 5)',
                            default: 5,
                        },
                    },
                    required: ['messageId'],
                },
            },
            {
                name: 'get_conversation_messages',
                description: 'Get messages from a specific conversation',
                inputSchema: {
                    type: 'object',
                    properties: {
                        conversationId: {
                            type: 'string',
                            description: 'The conversation ID to get messages from',
                        },
                        limit: {
                            type: 'number',
                            description: 'Number of messages to return (default: 50)',
                            default: 50,
                        },
                        startFrom: {
                            type: 'number',
                            description: 'Starting position: 0=first, -1=last, -10=10th from end, etc. (default: 0)',
                            default: 0,
                        },
                    },
                    required: ['conversationId'],
                },
            },
            {
                name: 'refresh_index',
                description: 'Manually refresh the conversation index',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'get_config_info',
                description: 'Get current configuration settings and validation status',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'get_server_info',
                description: 'Get server version, changelog, and system information',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'list_tools',
                description: 'List all available tools with their signatures and descriptions',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
        ];
    }
    async callTool(name, args) {
        switch (name) {
            case 'search_conversations':
                return await this.searchConversations(args);
            case 'list_projects':
                return await this.listProjects();
            case 'get_message_context':
                return await this.getMessageContext(args);
            case 'get_conversation_messages':
                return await this.getConversationMessages(args);
            case 'refresh_index':
                return await this.refreshIndex();
            case 'get_config_info':
                return await this.getConfigInfo();
            case 'get_server_info':
                return await this.getServerInfo();
            case 'list_tools':
                return await this.listTools();
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    close() {
        this.shutdown();
    }
    async searchConversations(args) {
        try {
            const { query, limit = 10, includeContext = true } = args;
            if (!query || typeof query !== 'string') {
                throw new SearchError('empty query', new Error('Query parameter is required and must be a string'));
            }
            if (query.trim().length === 0) {
                throw new SearchError('empty query', new Error('Search query cannot be empty'));
            }
            const effectiveLimit = Math.min(limit, this.config.maxResults || 20);
            // Parse the natural language query
            const { searchQuery, filters } = this.queryParser.parseQuery(query);
            const ftsQuery = this.queryParser.buildFTSQuery(searchQuery);
            // Perform search
            const searchOptions = {
                query: ftsQuery,
                limit: effectiveLimit * 5, // Get more results for better grouping
                includeContext,
                contextSize: this.config.defaultContextSize || 2,
                ...filters,
            };
            const results = this.indexer.getDatabase().search(searchOptions);
            // Use ResultFormatter to process and group results
            const { conversations, totalMatches, totalConversations } = this.resultFormatter.formatSearchResults(results, effectiveLimit);
            // Build the JSON output structure
            const output = {
                query: query,
                totalMatches: totalMatches,
                totalConversations: totalConversations,
                conversations: conversations
            };
            return {
                content: [
                    {
                        type: 'text',
                        text: `Found ${totalMatches} matches in ${totalConversations} conversations for query: "${query}"`,
                    },
                    {
                        type: 'text',
                        text: JSON.stringify(output, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            this.logError(`Error searching conversations: ${error.message}`, error);
            return getErrorResponse(error, 'Search');
        }
    }
    async listProjects() {
        try {
            const projects = this.indexer.getDatabase().getProjects();
            if (projects.length === 0) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: '📂 No projects indexed yet. Run refresh_index() to start indexing.',
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Found ${projects.length} indexed project(s):`,
                    },
                    {
                        type: 'text',
                        text: projects
                            .map(p => `• ${p.name} (${p.messageCount} messages)`)
                            .join('\n'),
                    },
                ],
            };
        }
        catch (error) {
            this.logError(`Error listing projects: ${error.message}`, error);
            return getErrorResponse(error, 'List projects');
        }
    }
    async getMessageContext(args) {
        try {
            const { messageId, contextSize = this.config.defaultContextSize || 5 } = args;
            if (!messageId || typeof messageId !== 'string') {
                throw new SearchError('invalid message ID', new Error('Message ID is required and must be a string'));
            }
            // This would need to be implemented in the database class
            // For now, return a placeholder
            return {
                content: [
                    {
                        type: 'text',
                        text: `Context for message ${messageId} with ${contextSize} messages before/after`,
                    },
                ],
            };
        }
        catch (error) {
            this.logError(`Error getting conversation context: ${error.message}`, error);
            return getErrorResponse(error, 'Get message context');
        }
    }
    async getConversationMessages(args) {
        try {
            const { conversationId, limit = 50, startFrom = 0 } = args;
            if (!conversationId || typeof conversationId !== 'string') {
                throw new SearchError('invalid conversation ID', new Error('Conversation ID is required and must be a string'));
            }
            const messages = this.indexer.getDatabase().getConversationMessages(conversationId, limit, startFrom);
            if (messages.length === 0) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `No messages found for conversation ID: ${conversationId}`,
                        },
                    ],
                };
            }
            const output = {
                conversationId,
                messageCount: messages.length,
                startFrom,
                limit,
                messages: messages.map(msg => ({
                    id: msg.id,
                    timestamp: msg.timestamp,
                    type: msg.type,
                    content: msg.content,
                    messageUuid: msg.messageUuid,
                    parentUuid: msg.parentUuid,
                    projectPath: msg.projectPath,
                    projectName: msg.projectName
                }))
            };
            return {
                content: [
                    {
                        type: 'text',
                        text: `Found ${messages.length} messages in conversation ${conversationId}`,
                    },
                    {
                        type: 'text',
                        text: JSON.stringify(output, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            this.logError(`Error getting conversation messages: ${error.message}`, error);
            return getErrorResponse(error, 'Get conversation messages');
        }
    }
    async listTools() {
        try {
            const tools = this.getTools();
            const toolSignatures = tools.map(tool => {
                const params = tool.inputSchema?.properties || {};
                const required = tool.inputSchema?.required || [];
                // Build parameter signature string
                const paramStrings = Object.entries(params).map(([name, schema]) => {
                    const isRequired = required.includes(name);
                    const type = schema.type || 'any';
                    const defaultValue = schema.default !== undefined ? ` = ${JSON.stringify(schema.default)}` : '';
                    const optional = isRequired ? '' : '?';
                    return `${name}${optional}: ${type}${defaultValue}`;
                });
                const signature = `${tool.name}(${paramStrings.length > 0 ? `{ ${paramStrings.join(', ')} }` : ''})`;
                return {
                    name: tool.name,
                    signature,
                    description: tool.description,
                    parameters: Object.entries(params).map(([name, schema]) => ({
                        name,
                        type: schema.type || 'any',
                        required: required.includes(name),
                        default: schema.default,
                        description: schema.description
                    }))
                };
            });
            const output = {
                totalTools: tools.length,
                tools: toolSignatures
            };
            return {
                content: [
                    {
                        type: 'text',
                        text: `Available tools (${tools.length} total):`,
                    },
                    {
                        type: 'text',
                        text: toolSignatures.map(tool => `• ${tool.signature}\n  ${tool.description}`).join('\n\n'),
                    },
                    {
                        type: 'text',
                        text: '\nDetailed tool information:',
                    },
                    {
                        type: 'text',
                        text: JSON.stringify(output, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            this.logError(`Error listing tools: ${error.message}`, error);
            return getErrorResponse(error, 'List tools');
        }
    }
    async getConfigInfo() {
        try {
            const configInfo = {
                database: {
                    path: this.config.dbPath || '~/.claude/conversation-search.db',
                    backupEnabled: this.config.dbBackupEnabled || false,
                    backupInterval: this.config.dbBackupInterval || 86400000,
                },
                indexing: {
                    projectsDir: this.config.projectsDir || '~/.claude/projects',
                    interval: this.config.indexInterval || 300000,
                    autoIndexing: this.config.autoIndexing !== false,
                    batchSize: this.config.indexBatchSize || 100,
                    fullTextMinLength: this.config.fullTextMinLength || 3,
                    threads: this.config.indexThreads || 1,
                },
                search: {
                    maxResults: this.config.maxResults || 20,
                    defaultContextSize: this.config.defaultContextSize || 2,
                    timeout: this.config.searchTimeout || 30000,
                },
                performance: {
                    maxMemoryMB: this.config.maxMemoryMB || 512,
                    cacheSize: this.config.cacheSize || 1000,
                },
                logging: {
                    debug: this.config.debug || false,
                    logLevel: this.config.logLevel || 'info',
                    logToFile: this.config.logToFile || false,
                    logFilePath: this.config.logFilePath || 'default',
                },
                security: {
                    allowedExtensions: this.config.allowedFileExtensions || ['.jsonl'],
                    maxFileSize: this.config.maxFileSize || 104857600,
                },
            };
            const configSummary = [
                '⚙️ **Current Configuration**',
                '',
                '**Database:**',
                `• Path: ${configInfo.database.path}`,
                `• Backup enabled: ${configInfo.database.backupEnabled}`,
                '',
                '**Indexing:**',
                `• Projects directory: ${configInfo.indexing.projectsDir}`,
                `• Auto-indexing: ${configInfo.indexing.autoIndexing}`,
                `• Interval: ${(configInfo.indexing.interval / 1000 / 60).toFixed(1)} minutes`,
                `• Batch size: ${configInfo.indexing.batchSize}`,
                '',
                '**Search:**',
                `• Max results: ${configInfo.search.maxResults}`,
                `• Default context: ${configInfo.search.defaultContextSize} messages`,
                `• Timeout: ${(configInfo.search.timeout / 1000).toFixed(1)} seconds`,
                '',
                '**Performance:**',
                `• Max memory: ${configInfo.performance.maxMemoryMB} MB`,
                `• Cache size: ${configInfo.performance.cacheSize} results`,
                '',
                '**Logging:**',
                `• Level: ${configInfo.logging.logLevel}`,
                `• Debug: ${configInfo.logging.debug}`,
                '',
                '**Security:**',
                `• Allowed extensions: ${configInfo.security.allowedExtensions.join(', ')}`,
                `• Max file size: ${(configInfo.security.maxFileSize / 1024 / 1024).toFixed(1)} MB`,
                '',
                '📖 **For configuration help, see [Configuration Guide](docs/configuration.md)**'
            ];
            return {
                content: [
                    {
                        type: 'text',
                        text: configSummary.join('\n'),
                    },
                    {
                        type: 'text',
                        text: `\n**Raw Configuration Object:**\n\`\`\`json\n${JSON.stringify(configInfo, null, 2)}\n\`\`\``,
                    },
                ],
            };
        }
        catch (error) {
            this.logError(`Error getting configuration info: ${error.message}`, error);
            return getErrorResponse(error, 'Get configuration info');
        }
    }
    async getServerInfo() {
        try {
            // Default package info as fallback
            let packageInfo = {
                name: 'claude-code-conversation-search-mcp',
                version: '1.0.0',
                description: 'MCP server for searching Claude Code conversation history'
            };
            // Try to read package.json for version info
            try {
                // Use process.cwd() as fallback that works in both environments
                const packageJsonPath = path.resolve(process.cwd(), 'package.json');
                const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
                packageInfo = JSON.parse(packageContent);
            }
            catch (error) {
                // Use fallback package info
            }
            // Read recent changelog entries
            const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');
            let latestChanges = 'No changelog available';
            try {
                const changelogContent = fs.readFileSync(changelogPath, 'utf8');
                // Extract the unreleased section and latest version
                const unreleasedMatch = changelogContent.match(/## \[Unreleased\](.*?)(?=\n## \[|$)/s);
                const latestVersionMatch = changelogContent.match(/## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})(.*?)(?=\n## \[|$)/s);
                if (unreleasedMatch) {
                    latestChanges = '## [Unreleased]' + unreleasedMatch[1].trim();
                }
                else if (latestVersionMatch) {
                    latestChanges = `## [${latestVersionMatch[1]}] - ${latestVersionMatch[2]}` + latestVersionMatch[3].trim();
                }
            }
            catch (error) {
                // Fallback if we can't read changelog
                latestChanges = 'Changelog not accessible';
            }
            // Get system information
            const systemInfo = {
                nodeVersion: process.version,
                platform: process.platform,
                architecture: process.arch,
                memoryUsage: process.memoryUsage(),
                uptime: Math.floor(process.uptime()),
            };
            const serverInfo = [
                '🚀 **Claude Conversation Search MCP Server**',
                '',
                '**Version Information:**',
                `• Package: ${packageInfo.name}`,
                `• Version: ${packageInfo.version}`,
                `• Description: ${packageInfo.description}`,
                '',
                '**System Information:**',
                `• Node.js: ${systemInfo.nodeVersion}`,
                `• Platform: ${systemInfo.platform} (${systemInfo.architecture})`,
                `• Memory Usage: ${Math.round(systemInfo.memoryUsage.rss / 1024 / 1024)} MB RSS`,
                `• Uptime: ${Math.floor(systemInfo.uptime / 60)} minutes`,
                '',
                '**Latest Changes:**',
                '```markdown',
                latestChanges,
                '```',
                '',
                '**Available Tools:**',
                `• ${this.getTools().length} tools available`,
                `• Use \`list_tools()\` to see all available functionality`,
                '',
                '**Links:**',
                `• Repository: ${packageInfo.repository?.url || 'https://github.com/TonySimonovsky/claude-code-conversation-search-mcp'}`,
                `• Issues: ${packageInfo.bugs?.url || 'https://github.com/TonySimonovsky/claude-code-conversation-search-mcp/issues'}`,
                `• Documentation: README.md and docs/`,
                '',
                '📖 **For help:** Use `get_config_info()` to check configuration or `list_tools()` to see available commands'
            ];
            return {
                content: [
                    {
                        type: 'text',
                        text: serverInfo.join('\n'),
                    },
                    {
                        type: 'text',
                        text: `\n**Raw Server Metadata:**\n\`\`\`json\n${JSON.stringify({
                            package: packageInfo,
                            system: systemInfo,
                            tools: this.getTools().map(tool => ({ name: tool.name, description: tool.description }))
                        }, null, 2)}\n\`\`\``,
                    },
                ],
            };
        }
        catch (error) {
            this.logError(`Error getting server info: ${error.message}`, error);
            return getErrorResponse(error, 'Get server info');
        }
    }
    async refreshIndex() {
        try {
            this.log('Manual index refresh requested');
            const result = await this.indexer.indexAll((message) => {
                this.log(message);
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `✅ Indexing complete! Indexed ${result.messagesIndexed} messages from ${result.filesIndexed} files.`,
                    },
                ],
            };
        }
        catch (error) {
            this.logError(`Error refreshing index: ${error.message}`, error);
            return getErrorResponse(error, 'Index refresh');
        }
    }
    async run() {
        try {
            const transport = new StdioServerTransport();
            await this.server.connect(transport);
            this.log('Claude Conversation Search MCP server running');
            console.error('Claude Conversation Search MCP server started successfully');
            // Start indexing after server is connected and ready
            this.startBackgroundIndexing();
        }
        catch (error) {
            this.logError('Failed to start server', error);
            throw error;
        }
    }
    shutdown() {
        if (this.indexingTimer) {
            clearInterval(this.indexingTimer);
        }
        this.indexer.close();
        this.log('Server shutdown complete');
    }
}
// Main entry point
const server = new ConversationSearchServer();
// Handle graceful shutdown
process.on('SIGINT', () => {
    console.error('\nShutting down server...');
    server.shutdown();
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.error('\nShutting down server...');
    server.shutdown();
    process.exit(0);
});
server.run().catch((error) => {
    console.error('Fatal server error:', error.message);
    if (process.env.DEBUG === 'true') {
        console.error(error.stack);
    }
    process.exit(1);
});
//# sourceMappingURL=index.js.map