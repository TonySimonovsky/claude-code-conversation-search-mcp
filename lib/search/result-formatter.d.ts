import { SearchResult } from '../types';
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
    formatSearchResults(results: SearchResult[], limit?: number): {
        conversations: ConversationResult[];
        totalMatches: number;
        totalConversations: number;
    };
    private deduplicateMessages;
    private truncateContent;
}
//# sourceMappingURL=result-formatter.d.ts.map