import { SearchResult } from '../types';
export interface FormattedSearchResult {
    conversationId: string;
    projectPath: string;
    projectName: string;
    date: string;
    summary: string;
    resumeCommand: string;
    messageCount: number;
    firstMatch: {
        type: string;
        content: string;
        timestamp: string;
    };
}
export declare class ResultFormatter {
    formatSearchResults(results: SearchResult[], limit?: number): {
        formattedResults: FormattedSearchResult[];
        rawResults: SearchResult[];
        totalMatches: number;
    };
    private decodeProjectPath;
    private createConversationSummary;
}
//# sourceMappingURL=result-formatter.d.ts.map