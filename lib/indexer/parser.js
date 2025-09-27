"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationParser = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
class ConversationParser {
    projectsPath;
    constructor(projectsPath = path.join(process.env.HOME, '.claude', 'projects')) {
        this.projectsPath = projectsPath;
    }
    async *getAllConversationFiles() {
        const projects = await fs.promises.readdir(this.projectsPath);
        for (const project of projects) {
            const projectPath = path.join(this.projectsPath, project);
            const stats = await fs.promises.stat(projectPath);
            if (stats.isDirectory()) {
                const files = await fs.promises.readdir(projectPath);
                const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
                for (const file of jsonlFiles) {
                    yield {
                        filePath: path.join(projectPath, file),
                        projectName: this.decodeProjectName(project)
                    };
                }
            }
        }
    }
    decodeProjectName(encodedName) {
        // Convert encoded project name back to readable path
        // Use the same intelligent decoding logic as result-formatter
        const decodedPath = this.intelligentDecode(encodedName);
        return decodedPath.replace(/^\//, ''); // Remove leading slash if present
    }
    intelligentDecode(encodedPath) {
        // Handle the leading -Users- pattern first
        let decodedPath = encodedPath.replace(/^-Users-/, '/Users/');
        // Apply specific pattern replacements in careful order (most specific first)
        const replacements = [
            // Handle full compound paths first
            [/-claude-mcp-servers-conversation-search$/gi, '/claude-mcp-servers/conversation-search'],
            // Specific domain patterns
            [/-ai-value-to-/gi, '/ai.value.to/'],
            // Common folder names with proper capitalization
            [/-dropbox-/gi, '/Dropbox/'],
            // Handle numbered folders: convert to path first, then handle spaces
            [/-(\d{2})-([a-z]+)-/gi, '/$1-$2/'], // Convert to path segment first
            // Convert remaining dashes to slashes
            [/-/g, '/'],
            // Now handle spaces in numbered folders after path conversion
            [/\/(\d{2})-([a-z]+)\//gi, '/$1 $2/'] // "04-clients" -> "04 clients" 
        ];
        // Apply replacements in order
        for (const [pattern, replacement] of replacements) {
            decodedPath = decodedPath.replace(pattern, replacement);
        }
        // Handle selective capitalization separately
        decodedPath = decodedPath.replace(/\/([a-z]+)\//gi, (match, word) => {
            // Only capitalize specific known folder names, not everything
            const shouldCapitalize = ['clients', 'dropbox'].includes(word.toLowerCase());
            return shouldCapitalize ? `/${word.charAt(0).toUpperCase() + word.slice(1)}/` : match;
        });
        // Clean up double slashes
        decodedPath = decodedPath.replace(/\/+/g, '/');
        return decodedPath;
    }
    async *parseConversationFile(filePath) {
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });
        for await (const line of rl) {
            if (line.trim()) {
                try {
                    const message = JSON.parse(line);
                    yield message;
                }
                catch (err) {
                    console.error(`Error parsing line in ${filePath}:`, err);
                }
            }
        }
    }
    async getSessionIdFromFile(filePath) {
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });
        for await (const line of rl) {
            if (line.trim()) {
                try {
                    const message = JSON.parse(line);
                    if (message.sessionId) {
                        rl.close();
                        return message.sessionId;
                    }
                }
                catch (err) {
                    console.error(`Error parsing first line in ${filePath}:`, err);
                }
            }
        }
        return null;
    }
    extractSearchableContent(message) {
        const parts = [];
        // Extract message content
        if (message.message) {
            if (typeof message.message.content === 'string') {
                parts.push(message.message.content);
            }
            else if (Array.isArray(message.message.content)) {
                for (const item of message.message.content) {
                    if (item.type === 'text' && item.text) {
                        parts.push(item.text);
                    }
                    else if (item.type === 'tool_use' && item.input) {
                        parts.push(JSON.stringify(item.input));
                    }
                }
            }
        }
        // Extract tool use results
        if (message.toolUseResult) {
            if (message.toolUseResult.stdout) {
                parts.push(message.toolUseResult.stdout);
            }
            if (message.toolUseResult.stderr) {
                parts.push(message.toolUseResult.stderr);
            }
            if (typeof message.toolUseResult === 'string') {
                parts.push(message.toolUseResult);
            }
        }
        return parts.join(' ').toLowerCase();
    }
    extractToolOperations(message) {
        const operations = [];
        if (message.message?.content && Array.isArray(message.message.content)) {
            for (const item of message.message.content) {
                if (item.type === 'tool_use') {
                    const op = {
                        type: item.name,
                        description: item.input?.description
                    };
                    // Extract file paths
                    if (item.input?.file_path) {
                        op.filePaths = [item.input.file_path];
                    }
                    else if (item.input?.path) {
                        op.filePaths = [item.input.path];
                    }
                    // Extract commands
                    if (item.input?.command) {
                        op.commands = [item.input.command];
                    }
                    operations.push(op);
                }
            }
        }
        return operations.length > 0 ? operations : undefined;
    }
    convertToIndexedMessage(message, conversationId, projectPath, projectName) {
        // Skip meta messages
        if (message.isMeta) {
            return null;
        }
        const searchableText = this.extractSearchableContent(message);
        const toolOperations = this.extractToolOperations(message);
        // Determine message type
        let messageType = message.type;
        if (message.toolUseResult) {
            messageType = 'tool_result';
        }
        else if (toolOperations && toolOperations.length > 0) {
            messageType = 'tool_use';
        }
        // Validate required fields
        if (!message.uuid) {
            return null; // Skip messages without UUID
        }
        // Validate timestamp
        const timestamp = message.timestamp ? new Date(message.timestamp) : new Date();
        if (isNaN(timestamp.getTime())) {
            return null; // Skip messages with invalid timestamps
        }
        return {
            id: `${conversationId}_${message.uuid}`,
            conversationId,
            projectPath,
            projectName,
            timestamp,
            type: messageType,
            content: searchableText.substring(0, 1000), // Truncate for display
            rawContent: message.message || message.toolUseResult,
            toolOperations,
            searchableText,
            messageUuid: message.uuid,
            parentUuid: message.parentUuid
        };
    }
}
exports.ConversationParser = ConversationParser;
//# sourceMappingURL=parser.js.map