import { SearchOptions } from '../types';
export declare class QueryParser {
    parseQuery(input: string): {
        searchQuery: string;
        filters: Partial<SearchOptions>;
    };
    private cleanQuery;
    buildFTSQuery(searchQuery: string): string;
}
//# sourceMappingURL=query.d.ts.map