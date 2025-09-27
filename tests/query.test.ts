import { QueryParser } from '../src/search/query.js';

describe('QueryParser', () => {
  let queryParser: QueryParser;

  beforeEach(() => {
    queryParser = new QueryParser();
  });

  describe('parseQuery', () => {
    it('should parse simple query', () => {
      const result = queryParser.parseQuery('hello world');

      expect(result.searchQuery).toBe('hello world');
      expect(result.filters).toEqual({});
    });

    it('should extract project filter with natural language', () => {
      const result = queryParser.parseQuery('search query in project my-project');

      expect(result.searchQuery).toContain('search query');
      expect(result.filters.projectPath).toBe('my-project');
    });

    it('should extract exclude project filter with natural language', () => {
      const result = queryParser.parseQuery('search query not in project excluded-project');

      expect(result.searchQuery).toContain('search query');
      expect(result.filters.excludeProjectPath).toBe('excluded-project');
    });

    it('should extract date filter for today', () => {
      const result = queryParser.parseQuery('search query today');

      expect(result.searchQuery).toContain('search query');
      expect(result.filters.dateFrom).toBeInstanceOf(Date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(result.filters.dateFrom?.getTime()).toBe(today.getTime());
    });

    it('should extract date filter for yesterday', () => {
      const result = queryParser.parseQuery('search query yesterday');

      expect(result.searchQuery).toContain('search query');
      expect(result.filters.dateFrom).toBeInstanceOf(Date);
      expect(result.filters.dateTo).toBeInstanceOf(Date);
    });

    it('should extract message type filter for commands', () => {
      const result = queryParser.parseQuery('search query bash command');

      expect(result.searchQuery).toBe('bash');
      expect(result.filters.messageType).toBe('tool_use');
    });

    it('should extract file creation pattern', () => {
      const result = queryParser.parseQuery('created file test.js');

      expect(result.searchQuery).toBe('write ""test.js""');
    });

    it('should extract file edit pattern', () => {
      const result = queryParser.parseQuery('edited file test.js');

      expect(result.searchQuery).toBe('edit ""test.js""');
    });

    it('should handle multiple natural language filters', () => {
      const result = queryParser.parseQuery('react components in project my-app today');

      expect(result.searchQuery).toContain('react components');
      expect(result.filters.projectPath).toBe('my-app');
      expect(result.filters.dateFrom).toBeInstanceOf(Date);
    });

    it('should clean stop words from query', () => {
      const result = queryParser.parseQuery('where did we discuss react components');

      // Stop words like "where", "did", "we" should be removed
      expect(result.searchQuery).not.toContain('where');
      expect(result.searchQuery).not.toContain('did');
      expect(result.searchQuery).not.toContain('we');
      expect(result.searchQuery).toContain('react components');
    });

    it('should preserve original query when no patterns match', () => {
      const result = queryParser.parseQuery('regular search query');

      expect(result.searchQuery).toBe('regular search query');
      expect(result.filters).toEqual({});
    });

    it('should handle empty query', () => {
      const result = queryParser.parseQuery('');

      expect(result.searchQuery).toBe('');
      expect(result.filters).toEqual({});
    });

    it('should detect UUIDs as conversation IDs', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = queryParser.parseQuery(`search in ${uuid}`);

      expect(result.filters.conversationId).toBe(uuid);
    });

    it('should build FTS query correctly', () => {
      const result = queryParser.buildFTSQuery('react components');

      expect(result).toBe('react AND components');
    });

    it('should handle single word FTS query', () => {
      const result = queryParser.buildFTSQuery('react');

      expect(result).toBe('react');
    });

    it('should handle empty FTS query', () => {
      const result = queryParser.buildFTSQuery('');

      expect(result).toBe('a OR the');
    });
  });
});