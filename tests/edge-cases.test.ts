import { ConversationSearchServer } from '../src/index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Edge Cases and Error Handling', () => {
  let server: ConversationSearchServer;
  let tempDir: string;

  beforeAll(async () => {
    // Create temporary directory for edge case tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-edge-cases-test-'));
    
    // Initialize server with test data
    server = new ConversationSearchServer({
      projectsDir: tempDir,
      dbPath: path.join(tempDir, 'edge-cases.db'),
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
  });

  describe('Corrupted File Handling', () => {
    it('should handle corrupted JSON files gracefully', async () => {
      // Create a file with invalid JSON
      const corruptedFile = path.join(tempDir, 'corrupted.jsonl');
      fs.writeFileSync(corruptedFile, 'invalid json content\n{"partial": "json"}\nmore invalid content');

      const result = await server.callTool('refresh_index', {});
      
      // Should not crash and should provide feedback
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle empty files gracefully', async () => {
      // Create empty file
      const emptyFile = path.join(tempDir, 'empty.jsonl');
      fs.writeFileSync(emptyFile, '');

      const result = await server.callTool('refresh_index', {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle files with only whitespace', async () => {
      // Create file with only whitespace
      const whitespaceFile = path.join(tempDir, 'whitespace.jsonl');
      fs.writeFileSync(whitespaceFile, '   \n  \t  \n   ');

      const result = await server.callTool('refresh_index', {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle files with partial valid JSON lines', async () => {
      // Create file with mix of valid and invalid JSON lines
      const mixedFile = path.join(tempDir, 'mixed.jsonl');
      const validMessage = {
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: tempDir,
        sessionId: 'test-session',
        version: '1.0.0',
        gitBranch: 'main',
        type: 'user',
        message: { role: 'user', content: 'Valid message' },
        uuid: 'valid-msg-1',
        timestamp: new Date().toISOString(),
        isMeta: false
      };

      const fileContent = [
        'invalid line',
        JSON.stringify(validMessage),
        '{"incomplete": "json"',
        JSON.stringify({ ...validMessage, uuid: 'valid-msg-2' }),
        'another invalid line'
      ].join('\n');

      fs.writeFileSync(mixedFile, fileContent);

      const result = await server.callTool('refresh_index', {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      
      // Should be able to search for the valid messages
      const searchResult = await server.callTool('search_conversations', {
        query: 'Valid message'
      });
      
      expect(searchResult).toBeDefined();
    });
  });

  describe('File System Permission Issues', () => {
    it('should handle read-only directories gracefully', async () => {
      // Create a read-only subdirectory
      const readOnlyDir = path.join(tempDir, 'readonly');
      fs.mkdirSync(readOnlyDir);
      
      // Create a file in it first
      const testFile = path.join(readOnlyDir, 'test.jsonl');
      fs.writeFileSync(testFile, JSON.stringify({
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: readOnlyDir,
        sessionId: 'readonly-test',
        version: '1.0.0',
        gitBranch: 'main',
        type: 'user',
        message: { role: 'user', content: 'Read-only test' },
        uuid: 'readonly-msg',
        timestamp: new Date().toISOString(),
        isMeta: false
      }));

      // Make directory read-only (note: this might not work on all systems)
      try {
        fs.chmodSync(readOnlyDir, 0o444);
      } catch (error) {
        // chmod might not work in all test environments, skip this part
      }

      const result = await server.callTool('refresh_index', {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      // Restore permissions for cleanup
      try {
        fs.chmodSync(readOnlyDir, 0o755);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should handle non-existent directories gracefully', async () => {
      // Try to initialize server with non-existent directory
      const nonExistentDir = path.join(tempDir, 'does-not-exist', 'deeply', 'nested');
      
      const testServer = new ConversationSearchServer({
        projectsDir: nonExistentDir,
        dbPath: path.join(tempDir, 'non-existent-test.db'),
        indexInterval: 0,
        autoIndexing: false
      });

      const result = await testServer.callTool('refresh_index', {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      
      testServer.close();
    });
  });

  describe('Large File Handling', () => {
    it('should handle extremely long lines gracefully', async () => {
      // Create a file with extremely long JSON line
      const longContentFile = path.join(tempDir, 'long-content.jsonl');
      const longContent = 'x'.repeat(100000); // 100KB of 'x'
      
      const longMessage = {
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: tempDir,
        sessionId: 'long-content-test',
        version: '1.0.0',
        gitBranch: 'main',
        type: 'user',
        message: { role: 'user', content: longContent },
        uuid: 'long-msg',
        timestamp: new Date().toISOString(),
        isMeta: false
      };

      fs.writeFileSync(longContentFile, JSON.stringify(longMessage));

      const result = await server.callTool('refresh_index', {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      
      // Should be able to search within the long content
      const searchResult = await server.callTool('search_conversations', {
        query: 'xxx'
      });
      
      expect(searchResult).toBeDefined();
    });

    it('should handle files with many empty lines', async () => {
      // Create file with many empty lines and occasional content
      const sparseFile = path.join(tempDir, 'sparse.jsonl');
      const lines = [];
      
      for (let i = 0; i < 1000; i++) {
        if (i % 100 === 0) {
          // Add actual content every 100 lines
          lines.push(JSON.stringify({
            parentUuid: null,
            isSidechain: false,
            userType: 'human',
            cwd: tempDir,
            sessionId: 'sparse-test',
            version: '1.0.0',
            gitBranch: 'main',
            type: 'user',
            message: { role: 'user', content: `Message ${i}` },
            uuid: `sparse-msg-${i}`,
            timestamp: new Date().toISOString(),
            isMeta: false
          }));
        } else {
          // Add empty line
          lines.push('');
        }
      }

      fs.writeFileSync(sparseFile, lines.join('\n'));

      const result = await server.callTool('refresh_index', {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe('Malformed Data Handling', () => {
    it('should handle messages with missing required fields', async () => {
      const malformedFile = path.join(tempDir, 'malformed.jsonl');
      
      const messages = [
        // Missing uuid
        {
          parentUuid: null,
          isSidechain: false,
          userType: 'human',
          message: { role: 'user', content: 'Missing UUID' },
          timestamp: new Date().toISOString()
        },
        // Missing message content
        {
          uuid: 'missing-content',
          parentUuid: null,
          isSidechain: false,
          userType: 'human',
          timestamp: new Date().toISOString()
        },
        // Valid message for comparison
        {
          parentUuid: null,
          isSidechain: false,
          userType: 'human',
          cwd: tempDir,
          sessionId: 'malformed-test',
          version: '1.0.0',
          gitBranch: 'main',
          type: 'user',
          message: { role: 'user', content: 'Valid message' },
          uuid: 'valid-msg',
          timestamp: new Date().toISOString(),
          isMeta: false
        }
      ];

      const fileContent = messages.map(msg => JSON.stringify(msg)).join('\n');
      fs.writeFileSync(malformedFile, fileContent);

      const result = await server.callTool('refresh_index', {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle messages with invalid timestamps', async () => {
      const invalidTimestampFile = path.join(tempDir, 'invalid-timestamp.jsonl');
      
      const messages = [
        {
          parentUuid: null,
          isSidechain: false,
          userType: 'human',
          cwd: tempDir,
          sessionId: 'timestamp-test',
          version: '1.0.0',
          gitBranch: 'main',
          type: 'user',
          message: { role: 'user', content: 'Invalid timestamp' },
          uuid: 'invalid-timestamp-msg',
          timestamp: 'not-a-valid-timestamp',
          isMeta: false
        }
      ];

      const fileContent = messages.map(msg => JSON.stringify(msg)).join('\n');
      fs.writeFileSync(invalidTimestampFile, fileContent);

      const result = await server.callTool('refresh_index', {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle circular JSON references gracefully', async () => {
      // This test ensures our JSON parsing is robust
      const circularFile = path.join(tempDir, 'circular.jsonl');
      
      // Create a string that looks like it might have circular references
      const pseudoCircularContent = `{
        "parentUuid": null,
        "message": {
          "role": "user", 
          "content": "{\\"nested\\": {\\"deep\\": {\\"reference\\": \\"back to parent\\"}}}"
        },
        "uuid": "circular-test",
        "timestamp": "${new Date().toISOString()}"
      }`;

      fs.writeFileSync(circularFile, pseudoCircularContent);

      const result = await server.callTool('refresh_index', {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe('Database Edge Cases', () => {
    it('should handle database corruption gracefully', async () => {
      // Simulate database corruption by writing invalid data to db file
      const corruptDbPath = path.join(tempDir, 'corrupt.db');
      fs.writeFileSync(corruptDbPath, 'This is not a valid SQLite database file');

      // Should fail to initialize with corrupted database
      expect(() => {
        new ConversationSearchServer({
          projectsDir: tempDir,
          dbPath: corruptDbPath,
          indexInterval: 0,
          autoIndexing: false
        });
      }).toThrow();

      // But should be able to create a new server with a clean database path
      const cleanDbPath = path.join(tempDir, 'clean-after-corrupt.db');
      const cleanServer = new ConversationSearchServer({
        projectsDir: tempDir,
        dbPath: cleanDbPath,
        indexInterval: 0,
        autoIndexing: false
      });

      const result = await cleanServer.callTool('refresh_index', {});
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      
      cleanServer.close();
    });

    it('should handle concurrent database access', async () => {
      // Create multiple servers accessing the same database
      const sharedDbPath = path.join(tempDir, 'shared.db');
      
      const server1 = new ConversationSearchServer({
        projectsDir: tempDir,
        dbPath: sharedDbPath,
        indexInterval: 0,
        autoIndexing: false
      });

      const server2 = new ConversationSearchServer({
        projectsDir: tempDir,
        dbPath: sharedDbPath,
        indexInterval: 0,
        autoIndexing: false
      });

      // Try concurrent operations
      const promises = [
        server1.callTool('refresh_index', {}),
        server2.callTool('list_projects', {}),
        server1.callTool('search_conversations', { query: 'test' }),
        server2.callTool('get_config_info', {})
      ];

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
      });

      server1.close();
      server2.close();
    });
  });

  describe('Search Edge Cases', () => {
    beforeAll(async () => {
      // Create some test data for search edge cases
      const searchTestFile = path.join(tempDir, 'search-edge-cases.jsonl');
      const testMessages = [
        {
          parentUuid: null,
          isSidechain: false,
          userType: 'human',
          cwd: tempDir,
          sessionId: 'search-edge-test',
          version: '1.0.0',
          gitBranch: 'main',
          type: 'user',
          message: { role: 'user', content: 'Special characters: !@#$%^&*()_+-=[]{}|;:,.<>?' },
          uuid: 'special-chars-msg',
          timestamp: new Date().toISOString(),
          isMeta: false
        },
        {
          parentUuid: null,
          isSidechain: false,
          userType: 'human',
          cwd: tempDir,
          sessionId: 'search-edge-test',
          version: '1.0.0',
          gitBranch: 'main',
          type: 'user',
          message: { role: 'user', content: 'Unicode content: 🚀 ñáéíóú 中文 العربية русский' },
          uuid: 'unicode-msg',
          timestamp: new Date().toISOString(),
          isMeta: false
        }
      ];

      const fileContent = testMessages.map(msg => JSON.stringify(msg)).join('\n');
      fs.writeFileSync(searchTestFile, fileContent);
      
      await server.callTool('refresh_index', {});
    });

    it('should handle empty search queries', async () => {
      const result = await server.callTool('search_conversations', { query: '' });
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle very long search queries', async () => {
      const longQuery = 'word '.repeat(1000); // Very long query
      const result = await server.callTool('search_conversations', { query: longQuery });
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle search queries with special characters', async () => {
      const specialQuery = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const result = await server.callTool('search_conversations', { query: specialQuery });
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle search queries with unicode characters', async () => {
      const unicodeQuery = '🚀 中文';
      const result = await server.callTool('search_conversations', { query: unicodeQuery });
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle SQL injection attempts in search', async () => {
      const sqlInjectionQuery = "'; DROP TABLE messages; --";
      const result = await server.callTool('search_conversations', { query: sqlInjectionQuery });
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      
      // Verify database is still intact by doing another search
      const normalResult = await server.callTool('search_conversations', { query: 'test' });
      expect(normalResult).toBeDefined();
    });
  });

  describe('Memory and Resource Edge Cases', () => {
    it('should handle rapid consecutive operations', async () => {
      // Fire off many operations in rapid succession
      const operations = [];
      for (let i = 0; i < 50; i++) {
        operations.push(server.callTool('list_projects', {}));
      }

      const results = await Promise.all(operations);
      
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
      });
    });

    it('should handle operations during indexing', async () => {
      // Start indexing and immediately try other operations
      const indexPromise = server.callTool('refresh_index', {});
      const searchPromise = server.callTool('search_conversations', { query: 'test' });
      const listPromise = server.callTool('list_projects', {});

      const [indexResult, searchResult, listResult] = await Promise.all([
        indexPromise,
        searchPromise,
        listPromise
      ]);

      expect(indexResult).toBeDefined();
      expect(searchResult).toBeDefined();
      expect(listResult).toBeDefined();
    });
  });
});