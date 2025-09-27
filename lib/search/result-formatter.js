"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultFormatter = void 0;
class ResultFormatter {
    formatSearchResults(results, limit = 10) {
        // Group results by conversation ID + project path to handle duplicate conversation IDs across projects
        const conversationMap = new Map();
        results.forEach(result => {
            const convKey = `${result.message.conversationId}:${result.message.projectPath}`;
            if (!conversationMap.has(convKey)) {
                conversationMap.set(convKey, []);
            }
            conversationMap.get(convKey).push(result);
        });
        // Format each conversation group
        const conversations = [];
        for (const [convKey, convResults] of conversationMap.entries()) {
            // Sort messages within conversation by timestamp
            convResults.sort((a, b) => a.message.timestamp.getTime() - b.message.timestamp.getTime());
            const firstResult = convResults[0];
            // Extract actual conversation ID from the composite key
            const actualConvId = convKey.split(':')[0];
            // projectPath should already be decoded and stored properly in the database
            const projectPath = firstResult.message.projectPath;
            const projectName = firstResult.message.projectName;
            // Get unique messages (deduplicate by content hash)
            const uniqueMessages = this.deduplicateMessages(convResults);
            conversations.push({
                conversationId: actualConvId,
                projectPath: projectPath,
                projectName: projectName,
                resumeCommand: `cd '${projectPath}' && claude --resume ${actualConvId}`,
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
    deduplicateMessages(results) {
        const seen = new Map();
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
    truncateContent(content, maxLength) {
        if (content.length <= maxLength) {
            return content;
        }
        return content.substring(0, maxLength) + '...';
    }
}
exports.ResultFormatter = ResultFormatter;
//# sourceMappingURL=result-formatter.js.map