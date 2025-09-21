import { ConversationMessage, IndexedMessage } from '../types';
export declare class ConversationParser {
    private projectsPath;
    constructor(projectsPath?: string);
    getAllConversationFiles(): AsyncGenerator<{
        filePath: string;
        projectName: string;
    }>;
    private decodeProjectName;
    parseConversationFile(filePath: string): AsyncGenerator<ConversationMessage>;
    getSessionIdFromFile(filePath: string): Promise<string | null>;
    extractSearchableContent(message: ConversationMessage): string;
    extractToolOperations(message: ConversationMessage): IndexedMessage['toolOperations'];
    convertToIndexedMessage(message: ConversationMessage, conversationId: string, projectPath: string, projectName: string): IndexedMessage | null;
}
//# sourceMappingURL=parser.d.ts.map