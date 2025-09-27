import { SearchOptions } from '../types/index.js';
export declare class QueryParser {
    parseQuery(input: string): {
        searchQuery: string;
        filters: Partial<SearchOptions>;
    };
    private isUUID;
    private normalizeProjectPath;
    private cleanQuery;
    buildFTSQuery(searchQuery: string): string;
}
//# sourceMappingURL=query.d.ts.map