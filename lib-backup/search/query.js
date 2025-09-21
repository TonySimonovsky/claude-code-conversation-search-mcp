"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryParser = void 0;
class QueryParser {
    parseQuery(input) {
        let searchQuery = input;
        const filters = {};
        // Extract file operations
        const fileCreateMatch = input.match(/(?:created?|new|wrote?)\s+(?:file\s+)?([^\s]+\.[\w]+)/i);
        const fileEditMatch = input.match(/(?:edited?|modified?|changed?|updated?)\s+(?:file\s+)?([^\s]+\.[\w]+)/i);
        if (fileCreateMatch) {
            searchQuery = `Write "${fileCreateMatch[1]}"`;
        }
        else if (fileEditMatch) {
            searchQuery = `Edit "${fileEditMatch[1]}"`;
        }
        // Extract project filter
        const projectMatch = input.match(/(?:in|from)\s+(?:project\s+)?([^\s]+)/i);
        if (projectMatch) {
            filters.projectPath = projectMatch[1];
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
        }
        else if (yesterdayMatch) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            filters.dateFrom = yesterday;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            filters.dateTo = today;
            searchQuery = searchQuery.replace(yesterdayMatch[0], '').trim();
        }
        else if (lastWeekMatch) {
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
        }
        else if (commandMatch) {
            filters.messageType = 'tool_use';
            searchQuery = 'Bash';
        }
        // Clean up the search query
        searchQuery = this.cleanQuery(searchQuery || input);
        return { searchQuery, filters };
    }
    cleanQuery(query) {
        // Remove common words that don't help with search
        const stopWords = ['where', 'when', 'what', 'how', 'did', 'we', 'i', 'the', 'a', 'an', 'was', 'were'];
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
    buildFTSQuery(searchQuery) {
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
exports.QueryParser = QueryParser;
//# sourceMappingURL=query.js.map