export declare class ConversationSearchError extends Error {
    readonly code: string;
    readonly userMessage: string;
    readonly cause?: Error | undefined;
    constructor(code: string, message: string, userMessage: string, cause?: Error | undefined);
}
export declare class DatabaseError extends ConversationSearchError {
    constructor(message: string, cause?: Error);
}
export declare class FileAccessError extends ConversationSearchError {
    constructor(filePath: string, cause?: Error);
}
export declare class ParsingError extends ConversationSearchError {
    constructor(filePath: string, lineNumber?: number, cause?: Error);
}
export declare class ConfigurationError extends ConversationSearchError {
    constructor(setting: string, cause?: Error);
}
export declare class SearchError extends ConversationSearchError {
    constructor(query: string, cause?: Error);
}
export declare class IndexingError extends ConversationSearchError {
    constructor(message: string, cause?: Error);
}
export declare function createUserFriendlyError(error: unknown, fallbackMessage?: string): ConversationSearchError;
export declare function getErrorResponse(error: unknown, context: string): {
    isError: true;
    content: [{
        type: 'text';
        text: string;
    }];
};
//# sourceMappingURL=errors.d.ts.map