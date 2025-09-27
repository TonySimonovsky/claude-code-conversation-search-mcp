import { ConversationParser } from '../src/indexer/parser.js';
import { ConversationMessage } from '../src/types/index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ConversationParser', () => {
  let parser: ConversationParser;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parser-test-'));
    parser = new ConversationParser(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('parseConversationFile', () => {
    it('should parse valid conversation file', async () => {
      const testMessage: ConversationMessage = {
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test/project',
        sessionId: 'test-session',
        version: '1.0.0',
        gitBranch: 'main',
        type: 'user',
        message: {
          role: 'user',
          content: 'Hello, world!'
        },
        uuid: 'test-uuid-1',
        timestamp: new Date().toISOString(),
        isMeta: false
      };

      const testFile = path.join(tempDir, 'test.jsonl');
      fs.writeFileSync(testFile, JSON.stringify(testMessage) + '\n');

      const messages = [];
      for await (const message of parser.parseConversationFile(testFile)) {
        messages.push(message);
      }

      expect(messages).toHaveLength(1);
      expect(messages[0].uuid).toBe('test-uuid-1');
      expect(messages[0].type).toBe('user');
    });

    it('should handle malformed JSON gracefully', async () => {
      const testFile = path.join(tempDir, 'malformed.jsonl');
      fs.writeFileSync(testFile, 'invalid json\n{"valid": "json"}\n');

      const messages = [];
      for await (const message of parser.parseConversationFile(testFile)) {
        messages.push(message);
      }

      // Should skip malformed line and process valid one (but since valid line isn't a proper ConversationMessage, it will be ignored too)
      expect(messages).toHaveLength(1); // The valid JSON line is parsed
    });
  });

  describe('convertToIndexedMessage', () => {
    it('should convert user message correctly', () => {
      const message: ConversationMessage = {
        parentUuid: null,
        isSidechain: false,
        userType: 'human',
        cwd: '/test/project',
        sessionId: 'test-session',
        version: '1.0.0',
        gitBranch: 'main',
        type: 'user',
        message: {
          role: 'user',
          content: 'Test user message'
        },
        uuid: 'test-uuid-1',
        timestamp: new Date().toISOString(),
        isMeta: false
      };

      const indexed = parser.convertToIndexedMessage(message, 'conv-1', '/test/project', 'test-project');

      expect(indexed).toBeTruthy();
      expect(indexed!.id).toBe('conv-1_test-uuid-1');
      expect(indexed!.conversationId).toBe('conv-1');
      expect(indexed!.projectPath).toBe('/test/project');
      expect(indexed!.projectName).toBe('test-project');
      expect(indexed!.type).toBe('user');
      expect(indexed!.content).toBe('test user message');
    });

    it('should convert assistant message correctly', () => {
      const message: ConversationMessage = {
        parentUuid: 'parent-uuid',
        isSidechain: false,
        userType: 'assistant',
        cwd: '/test/project',
        sessionId: 'test-session',
        version: '1.0.0',
        gitBranch: 'main',
        type: 'assistant',
        message: {
          role: 'assistant',
          content: 'Test assistant response'
        },
        uuid: 'test-uuid-2',
        timestamp: new Date().toISOString(),
        isMeta: false
      };

      const indexed = parser.convertToIndexedMessage(message, 'conv-1', '/test/project', 'test-project');

      expect(indexed).toBeTruthy();
      expect(indexed!.type).toBe('assistant');
      expect(indexed!.content).toBe('test assistant response');
      expect(indexed!.parentUuid).toBe('parent-uuid');
    });

    it('should handle tool use results', () => {
      const message: ConversationMessage = {
        parentUuid: null,
        isSidechain: false,
        userType: 'assistant',
        cwd: '/test/project',
        sessionId: 'test-session',
        version: '1.0.0',
        gitBranch: 'main',
        type: 'assistant',
        toolUseResult: {
          stdout: 'Tool output',
          stderr: 'Error output'
        },
        uuid: 'test-uuid-3',
        timestamp: new Date().toISOString(),
        isMeta: false
      };

      const indexed = parser.convertToIndexedMessage(message, 'conv-1', '/test/project', 'test-project');

      expect(indexed).toBeTruthy();
      expect(indexed!.type).toBe('tool_result');
      expect(indexed!.searchableText).toContain('tool output');
      expect(indexed!.searchableText).toContain('error output');
    });

    it('should return null for meta messages', () => {
      const message: ConversationMessage = {
        parentUuid: null,
        isSidechain: false,
        userType: 'assistant',
        cwd: '/test/project',
        sessionId: 'test-session',
        version: '1.0.0',
        gitBranch: 'main',
        type: 'assistant',
        uuid: 'test-uuid-4',
        timestamp: new Date().toISOString(),
        isMeta: true
      };

      const indexed = parser.convertToIndexedMessage(message, 'conv-1', '/test/project', 'test-project');

      expect(indexed).toBeNull();
    });
  });

  describe('getSessionIdFromFile', () => {
    it('should extract session ID from file', async () => {
      const testMessage = {
        sessionId: 'extracted-session-id',
        uuid: 'test-uuid'
      };

      const testFile = path.join(tempDir, 'session-test.jsonl');
      fs.writeFileSync(testFile, JSON.stringify(testMessage) + '\n');

      const sessionId = await parser.getSessionIdFromFile(testFile);

      expect(sessionId).toBe('extracted-session-id');
    });

    it('should return null if no session ID found', async () => {
      const testFile = path.join(tempDir, 'no-session.jsonl');
      fs.writeFileSync(testFile, '{"uuid": "test"}\n');

      const sessionId = await parser.getSessionIdFromFile(testFile);

      expect(sessionId).toBeNull();
    });
  });
});