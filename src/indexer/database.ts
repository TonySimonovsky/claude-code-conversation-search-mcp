import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { IndexedMessage, SearchOptions, SearchResult } from '../types/index.js';

export class ConversationDatabase {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(process.env.HOME || process.env.USERPROFILE || '.', '.claude', 'conversation-search.db');
    
    try {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.db = new Database(this.dbPath);
      this.initialize();
    } catch (error) {
      throw new Error(`Failed to initialize database at ${this.dbPath}: ${(error as Error).message}`);
    }
  }

  private initialize() {
    // Create main messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        project_path TEXT NOT NULL,
        project_name TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        type TEXT NOT NULL,
        content TEXT,
        raw_content TEXT,
        tool_operations TEXT,
        message_uuid TEXT NOT NULL,
        parent_uuid TEXT,
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_path);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
    `);

    // Create FTS5 table for full-text search
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
        id UNINDEXED,
        searchable_text
      );

      -- Triggers to keep FTS index in sync
      CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
        INSERT INTO messages_fts(id, searchable_text)
        VALUES (new.id, new.content || ' ' || COALESCE(new.tool_operations, ''));
      END;

      CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
        DELETE FROM messages_fts WHERE id = old.id;
      END;

      CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
        DELETE FROM messages_fts WHERE id = old.id;
        INSERT INTO messages_fts(id, searchable_text)
        VALUES (new.id, new.content || ' ' || COALESCE(new.tool_operations, ''));
      END;
    `);

    // Create metadata table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS indexing_metadata (
        file_path TEXT PRIMARY KEY,
        last_indexed INTEGER NOT NULL,
        file_size INTEGER NOT NULL,
        message_count INTEGER NOT NULL
      );
    `);
  }

  insertMessage(message: IndexedMessage): void {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO messages (
          id, conversation_id, project_path, project_name,
          timestamp, type, content, raw_content,
          tool_operations, message_uuid, parent_uuid
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
      message.id,
      message.conversationId,
      message.projectPath,
      message.projectName,
      message.timestamp.getTime(),
      message.type,
      message.content,
      JSON.stringify(message.rawContent),
      message.toolOperations ? JSON.stringify(message.toolOperations) : null,
      message.messageUuid,
      message.parentUuid
    );
    } catch (error) {
      throw new Error(`Failed to insert message ${message.id}: ${(error as Error).message}`);
    }
  }

  search(options: SearchOptions): SearchResult[] {
    try {
      let query = `
        SELECT 
          m.*,
          snippet(messages_fts, 1, '<mark>', '</mark>', '...', 32) as highlight
        FROM messages m
        JOIN messages_fts ON m.id = messages_fts.id
        WHERE messages_fts MATCH ?
      `;

      const params: any[] = [options.query];

    // Add filters
    if (options.projectPath) {
      // Support partial matching for project path
      query += ' AND LOWER(m.project_path) LIKE ?';
      params.push(`%${options.projectPath.toLowerCase()}%`);
    }

    if (options.excludeProjectPath) {
      // Exclude projects matching this pattern
      query += ' AND LOWER(m.project_path) NOT LIKE ?';
      params.push(`%${options.excludeProjectPath.toLowerCase()}%`);
    }

    if (options.conversationId) {
      // Filter by specific conversation ID
      query += ' AND m.conversation_id = ?';
      params.push(options.conversationId);
    }

    if (options.excludeConversationId) {
      // Exclude specific conversation ID
      query += ' AND m.conversation_id != ?';
      params.push(options.excludeConversationId);
    }

    if (options.dateFrom) {
      query += ' AND m.timestamp >= ?';
      params.push(options.dateFrom.getTime());
    }

    if (options.dateTo) {
      query += ' AND m.timestamp <= ?';
      params.push(options.dateTo.getTime());
    }

    if (options.messageType) {
      query += ' AND m.type = ?';
      params.push(options.messageType);
    }

    query += ' ORDER BY rank, m.timestamp DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params);

      return rows.map(row => this.rowToSearchResult(row, options));
    } catch (error) {
      if (process.env.DEBUG === 'true') {
        // eslint-disable-next-line no-console
        console.error('[DATABASE] Search error:', error);
      }
      throw error; // Let the caller handle the error properly
    }
  }

  private rowToSearchResult(row: any, options: SearchOptions): SearchResult {
    const message: IndexedMessage = {
      id: row.id,
      conversationId: row.conversation_id,
      projectPath: row.project_path,
      projectName: row.project_name,
      timestamp: new Date(row.timestamp),
      type: row.type,
      content: row.content,
      rawContent: JSON.parse(row.raw_content),
      toolOperations: row.tool_operations ? JSON.parse(row.tool_operations) : undefined,
      searchableText: row.content,
      messageUuid: row.message_uuid,
      parentUuid: row.parent_uuid
    };

    const result: SearchResult = {
      message,
      score: 1, // SQLite FTS5 doesn't provide direct scores
      context: { before: [], after: [] },
      highlights: row.highlight ? [row.highlight] : [],
      conversationFile: `${row.project_path}/${row.conversation_id}.jsonl`
    };

    // Get context if requested
    if (options.includeContext) {
      const contextSize = options.contextSize || 2;
      result.context = this.getMessageContext(message, contextSize);
    }

    return result;
  }

  private getMessageContext(message: IndexedMessage, size: number): { before: IndexedMessage[]; after: IndexedMessage[] } {
    const beforeStmt = this.db.prepare(`
      SELECT * FROM messages
      WHERE conversation_id = ? AND timestamp < ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const afterStmt = this.db.prepare(`
      SELECT * FROM messages
      WHERE conversation_id = ? AND timestamp > ?
      ORDER BY timestamp ASC
      LIMIT ?
    `);

    const before = beforeStmt.all(message.conversationId, message.timestamp.getTime(), size);
    const after = afterStmt.all(message.conversationId, message.timestamp.getTime(), size);

    return {
      before: before.reverse().map(row => this.rowToIndexedMessage(row)),
      after: after.map(row => this.rowToIndexedMessage(row))
    };
  }

  private rowToIndexedMessage(row: any): IndexedMessage {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      projectPath: row.project_path,
      projectName: row.project_name,
      timestamp: new Date(row.timestamp),
      type: row.type,
      content: row.content,
      rawContent: JSON.parse(row.raw_content),
      toolOperations: row.tool_operations ? JSON.parse(row.tool_operations) : undefined,
      searchableText: row.content,
      messageUuid: row.message_uuid,
      parentUuid: row.parent_uuid
    };
  }

  getProjects(): { path: string; name: string; messageCount: number }[] {
    const stmt = this.db.prepare(`
      SELECT project_path, project_name, COUNT(*) as message_count
      FROM messages
      GROUP BY project_path, project_name
      ORDER BY project_name
    `);

    return stmt.all().map((row: any) => ({
      path: row.project_path,
      name: row.project_name,
      messageCount: row.message_count
    }));
  }

  updateIndexingMetadata(filePath: string, fileSize: number, messageCount: number): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO indexing_metadata (file_path, last_indexed, file_size, message_count)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(filePath, Date.now(), fileSize, messageCount);
  }

  isFileIndexed(filePath: string, fileSize: number): boolean {
    const stmt = this.db.prepare(`
      SELECT file_size FROM indexing_metadata
      WHERE file_path = ?
    `);

    const row = stmt.get(filePath) as { file_size: number } | undefined;
    return row !== undefined && row.file_size === fileSize;
  }

  clearProject(projectPath: string): void {
    const stmt = this.db.prepare('DELETE FROM messages WHERE project_path = ?');
    stmt.run(projectPath);
  }

  getConversationMessages(conversationId: string, limit: number, startFrom: number): IndexedMessage[] {
    let query: string;
    let params: any[];

    if (startFrom >= 0) {
      // Start from beginning or specific position
      query = `
        SELECT * FROM messages
        WHERE conversation_id = ?
        ORDER BY timestamp ASC
        LIMIT ? OFFSET ?
      `;
      params = [conversationId, limit, startFrom];
    } else {
      // Start from end (negative values)
      const offset = Math.abs(startFrom) - 1;
      query = `
        SELECT * FROM (
          SELECT * FROM messages
          WHERE conversation_id = ?
          ORDER BY timestamp DESC
          LIMIT ? OFFSET ?
        ) ORDER BY timestamp ASC
      `;
      params = [conversationId, limit, offset];
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);

    return rows.map(row => this.rowToIndexedMessage(row));
  }

  close(): void {
    this.db.close();
  }
}