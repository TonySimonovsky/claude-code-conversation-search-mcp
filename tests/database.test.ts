import { ConversationDatabase } from '../src/indexer/database.js';
import { IndexedMessage, SearchOptions } from '../src/types/index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ConversationDatabase', () => {
  let db: ConversationDatabase;
  let tempDbPath: string;

  beforeEach(() => {
    tempDbPath = path.join(os.tmpdir(), `test-db-${Date.now()}.sqlite`);
    db = new ConversationDatabase(tempDbPath);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });

  describe('insertMessage', () => {
    it('should insert a message successfully', () => {
      const message: IndexedMessage = {
        id: 'test-id-1',
        conversationId: 'conv-1',
        projectPath: '/test/project',
        projectName: 'test-project',
        timestamp: new Date(),
        type: 'user',
        content: 'Test message content',
        rawContent: { test: 'data' },
        searchableText: 'test message content',
        messageUuid: 'uuid-1',
        parentUuid: null
      };

      expect(() => db.insertMessage(message)).not.toThrow();
    });

    it('should handle duplicate IDs gracefully', () => {
      const message: IndexedMessage = {
        id: 'duplicate-id',
        conversationId: 'conv-1',
        projectPath: '/test/project',
        projectName: 'test-project',
        timestamp: new Date(),
        type: 'user',
        content: 'First message',
        rawContent: {},
        searchableText: 'first message',
        messageUuid: 'uuid-1',
        parentUuid: null
      };

      db.insertMessage(message);
      
      // Insert duplicate should not throw
      message.content = 'Second message';
      expect(() => db.insertMessage(message)).not.toThrow();
    });
  });

  describe('search', () => {
    beforeEach(() => {
      // Insert test data
      const messages: IndexedMessage[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          projectPath: '/test/project1',
          projectName: 'project1',
          timestamp: new Date('2024-01-01'),
          type: 'user',
          content: 'How to create a React component?',
          rawContent: {},
          searchableText: 'how to create a react component',
          messageUuid: 'uuid-1',
          parentUuid: null
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          projectPath: '/test/project1',
          projectName: 'project1',
          timestamp: new Date('2024-01-02'),
          type: 'assistant',
          content: 'You can create a React component using function syntax',
          rawContent: {},
          searchableText: 'you can create a react component using function syntax',
          messageUuid: 'uuid-2',
          parentUuid: 'uuid-1'
        },
        {
          id: 'msg-3',
          conversationId: 'conv-2',
          projectPath: '/test/project2',
          projectName: 'project2',
          timestamp: new Date('2024-01-03'),
          type: 'user',
          content: 'Debug TypeScript error',
          rawContent: {},
          searchableText: 'debug typescript error',
          messageUuid: 'uuid-3',
          parentUuid: null
        }
      ];

      messages.forEach(msg => db.insertMessage(msg));
    });

    it('should find messages by query', () => {
      const options: SearchOptions = {
        query: 'React component',
        limit: 10
      };

      const results = db.search(options);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.message.content.includes('React'))).toBe(true);
    });

    it('should respect limit parameter', () => {
      const options: SearchOptions = {
        query: 'React',
        limit: 1
      };

      const results = db.search(options);

      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should filter by project path', () => {
      const options: SearchOptions = {
        query: 'project',
        projectPath: '/test/project1',
        limit: 10
      };

      const results = db.search(options);

      results.forEach(result => {
        expect(result.message.projectPath).toBe('/test/project1');
      });
    });

    it('should filter by conversation ID', () => {
      const options: SearchOptions = {
        query: 'React',
        conversationId: 'conv-1',
        limit: 10
      };

      const results = db.search(options);

      results.forEach(result => {
        expect(result.message.conversationId).toBe('conv-1');
      });
    });

    it('should filter by date range', () => {
      const options: SearchOptions = {
        query: 'project',
        dateFrom: new Date('2024-01-02'),
        dateTo: new Date('2024-01-03'),
        limit: 10
      };

      const results = db.search(options);

      results.forEach(result => {
        expect(result.message.timestamp.getTime()).toBeGreaterThanOrEqual(new Date('2024-01-02').getTime());
        expect(result.message.timestamp.getTime()).toBeLessThanOrEqual(new Date('2024-01-03').getTime());
      });
    });
  });

  describe('getProjects', () => {
    it('should return project statistics', () => {
      const message: IndexedMessage = {
        id: 'test-id',
        conversationId: 'conv-1',
        projectPath: '/test/project',
        projectName: 'test-project',
        timestamp: new Date(),
        type: 'user',
        content: 'Test content',
        rawContent: {},
        searchableText: 'test content',
        messageUuid: 'uuid-1',
        parentUuid: null
      };

      db.insertMessage(message);

      const projects = db.getProjects();

      expect(projects.length).toBeGreaterThan(0);
      expect(projects[0].name).toBe('test-project');
      expect(projects[0].messageCount).toBeGreaterThan(0);
    });
  });

  describe('isFileIndexed', () => {
    it('should return false for new file', () => {
      const result = db.isFileIndexed('/new/file.jsonl', 1000);
      expect(result).toBe(false);
    });

    it('should return true for already indexed file with same size', () => {
      db.updateIndexingMetadata('/test/file.jsonl', 1000, 5);
      
      const result = db.isFileIndexed('/test/file.jsonl', 1000);
      expect(result).toBe(true);
    });

    it('should return false for indexed file with different size', () => {
      db.updateIndexingMetadata('/test/file.jsonl', 1000, 5);
      
      const result = db.isFileIndexed('/test/file.jsonl', 2000);
      expect(result).toBe(false);
    });
  });

  describe('getConversationMessages', () => {
    beforeEach(() => {
      // Insert test messages
      const messages: IndexedMessage[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          projectPath: '/test/project',
          projectName: 'project',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          type: 'user',
          content: 'First message',
          rawContent: {},
          searchableText: 'first message',
          messageUuid: 'uuid-1',
          parentUuid: null
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          projectPath: '/test/project',
          projectName: 'project',
          timestamp: new Date('2024-01-01T10:01:00Z'),
          type: 'assistant',
          content: 'Second message',
          rawContent: {},
          searchableText: 'second message',
          messageUuid: 'uuid-2',
          parentUuid: 'uuid-1'
        }
      ];

      messages.forEach(msg => db.insertMessage(msg));
    });

    it('should return messages from conversation', () => {
      const messages = db.getConversationMessages('conv-1', 10, 0);

      expect(messages.length).toBe(2);
      expect(messages[0].content).toBe('First message');
      expect(messages[1].content).toBe('Second message');
    });

    it('should respect limit parameter', () => {
      const messages = db.getConversationMessages('conv-1', 1, 0);

      expect(messages.length).toBe(1);
    });

    it('should return empty array for non-existent conversation', () => {
      const messages = db.getConversationMessages('non-existent', 10, 0);

      expect(messages).toEqual([]);
    });
  });
});