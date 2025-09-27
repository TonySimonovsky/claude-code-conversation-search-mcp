import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { ConversationMessage, IndexedMessage } from '../types';

export class ConversationParser {
  private projectsPath: string;

  constructor(projectsPath: string = path.join(process.env.HOME!, '.claude', 'projects')) {
    this.projectsPath = projectsPath;
  }

  async *getAllConversationFiles(): AsyncGenerator<{ filePath: string; projectName: string }> {
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

  private decodeProjectName(encodedName: string): string {
    // Convert encoded project name back to readable path
    // Use the same intelligent decoding logic as result-formatter
    const decodedPath = this.intelligentDecode(encodedName);
    return decodedPath.replace(/^\//, ''); // Remove leading slash if present
  }
  
  private intelligentDecode(encodedPath: string): string {
    // Handle the leading -Users- pattern first
    let decodedPath = encodedPath.replace(/^-Users-/, '/Users/');
    
    // Apply specific pattern replacements in careful order (most specific first)
    const replacements: Array<[RegExp, string]> = [
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
    decodedPath = decodedPath.replace(/\/([a-z]+)\//gi, (match: string, word: string) => {
      // Only capitalize specific known folder names, not everything
      const shouldCapitalize = ['clients', 'dropbox'].includes(word.toLowerCase());
      return shouldCapitalize ? `/${word.charAt(0).toUpperCase() + word.slice(1)}/` : match;
    });
    
    // Clean up double slashes
    decodedPath = decodedPath.replace(/\/+/g, '/');
    
    return decodedPath;
  }

  async *parseConversationFile(filePath: string): AsyncGenerator<ConversationMessage> {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line) as ConversationMessage;
          yield message;
        } catch (err) {
          console.error(`Error parsing line in ${filePath}:`, err);
        }
      }
    }
  }

  async getSessionIdFromFile(filePath: string): Promise<string | null> {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line) as ConversationMessage;
          if (message.sessionId) {
            rl.close();
            return message.sessionId;
          }
        } catch (err) {
          console.error(`Error parsing first line in ${filePath}:`, err);
        }
      }
    }
    return null;
  }

  extractSearchableContent(message: ConversationMessage): string {
    const parts: string[] = [];

    // Extract message content
    if (message.message) {
      if (typeof message.message.content === 'string') {
        parts.push(message.message.content);
      } else if (Array.isArray(message.message.content)) {
        for (const item of message.message.content) {
          if (item.type === 'text' && item.text) {
            parts.push(item.text);
          } else if (item.type === 'tool_use' && item.input) {
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

  extractToolOperations(message: ConversationMessage): IndexedMessage['toolOperations'] {
    const operations: IndexedMessage['toolOperations'] = [];

    if (message.message?.content && Array.isArray(message.message.content)) {
      for (const item of message.message.content) {
        if (item.type === 'tool_use') {
          const op: any = {
            type: item.name,
            description: item.input?.description
          };

          // Extract file paths
          if (item.input?.file_path) {
            op.filePaths = [item.input.file_path];
          } else if (item.input?.path) {
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

  convertToIndexedMessage(
    message: ConversationMessage,
    conversationId: string,
    projectPath: string,
    projectName: string
  ): IndexedMessage | null {
    // Skip meta messages
    if (message.isMeta) {
      return null;
    }

    const searchableText = this.extractSearchableContent(message);
    const toolOperations = this.extractToolOperations(message);

    // Determine message type
    let messageType: IndexedMessage['type'] = message.type as any;
    if (message.toolUseResult) {
      messageType = 'tool_result';
    } else if (toolOperations && toolOperations.length > 0) {
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