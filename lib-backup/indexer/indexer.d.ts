import { ConversationDatabase } from './database';
export declare class ConversationIndexer {
    private parser;
    private db;
    private isIndexing;
    constructor(projectsPath?: string, dbPath?: string);
    indexAll(progressCallback?: (message: string) => void): Promise<{
        filesIndexed: number;
        messagesIndexed: number;
    }>;
    indexFile(filePath: string): Promise<number>;
    getDatabase(): ConversationDatabase;
    close(): void;
}
//# sourceMappingURL=indexer.d.ts.map