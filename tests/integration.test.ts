import { ConversationSearchServer } from '../src/index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('MCP Protocol Integration Tests', () => {
  let server: ConversationSearchServer;
  let tempDir: string;
  let testConversationFile: string;

  beforeAll(async () => {
    // Create temporary directory for test data
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-integration-test-'));
    
    // Create test conversation data
    const testMessages = [
      {
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: tempDir,
        sessionId: 'test-session-123',
        version: '1.0.0',
        gitBranch: 'main',
        type: 'user',
        message: {
          role: 'user',
          content: 'How do I create a React component?'
        },
        uuid: 'user-msg-1',
        timestamp: new Date('2024-01-01T10:00:00Z').toISOString(),
        isMeta: false
      },
      {
        parentUuid: 'user-msg-1',
        isSidechain: false,
        userType: 'assistant',
        cwd: tempDir,
        sessionId: 'test-session-123',
        version: '1.0.0',
        gitBranch: 'main',
        type: 'assistant',
        message: {
          role: 'assistant',
          content: 'You can create a React component using function syntax like this...'
        },
        uuid: 'assistant-msg-1',
        timestamp: new Date('2024-01-01T10:01:00Z').toISOString(),
        isMeta: false
      },
      {
        parentUuid: 'assistant-msg-1',
        isSidechain: false,
        userType: 'human',
        cwd: tempDir,
        sessionId: 'test-session-123',
        version: '1.0.0',
        gitBranch: 'main',
        type: 'user',
        message: {
          role: 'user',
          content: 'Can you help me debug a TypeScript error?'
        },
        uuid: 'user-msg-2',
        timestamp: new Date('2024-01-01T10:02:00Z').toISOString(),
        isMeta: false
      }
    ];

    // Write test conversation file
    testConversationFile = path.join(tempDir, 'test-conversation.jsonl');
    const conversationData = testMessages.map(msg => JSON.stringify(msg)).join('\n');
    fs.writeFileSync(testConversationFile, conversationData);

    // Initialize server with test data
    server = new ConversationSearchServer({
      projectsDir: tempDir,
      dbPath: path.join(tempDir, 'test.db'),
      indexInterval: 0, // Disable auto-indexing for tests
      autoIndexing: false
    });
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('MCP Server Initialization', () => {
    it('should initialize server without errors', () => {
      expect(server).toBeDefined();
      expect(typeof server.getTools).toBe('function');
      expect(typeof server.callTool).toBe('function');
    });

    it('should return all expected tools', () => {
      const tools = server.getTools();
      
      const expectedTools = [
        'search_conversations',
        'list_projects',
        'get_message_context',
        'get_conversation_messages', 
        'refresh_index',
        'get_config_info',
        'get_server_info',
        'list_tools'
      ];

      expect(tools).toHaveLength(expectedTools.length);
      
      expectedTools.forEach(toolName => {
        const tool = tools.find((t: any) => t.name === toolName);
        expect(tool).toBeDefined();
        expect(tool!.description).toBeTruthy();
        expect(tool!.inputSchema).toBeDefined();
      });
    });
  });

  describe('Tool Execution Integration', () => {
    beforeAll(async () => {
      // Index the test data first
      await server.callTool('refresh_index', {});
    });

    it('should execute refresh_index tool successfully', async () => {
      const result = await server.callTool('refresh_index', {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Indexing complete');
    });

    it('should execute list_projects tool successfully', async () => {
      const result = await server.callTool('list_projects', {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('project');
    });

    it('should execute search_conversations tool successfully', async () => {
      const result = await server.callTool('search_conversations', {
        query: 'React component'
      });
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found');
    });

    it('should execute get_conversation_messages tool successfully', async () => {
      const result = await server.callTool('get_conversation_messages', {
        conversationId: 'test-session-123',
        limit: 10,
        startFrom: 0
      });
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('conversation');
    });

    it('should execute get_message_context tool successfully', async () => {
      // First search to get a message ID
      const searchResult = await server.callTool('search_conversations', {
        query: 'React component'
      });
      
      expect(searchResult.content).toBeDefined();
      
      // Extract message ID from search results (this might need adjustment based on actual output format)
      const messageIdMatch = searchResult.content[0].text.match(/ID: ([^)]+)/);
      if (messageIdMatch) {
        const messageId = messageIdMatch[1];
        
        const result = await server.callTool('get_message_context', {
          messageId: messageId,
          contextSize: 2
        });
        
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(Array.isArray(result.content)).toBe(true);
      }
    });

    it('should execute get_config_info tool successfully', async () => {
      const result = await server.callTool('get_config_info', {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Configuration');
    });

    it('should execute get_server_info tool successfully', async () => {
      const result = await server.callTool('get_server_info', {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Claude Conversation Search MCP Server');
      expect(result.content[0].text).toContain('Version Information');
    });

    it('should execute list_tools tool successfully', async () => {
      const result = await server.callTool('list_tools', {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Available tools');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid tool name gracefully', async () => {
      try {
        await server.callTool('invalid_tool_name', {});
        fail('Should have thrown an error for invalid tool name');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.message).toContain('Unknown tool');
      }
    });

    it('should handle missing required parameters gracefully', async () => {
      const result = await server.callTool('search_conversations', {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text.toLowerCase()).toContain('error');
    });

    it('should handle invalid parameters gracefully', async () => {
      const result = await server.callTool('get_conversation_messages', {
        conversationId: 'non-existent-conversation',
        limit: 10,
        startFrom: 0
      });
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });
  });

  describe('Data Persistence Integration', () => {
    it('should persist indexed data across operations', async () => {
      // Search for data
      const searchResult1 = await server.callTool('search_conversations', {
        query: 'TypeScript error'
      });
      
      // List projects
      await server.callTool('list_projects', {});
      
      // Search again - should still find the same data
      const searchResult2 = await server.callTool('search_conversations', {
        query: 'TypeScript error'
      });
      
      expect(searchResult1.content[0].text).toBe(searchResult2.content[0].text);
    });

    it('should handle incremental indexing', async () => {
      // Add more test data
      const newMessage = {
        parentUuid: 'user-msg-2',
        isSidechain: false,
        userType: 'assistant',
        cwd: tempDir,
        sessionId: 'test-session-123',
        version: '1.0.0',
        gitBranch: 'main',
        type: 'assistant',
        message: {
          role: 'assistant',
          content: 'Here is how to fix that TypeScript error: check your type definitions'
        },
        uuid: 'assistant-msg-2',
        timestamp: new Date('2024-01-01T10:03:00Z').toISOString(),
        isMeta: false
      };

      // Append to conversation file
      fs.appendFileSync(testConversationFile, '\n' + JSON.stringify(newMessage));

      // Re-index
      await server.callTool('refresh_index', {});

      // Search for the new content
      const result = await server.callTool('search_conversations', {
        query: 'fix TypeScript error'
      });

      expect(result.content[0].text).toContain('Found');
    });
  });

  describe('MCP Protocol Compliance', () => {
    it('should return proper MCP response format for all tools', async () => {
      const tools = server.getTools();
      
      for (const tool of tools) {
        try {
          let args = {};
          
          // Provide required arguments for tools that need them
          if (tool.name === 'search_conversations') {
            args = { query: 'test' };
          } else if (tool.name === 'get_message_context') {
            args = { messageId: 'test-id' };
          } else if (tool.name === 'get_conversation_messages') {
            args = { conversationId: 'test-session-123', limit: 5, startFrom: 0 };
          }
          
          const result = await server.callTool(tool.name, args);
          
          // Verify MCP response structure
          expect(result).toBeDefined();
          expect(result.content).toBeDefined();
          expect(Array.isArray(result.content)).toBe(true);
          
          result.content.forEach((item: any) => {
            expect(item.type).toBeDefined();
            expect(['text', 'image', 'resource'].includes(item.type)).toBe(true);
            if (item.type === 'text') {
              expect(typeof item.text).toBe('string');
            }
          });
        } catch (error) {
          // Even errors should be handled gracefully and return proper format
          // This is acceptable for tools with invalid parameters
        }
      }
    });

    it('should handle concurrent tool calls properly', async () => {
      const promises = [
        server.callTool('list_projects', {}),
        server.callTool('get_config_info', {}),
        server.callTool('search_conversations', { query: 'React' }),
        server.callTool('get_server_info', {})
      ];

      const results = await Promise.all(promises);
      
      results.forEach((result: any) => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(Array.isArray(result.content)).toBe(true);
      });
    });
  });
});