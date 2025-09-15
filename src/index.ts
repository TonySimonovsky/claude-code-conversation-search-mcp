#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { ConversationIndexer } from './indexer/indexer';
import { QueryParser } from './search/query';
import { SearchOptions, SearchResult } from './types';
import * as path from 'path';
import * as os from 'os';

interface ServerConfig {
  dbPath?: string;
  projectsDir?: string;
  indexInterval?: number;
  maxResults?: number;
  debug?: boolean;
}

class ConversationSearchServer {
  private server: Server;
  private indexer: ConversationIndexer;
  private queryParser: QueryParser;
  private config: ServerConfig;
  private indexingTimer?: NodeJS.Timeout;

  constructor() {
    this.config = this.loadConfig();
    this.setupLogging();
    
    try {
      const projectsPath = this.resolveHome(this.config.projectsDir || '~/.claude/projects');
      const dbPath = this.resolveHome(this.config.dbPath || '~/.claude/conversation-search.db');
      
      this.indexer = new ConversationIndexer(projectsPath, dbPath);
      this.queryParser = new QueryParser();
      this.server = new Server(
        {
          name: 'claude-conversation-search',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      this.setupHandlers();
      this.log('Server initialized successfully');
    } catch (error) {
      this.logError('Failed to initialize server', error);
      throw error;
    }
  }

  private loadConfig(): ServerConfig {
    return {
      dbPath: process.env.CONVERSATION_DB_PATH,
      projectsDir: process.env.CLAUDE_PROJECTS_DIR,
      indexInterval: process.env.INDEX_INTERVAL ? parseInt(process.env.INDEX_INTERVAL) : 300000,
      maxResults: process.env.MAX_RESULTS ? parseInt(process.env.MAX_RESULTS) : 20,
      debug: process.env.DEBUG === 'true',
    };
  }

  private resolveHome(filePath: string): string {
    if (filePath.startsWith('~')) {
      return path.join(os.homedir(), filePath.slice(1));
    }
    return filePath;
  }

  private setupLogging() {
    if (!this.config.debug) {
      console.error = () => {};
    }
  }

  private log(message: string) {
    if (this.config.debug) {
      console.error(`[INFO] ${new Date().toISOString()} - ${message}`);
    }
  }

  private logError(message: string, error?: any) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
    if (error && this.config.debug) {
      console.error(error);
    }
  }

  private async startBackgroundIndexing() {
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
    } catch (error) {
      this.logError('Error during background indexing', error);
    }
  }

  private async performIncrementalIndex() {
    try {
      this.log('Performing incremental index update...');
      const result = await this.indexer.indexAll((message) => {
        this.log(message);
      });
      this.log(`Incremental indexing complete: ${result.messagesIndexed} new messages`);
    } catch (error) {
      this.logError('Error during incremental indexing', error);
    }
  }

  private setupHandlers() {
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
        
        case 'get_conversation_context':
          return await this.getConversationContext(args);
        
        case 'refresh_index':
          return await this.refreshIndex();
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private getTools(): Tool[] {
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
        name: 'get_conversation_context',
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
        name: 'refresh_index',
        description: 'Manually refresh the conversation index',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  private async searchConversations(args: any) {
    try {
      const { query, limit = 10, includeContext = true } = args;
      
      if (!query || typeof query !== 'string') {
        throw new Error('Query parameter is required and must be a string');
      }
      
      const effectiveLimit = Math.min(limit, this.config.maxResults || 20);
      
      // Parse the natural language query
      const { searchQuery, filters } = this.queryParser.parseQuery(query);
      const ftsQuery = this.queryParser.buildFTSQuery(searchQuery);
      
      // Perform search
      const searchOptions: SearchOptions = {
        query: ftsQuery,
        limit: effectiveLimit,
        includeContext,
        contextSize: 2,
        ...filters,
      };

      const results = this.indexer.getDatabase().search(searchOptions);
    
    // Format results for display
    const formattedResults = results.map((result: SearchResult) => {
      // Extract conversation ID from result
      const conversationId = result.message.conversationId;
      
      // Decode project path from the encoded directory name
      const decodedProjectPath = result.message.projectPath
        .replace(/-Users-tonysimonovskiy-Dropbox-/g, '/Users/tonysimonovskiy/Dropbox/')
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ');
      
      return {
        project: result.message.projectName,
        timestamp: result.message.timestamp.toISOString(),
        type: result.message.type,
        content: result.message.content,
        file: result.conversationFile,
        toolOperations: result.message.toolOperations,
        conversationId: conversationId,
        projectPath: decodedProjectPath,
        claudeCommand: `claude --resume ${conversationId}`,
        openAction: {
          available: true,
          description: `Open conversation in Claude Code`,
          conversationId: conversationId,
          projectPath: decodedProjectPath
        },
        context: includeContext ? {
          before: result.context.before.map(m => ({
            type: m.type,
            content: m.content.substring(0, 200),
          })),
          after: result.context.after.map(m => ({
            type: m.type,
            content: m.content.substring(0, 200),
          })),
        } : undefined,
      };
    });

    // Group results by conversation ID and create resume commands
    const conversationGroups = new Map<string, any[]>();
    formattedResults.forEach(result => {
      const convId = result.conversationId;
      if (!conversationGroups.has(convId)) {
        conversationGroups.set(convId, []);
      }
      conversationGroups.get(convId)!.push(result);
    });

    // Build resume commands summary
    const resumeCommands = Array.from(conversationGroups.keys())
      .map(convId => `claude --resume ${convId}`)
      .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Found ${results.length} result(s) for query: "${query}"`,
          },
          {
            type: 'text', 
            text: JSON.stringify(formattedResults, null, 2),
          },
          {
            type: 'text',
            text: `\nTo resume these conversations:\n${resumeCommands}`,
          },
        ],
      };
    } catch (error) {
      this.logError(`Error searching conversations: ${error.message}`, error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Search failed: ${error.message}\n\nPlease check your query and try again.`,
          },
        ],
      };
    }
  }

  private async listProjects() {
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
    } catch (error) {
      this.logError(`Error listing projects: ${error.message}`, error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to list projects: ${error.message}`,
          },
        ],
      };
    }
  }

  private async getConversationContext(args: any) {
    try {
      const { messageId, contextSize = 5 } = args;
      
      if (!messageId || typeof messageId !== 'string') {
        throw new Error('Message ID is required and must be a string');
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
    } catch (error) {
      this.logError(`Error getting conversation context: ${error.message}`, error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to get context: ${error.message}`,
          },
        ],
      };
    }
  }

  private async refreshIndex() {
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
    } catch (error) {
      this.logError(`Error refreshing index: ${error.message}`, error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Indexing failed: ${error.message}\n\nTry checking if ~/.claude/projects directory exists and contains conversation files.`,
          },
        ],
      };
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
    } catch (error) {
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