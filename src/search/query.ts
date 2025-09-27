import { SearchOptions } from '../types';

export class QueryParser {
  parseQuery(input: string): { searchQuery: string; filters: Partial<SearchOptions> } {
    let searchQuery = input;
    const filters: Partial<SearchOptions> = {};

    // Extract file operations
    const fileCreateMatch = input.match(/(?:created?|new|wrote?)\s+(?:file\s+)?([^\s]+\.[\w]+)/i);
    const fileEditMatch = input.match(/(?:edited?|modified?|changed?|updated?)\s+(?:file\s+)?([^\s]+\.[\w]+)/i);
    
    if (fileCreateMatch) {
      searchQuery = `Write "${fileCreateMatch[1]}"`;
    } else if (fileEditMatch) {
      searchQuery = `Edit "${fileEditMatch[1]}"`;
    }

    // Extract project exclusion filter FIRST (to avoid conflict with "in")
    // Matches: "not in project X", "not in X", "exclude project X", "except X"
    const excludeProjectMatch = input.match(/(?:not\s+in|exclude|except)\s+(?:project\s+)?([a-z0-9-]+)/i);
    if (excludeProjectMatch) {
      const projectRef = excludeProjectMatch[1];
      
      // Check if it's a UUID (conversation ID)
      if (this.isUUID(projectRef)) {
        filters.excludeConversationId = projectRef;
      } else {
        // It's a project name/path
        filters.excludeProjectPath = this.normalizeProjectPath(projectRef);
      }
      searchQuery = searchQuery.replace(excludeProjectMatch[0], '').trim();
    }

    // Extract project filter (inclusion) - check this AFTER exclusion
    // Matches: "in project X", "in X project", "from project X", etc.
    const projectMatch = input.match(/(?:in|from)\s+(?:project\s+)?([a-z0-9-]+)(?:\s+project)?/i);
    if (projectMatch && !excludeProjectMatch) { // Only if we didn't already match an exclusion
      const projectRef = projectMatch[1];
      
      // Check if it's a UUID (conversation ID)
      if (this.isUUID(projectRef)) {
        filters.conversationId = projectRef;
      } else {
        // It's a project name/path - could be partial
        filters.projectPath = this.normalizeProjectPath(projectRef);
      }
      searchQuery = searchQuery.replace(projectMatch[0], '').trim();
    }

    // Extract date filters
    const todayMatch = input.match(/\btoday\b/i);
    const yesterdayMatch = input.match(/\byesterday\b/i);
    const lastWeekMatch = input.match(/\blast\s+week\b/i);
    
    if (todayMatch) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filters.dateFrom = today;
      searchQuery = searchQuery.replace(todayMatch[0], '').trim();
    } else if (yesterdayMatch) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      filters.dateFrom = yesterday;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filters.dateTo = today;
      searchQuery = searchQuery.replace(yesterdayMatch[0], '').trim();
    } else if (lastWeekMatch) {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      filters.dateFrom = lastWeek;
      searchQuery = searchQuery.replace(lastWeekMatch[0], '').trim();
    }

    // Extract message type filter
    const errorMatch = input.match(/\berror\b/i);
    const commandMatch = input.match(/\b(?:command|bash|terminal)\b/i);
    
    if (errorMatch) {
      searchQuery = searchQuery || 'error';
    } else if (commandMatch) {
      filters.messageType = 'tool_use';
      searchQuery = 'Bash';
    }

    // Clean up the search query
    searchQuery = this.cleanQuery(searchQuery || input);

    return { searchQuery, filters };
  }

  private isUUID(str: string): boolean {
    // Check if string is a UUID format (8-4-4-4-12 hexadecimal)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  private normalizeProjectPath(projectRef: string): string {
    // Handle common project name patterns for searching
    // This should match against the stored encoded paths in database
    // Examples: "talking-to-ai", "talking_to_ai", "talking", "bookeus"
    
    // Remove quotes if present
    projectRef = projectRef.replace(/['"]/g, '');
    
    // Convert spaces to hyphens (common in encoded paths)
    projectRef = projectRef.replace(/\s+/g, '-');
    
    // Convert dots to hyphens (as they would be encoded)
    projectRef = projectRef.replace(/\./g, '-');
    
    // Make it case-insensitive by converting to lowercase for search matching
    // This is for search purposes only, not for decoding paths
    projectRef = projectRef.toLowerCase();
    
    return projectRef;
  }

  private cleanQuery(query: string): string {
    // Remove common words that don't help with search
    const stopWords = ['where', 'when', 'what', 'how', 'did', 'we', 'i', 'the', 'a', 'an', 'was', 'were', 'discuss', 'discussed', 'conversation', 'about'];
    
    let cleaned = query.toLowerCase();
    stopWords.forEach(word => {
      cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'g'), '');
    });

    // Clean up multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // If query contains file paths or specific terms, quote them for exact match
    if (cleaned.includes('/') || cleaned.includes('.')) {
      const parts = cleaned.split(' ');
      cleaned = parts.map(part => {
        if (part.includes('/') || part.includes('.')) {
          return `"${part}"`;
        }
        return part;
      }).join(' ');
    }

    return cleaned;
  }

  buildFTSQuery(searchQuery: string): string {
    // Handle empty query
    if (!searchQuery || searchQuery.trim().length === 0) {
      return 'a OR the'; // Simple fallback query
    }

    // Clean the query of special characters that might cause SQL issues
    let cleaned = searchQuery.replace(/[^\w\s"'-]/g, ' ').trim();
    
    // Handle quoted phrases
    if (cleaned.includes('"')) {
      return cleaned;
    }

    // Convert to FTS5 query format
    const words = cleaned.split(/\s+/).filter(w => w.length > 1); // Filter out single chars
    
    if (words.length === 0) {
      return 'a OR the'; // Simple fallback
    }

    // For single word, just return it (without prefix matching for now)
    if (words.length === 1) {
      return words[0];
    }

    // For multiple words, join with AND
    return words.join(' AND ');
  }
}