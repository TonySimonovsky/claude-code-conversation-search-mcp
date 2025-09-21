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

export class ResultFormatter {
  formatSearchResults(results: SearchResult[], limit: number = 10): {
    conversations: ConversationResult[];
    totalMatches: number;
    totalConversations: number;
  } {
    // Group results by conversation ID
    const conversationMap = new Map<string, SearchResult[]>();
    
    results.forEach(result => {
      const convId = result.message.conversationId;
      if (!conversationMap.has(convId)) {
        conversationMap.set(convId, []);
      }
      conversationMap.get(convId)!.push(result);
    });

    // Format each conversation group
    const conversations: ConversationResult[] = [];
    
    for (const [convId, convResults] of conversationMap.entries()) {
      // Sort messages within conversation by timestamp
      convResults.sort((a, b) => a.message.timestamp.getTime() - b.message.timestamp.getTime());
      
      const firstResult = convResults[0];
      const projectPath = this.decodeProjectPath(firstResult.message.projectPath);
      
      // Get unique messages (deduplicate by content hash)
      const uniqueMessages = this.deduplicateMessages(convResults);
      
      conversations.push({
        conversationId: convId,
        projectPath: projectPath,
        projectName: firstResult.message.projectName,
        resumeCommand: `cd '${projectPath}' && claude --resume ${convId}`,
        messages: uniqueMessages.slice(0, 5).map(result => ({
          timestamp: result.message.timestamp.toISOString(),
          type: result.message.type,
          content: this.truncateContent(result.message.content, 300),
          highlight: result.highlights ? result.highlights[0] : undefined
        }))
      });
    }
    
    // Sort conversations by number of matches (more matches = more relevant)
    conversations.sort((a, b) => b.messages.length - a.messages.length);
    
    // Limit conversations
    const limitedConversations = conversations.slice(0, limit);
    
    return {
      conversations: limitedConversations,
      totalMatches: results.length,
      totalConversations: conversations.length
    };
  }
  
  private deduplicateMessages(results: SearchResult[]): SearchResult[] {
    const seen = new Map<string, SearchResult>();
    
    results.forEach(result => {
      // Create a hash key from content and type
      const key = `${result.message.type}:${result.message.content.substring(0, 100)}`;
      
      // Keep the first occurrence or the one with better highlights
      if (!seen.has(key) || (result.highlights && !seen.get(key)?.highlights)) {
        seen.set(key, result);
      }
    });
    
    return Array.from(seen.values());
  }
  
  private decodeProjectPath(encodedPath: string): string {
    // First, handle the encoded format from the database
    const decodedPath = encodedPath
      .replace(/^-Users-/, '/Users/')
      .replace(/-/g, '/')
      .toLowerCase();
    
    // Clean up any double slashes or artifacts
    return decodedPath.replace(/\/+/g, '/');
  }
  
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  }
}