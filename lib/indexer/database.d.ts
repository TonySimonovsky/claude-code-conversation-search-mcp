import { IndexedMessage, SearchOptions, SearchResult } from '../types';
export declare class ConversationDatabase {
    private db;
    private dbPath;
    constructor(dbPath?: string);
    private initialize;
    insertMessage(message: IndexedMessage): void;
    search(options: SearchOptions): SearchResult[];
    private rowToSearchResult;
    private getMessageContext;
    private rowToIndexedMessage;
    getProjects(): {
        path: string;
        name: string;
        messageCount: number;
    }[];
    updateIndexingMetadata(filePath: string, fileSize: number, messageCount: number): void;
    isFileIndexed(filePath: string, fileSize: number): boolean;
    clearProject(projectPath: string): void;
    getConversationMessages(conversationId: string, limit: number, startFrom: number): IndexedMessage[];
    close(): void;
}
//# sourceMappingURL=database.d.ts.map