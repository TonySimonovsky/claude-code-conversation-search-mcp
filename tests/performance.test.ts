import { ConversationSearchServer } from '../src/index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Performance Benchmarks', () => {
  let server: ConversationSearchServer;
  let tempDir: string;
  const performanceResults: any[] = [];

  beforeAll(async () => {
    // Create temporary directory for benchmark data
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-performance-test-'));
    
    // Initialize server with test data
    server = new ConversationSearchServer({
      projectsDir: tempDir,
      dbPath: path.join(tempDir, 'performance.db'),
      indexInterval: 0,
      autoIndexing: false,
      debug: false
    });
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // Output performance results
    console.log('\n📊 Performance Benchmark Results:');
    console.log('=====================================');
    performanceResults.forEach(result => {
      console.log(`${result.operation}: ${result.duration}ms (${result.description})`);
    });
    console.log('=====================================\n');
  });

  const measurePerformance = async (operation: string, description: string, fn: () => Promise<any>) => {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    performanceResults.push({ operation, duration, description });
    return { result, duration };
  };

  describe('Large Dataset Indexing Performance', () => {
    it('should benchmark indexing 1,000 messages', async () => {
      const messageCount = 1000;
      const testMessages = generateLargeConversationData(messageCount);
      
      // Write test conversation file
      const conversationFile = path.join(tempDir, 'large-conversation-1k.jsonl');
      const conversationData = testMessages.map(msg => JSON.stringify(msg)).join('\n');
      fs.writeFileSync(conversationFile, conversationData);

      const { duration } = await measurePerformance(
        'Index 1K messages',
        `Indexing ${messageCount} conversation messages`,
        async () => {
          return await server.callTool('refresh_index', {});
        }
      );

      // Performance assertions
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    }, 30000); // 30 second timeout

    it('should benchmark indexing 5,000 messages', async () => {
      const messageCount = 5000;
      const testMessages = generateLargeConversationData(messageCount);
      
      // Write test conversation file
      const conversationFile = path.join(tempDir, 'large-conversation-5k.jsonl');
      const conversationData = testMessages.map(msg => JSON.stringify(msg)).join('\n');
      fs.writeFileSync(conversationFile, conversationData);

      const { duration } = await measurePerformance(
        'Index 5K messages',
        `Indexing ${messageCount} conversation messages`,
        async () => {
          return await server.callTool('refresh_index', {});
        }
      );

      // Performance assertions
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    }, 60000); // 60 second timeout

    it('should benchmark indexing 10,000 messages', async () => {
      const messageCount = 10000;
      const testMessages = generateLargeConversationData(messageCount);
      
      // Write test conversation file
      const conversationFile = path.join(tempDir, 'large-conversation-10k.jsonl');
      const conversationData = testMessages.map(msg => JSON.stringify(msg)).join('\n');
      fs.writeFileSync(conversationFile, conversationData);

      const { duration } = await measurePerformance(
        'Index 10K messages',
        `Indexing ${messageCount} conversation messages`,
        async () => {
          return await server.callTool('refresh_index', {});
        }
      );

      // Performance assertions
      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
    }, 120000); // 120 second timeout
  });

  describe('Search Performance with Large Datasets', () => {
    beforeAll(async () => {
      // Ensure we have indexed data for search tests
      const messageCount = 5000;
      const testMessages = generateLargeConversationData(messageCount);
      
      const conversationFile = path.join(tempDir, 'search-test-data.jsonl');
      const conversationData = testMessages.map(msg => JSON.stringify(msg)).join('\n');
      fs.writeFileSync(conversationFile, conversationData);
      
      await server.callTool('refresh_index', {});
    });

    it('should benchmark simple search queries', async () => {
      const { duration } = await measurePerformance(
        'Simple search',
        'Search for "React component" in large dataset',
        async () => {
          return await server.callTool('search_conversations', {
            query: 'React component'
          });
        }
      );

      // Performance assertions
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should benchmark complex search queries', async () => {
      const { duration } = await measurePerformance(
        'Complex search',
        'Search with filters and project constraints',
        async () => {
          return await server.callTool('search_conversations', {
            query: 'TypeScript error debugging authentication',
            project: 'test-project',
            limit: 100
          });
        }
      );

      // Performance assertions
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should benchmark concurrent search queries', async () => {
      const queries = [
        'React component',
        'TypeScript error',
        'database query',
        'authentication bug',
        'performance optimization'
      ];

      const { duration } = await measurePerformance(
        'Concurrent searches',
        `Running ${queries.length} concurrent search queries`,
        async () => {
          const promises = queries.map(query => 
            server.callTool('search_conversations', { query })
          );
          return await Promise.all(promises);
        }
      );

      // Performance assertions
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });

  describe('Memory Usage Benchmarks', () => {
    it('should monitor memory usage during large indexing', async () => {
      const initialMemory = process.memoryUsage();
      
      // Generate and index a large dataset
      const messageCount = 2000;
      const testMessages = generateLargeConversationData(messageCount);
      
      const conversationFile = path.join(tempDir, 'memory-test.jsonl');
      const conversationData = testMessages.map(msg => JSON.stringify(msg)).join('\n');
      fs.writeFileSync(conversationFile, conversationData);
      
      await server.callTool('refresh_index', {});
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = Math.round(memoryIncrease / 1024 / 1024);
      
      performanceResults.push({
        operation: 'Memory usage',
        duration: memoryIncreaseMB,
        description: `Memory increase during ${messageCount} message indexing (MB)`
      });

      // Memory should not increase by more than 100MB for 2k messages
      expect(memoryIncreaseMB).toBeLessThan(100);
    });
  });

  describe('Database Performance', () => {
    beforeAll(async () => {
      // Index large dataset for database tests
      const messageCount = 3000;
      const testMessages = generateLargeConversationData(messageCount);
      
      const conversationFile = path.join(tempDir, 'db-test-data.jsonl');
      const conversationData = testMessages.map(msg => JSON.stringify(msg)).join('\n');
      fs.writeFileSync(conversationFile, conversationData);
      
      await server.callTool('refresh_index', {});
    });

    it('should benchmark conversation message retrieval', async () => {
      const { duration } = await measurePerformance(
        'Message retrieval',
        'Retrieve 100 messages from large conversation',
        async () => {
          return await server.callTool('get_conversation_messages', {
            conversationId: 'perf-session-1',
            limit: 100,
            startFrom: 0
          });
        }
      );

      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });

    it('should benchmark project listing with large dataset', async () => {
      const { duration } = await measurePerformance(
        'Project listing',
        'List all projects with large indexed dataset',
        async () => {
          return await server.callTool('list_projects', {});
        }
      );

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});

function generateLargeConversationData(messageCount: number) {
  const messages = [];
  const projects = ['frontend-app', 'backend-api', 'mobile-app', 'data-pipeline'];
  const topics = [
    'React component implementation',
    'TypeScript error debugging',
    'Database query optimization',
    'Authentication system setup',
    'Performance monitoring',
    'Unit testing framework',
    'API endpoint design',
    'State management patterns',
    'Error handling strategies',
    'Code review feedback'
  ];

  for (let i = 0; i < messageCount; i++) {
    const sessionId = `perf-session-${Math.floor(i / 50) + 1}`;
    const project = projects[i % projects.length];
    const topic = topics[i % topics.length];
    const isUser = i % 2 === 0;
    
    const message = {
      parentUuid: i > 0 ? `msg-${i - 1}` : null,
      isSidechain: false,
      userType: isUser ? 'human' : 'assistant',
      cwd: `/Users/test/projects/${project}`,
      sessionId: sessionId,
      version: '1.0.0',
      gitBranch: 'main',
      type: isUser ? 'user' : 'assistant',
      message: {
        role: isUser ? 'user' : 'assistant',
        content: isUser 
          ? `I need help with ${topic}. Can you assist me with implementation details?`
          : `Here's how to implement ${topic}: [detailed implementation with code examples and explanations that would be typical in a real conversation]`
      },
      uuid: `msg-${i}`,
      timestamp: new Date(Date.now() - (messageCount - i) * 60000).toISOString(),
      isMeta: false
    };

    messages.push(message);
  }

  return messages;
}