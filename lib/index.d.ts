#!/usr/bin/env node
import { Tool } from '@modelcontextprotocol/sdk/types.js';
interface ServerConfig {
    dbPath?: string;
    dbBackupEnabled?: boolean;
    dbBackupInterval?: number;
    projectsDir?: string;
    indexInterval?: number;
    autoIndexing?: boolean;
    fullTextMinLength?: number;
    indexBatchSize?: number;
    maxResults?: number;
    defaultContextSize?: number;
    searchTimeout?: number;
    maxMemoryMB?: number;
    cacheSize?: number;
    debug?: boolean;
    logLevel?: string;
    logToFile?: boolean;
    logFilePath?: string;
    allowedFileExtensions?: string[];
    maxFileSize?: number;
    indexThreads?: number;
}
export declare class ConversationSearchServer {
    private server;
    private indexer;
    private queryParser;
    private resultFormatter;
    private config;
    private indexingTimer?;
    constructor(testConfig?: Partial<ServerConfig>);
    private loadConfig;
    private validateConfig;
    private resolveHome;
    private setupLogging;
    private log;
    private logError;
    private startBackgroundIndexing;
    private performIncrementalIndex;
    private setupHandlers;
    getTools(): Tool[];
    callTool(name: string, args: any): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    close(): void;
    private searchConversations;
    private generateSummary;
    private listProjects;
    private getMessageContext;
    private getConversationMessages;
    private listTools;
    private getConfigInfo;
    private getServerInfo;
    private refreshIndex;
    run(): Promise<void>;
    shutdown(): void;
}
export {};
//# sourceMappingURL=index.d.ts.map