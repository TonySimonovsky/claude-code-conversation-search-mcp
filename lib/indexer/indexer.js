"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationIndexer = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const parser_1 = require("./parser");
const database_1 = require("./database");
class ConversationIndexer {
    parser;
    db;
    isIndexing = false;
    constructor(projectsPath, dbPath) {
        this.parser = new parser_1.ConversationParser(projectsPath);
        this.db = new database_1.ConversationDatabase(dbPath);
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
            const projectName = path.basename(projectPath);
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
exports.ConversationIndexer = ConversationIndexer;
//# sourceMappingURL=indexer.js.map