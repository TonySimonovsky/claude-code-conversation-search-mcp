import * as fs from 'fs';
import * as path from 'path';
import { ConversationParser } from './parser.js';
import { ConversationDatabase } from './database.js';
export class ConversationIndexer {
    parser;
    db;
    isIndexing = false;
    constructor(projectsPath, dbPath) {
        this.parser = new ConversationParser(projectsPath);
        this.db = new ConversationDatabase(dbPath);
    }
    async indexAll(progressCallback) {
        if (this.isIndexing) {
            throw new Error('Indexing is already in progress. Please wait for the current operation to complete.');
        }
        this.isIndexing = true;
        let filesIndexed = 0;
        let totalMessagesIndexed = 0;
        try {
            progressCallback?.('Starting indexing process...');
            for await (const { filePath, projectName } of this.parser.getAllConversationFiles()) {
                try {
                    const stats = await fs.promises.stat(filePath);
                    // Skip if already indexed and unchanged
                    if (this.db.isFileIndexed(filePath, stats.size)) {
                        progressCallback?.(`Skipping ${path.basename(filePath)} (already indexed)`);
                        continue;
                    }
                    progressCallback?.(`Indexing ${projectName}/${path.basename(filePath)}...`);
                    const sessionId = await this.parser.getSessionIdFromFile(filePath);
                    const conversationId = sessionId || path.basename(filePath, '.jsonl');
                    const projectPath = path.dirname(filePath);
                    let messageCount = 0;
                    for await (const message of this.parser.parseConversationFile(filePath)) {
                        // Use the actual project path from the message cwd if available, fallback to filesystem path
                        const actualProjectPath = (message.cwd && message.cwd.trim()) ? message.cwd : projectPath;
                        const actualProjectName = path.basename(actualProjectPath);
                        const indexedMessage = this.parser.convertToIndexedMessage(message, conversationId, actualProjectPath, actualProjectName);
                        if (indexedMessage) {
                            this.db.insertMessage(indexedMessage);
                            messageCount++;
                            totalMessagesIndexed++;
                        }
                    }
                    this.db.updateIndexingMetadata(filePath, stats.size, messageCount);
                    filesIndexed++;
                    progressCallback?.(`Indexed ${messageCount} messages from ${path.basename(filePath)}`);
                }
                catch (fileError) {
                    progressCallback?.(`⚠️ Failed to index ${path.basename(filePath)}: ${fileError.message}`);
                    // Continue with other files
                }
            }
            progressCallback?.(`Indexing complete! Indexed ${totalMessagesIndexed} messages from ${filesIndexed} files`);
        }
        catch (error) {
            progressCallback?.(`❌ Indexing failed: ${error.message}`);
            throw error;
        }
        finally {
            this.isIndexing = false;
        }
        return { filesIndexed, messagesIndexed: totalMessagesIndexed };
    }
    async indexFile(filePath) {
        try {
            const stats = await fs.promises.stat(filePath);
            if (this.db.isFileIndexed(filePath, stats.size)) {
                return 0;
            }
            const sessionId = await this.parser.getSessionIdFromFile(filePath);
            const conversationId = sessionId || path.basename(filePath, '.jsonl');
            const projectPath = path.dirname(filePath);
            let messageCount = 0;
            for await (const message of this.parser.parseConversationFile(filePath)) {
                // Use the actual project path from the message cwd if available, fallback to filesystem path
                const actualProjectPath = (message.cwd && message.cwd.trim()) ? message.cwd : projectPath;
                const actualProjectName = path.basename(actualProjectPath);
                const indexedMessage = this.parser.convertToIndexedMessage(message, conversationId, actualProjectPath, actualProjectName);
                if (indexedMessage) {
                    this.db.insertMessage(indexedMessage);
                    messageCount++;
                }
            }
            this.db.updateIndexingMetadata(filePath, stats.size, messageCount);
            return messageCount;
        }
        catch (error) {
            throw new Error(`Failed to index file ${filePath}: ${error.message}`);
        }
    }
    getDatabase() {
        return this.db;
    }
    close() {
        this.db.close();
    }
}
//# sourceMappingURL=indexer.js.map