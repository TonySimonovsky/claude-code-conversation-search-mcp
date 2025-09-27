export interface ConversationMessage {
    parentUuid: string | null;
    isSidechain: boolean;
    userType: string;
    cwd: string;
    sessionId: string;
    version: string;
    gitBranch: string;
    type: 'user' | 'assistant';
    message?: {
        role: string;
        content: unknown;
        id?: string;
        type?: string;
        model?: string;
    };
    toolUseResult?: unknown;
    uuid: string;
    timestamp: string;
    isMeta?: boolean;
}
export interface IndexedMessage {
    id: string;
    conversationId: string;
    projectPath: string;
    projectName: string;
    timestamp: Date;
    type: 'user' | 'assistant' | 'tool_use' | 'tool_result';
    content: string;
    rawContent: unknown;
    toolOperations?: {
        type: string;
        filePaths?: string[];
        commands?: string[];
        description?: string;
    }[];
    searchableText: string;
    messageUuid: string;
    parentUuid: string | null;
}
export interface SearchResult {
    message: IndexedMessage;
    score: number;
    context: {
        before: IndexedMessage[];
        after: IndexedMessage[];
    };
    highlights: string[];
    conversationFile: string;
}
export interface SearchOptions {
    query: string;
    limit?: number;
    offset?: number;
    projectPath?: string;
    excludeProjectPath?: string;
    conversationId?: string;
    excludeConversationId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    messageType?: string;
    includeContext?: boolean;
    contextSize?: number;
}
//# sourceMappingURL=index.d.ts.map