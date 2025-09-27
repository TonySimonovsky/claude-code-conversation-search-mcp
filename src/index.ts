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
import { ResultFormatter } from './search/result-formatter';
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
  private resultFormatter: ResultFormatter;
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
      this.resultFormatter = new ResultFormatter();
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
        
        case 'get_message_context':
          return await this.getMessageContext(args);
        
        case 'get_conversation_messages':
          return await this.getConversationMessages(args);
        
        case 'refresh_index':
          return await this.refreshIndex();
        
        case 'list_tools':
          return await this.listTools();
        
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
        name: 'list_tools',
        description: 'List all available tools with their signatures and descriptions',
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
        limit: effectiveLimit * 5, // Get more results for better grouping
        includeContext,
        contextSize: 2,
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
    } catch (error) {
      this.logError(`Error searching conversations: ${(error as Error).message}`, error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Search failed: ${(error as Error).message}\n\nPlease check your query and try again.`,
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
      this.logError(`Error listing projects: ${(error as Error).message}`, error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to list projects: ${(error as Error).message}`,
          },
        ],
      };
    }
  }

  private async getMessageContext(args: any) {
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
      this.logError(`Error getting conversation context: ${(error as Error).message}`, error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to get context: ${(error as Error).message}`,
          },
        ],
      };
    }
  }

  private async getConversationMessages(args: any) {
    try {
      const { conversationId, limit = 50, startFrom = 0 } = args;
      
      if (!conversationId || typeof conversationId !== 'string') {
        throw new Error('Conversation ID is required and must be a string');
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
    } catch (error) {
      this.logError(`Error getting conversation messages: ${(error as Error).message}`, error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to get conversation messages: ${(error as Error).message}`,
          },
        ],
      };
    }
  }

  private async listTools() {
    try {
      const tools = this.getTools();
      
      const toolSignatures = tools.map(tool => {
        const params = tool.inputSchema?.properties || {};
        const required = (tool.inputSchema as any)?.required || [];
        
        // Build parameter signature string
        const paramStrings = Object.entries(params).map(([name, schema]: [string, any]) => {
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
          parameters: Object.entries(params).map(([name, schema]: [string, any]) => ({
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
            text: toolSignatures.map(tool => 
              `• ${tool.signature}\n  ${tool.description}`
            ).join('\n\n'),
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
    } catch (error) {
      this.logError(`Error listing tools: ${(error as Error).message}`, error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to list tools: ${(error as Error).message}`,
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
      this.logError(`Error refreshing index: ${(error as Error).message}`, error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Indexing failed: ${(error as Error).message}\n\nTry checking if ~/.claude/projects directory exists and contains conversation files.`,
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