import { SearchResult } from '../types/index.js';
export interface ConversationResult {
    conversationId: string;
    projectPath: string;
    projectName: string;
    resumeCommand: string;
    messages: {
        timestamp: string;
        type: string;
        content: string;
        highlight?: string;
    }[];
}
export declare class ResultFormatter {
    private shortcutManager;
    constructor();
    formatSearchResults(results: SearchResult[], limit?: number): Promise<{
        conversations: ConversationResult[];
        totalMatches: number;
        totalConversations: number;
    }>;
    private deduplicateMessages;
    private truncateContent;
}
//# sourceMappingURL=result-formatter.d.ts.map