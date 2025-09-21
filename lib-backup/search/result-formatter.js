"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultFormatter = void 0;
class ResultFormatter {
    formatSearchResults(results, limit = 10) {
        // Group results by conversation ID
        const conversationMap = new Map();
        results.forEach(result => {
            const convId = result.message.conversationId;
            if (!conversationMap.has(convId)) {
                conversationMap.set(convId, []);
            }
            conversationMap.get(convId).push(result);
        });
        // Format each conversation group
        const formattedResults = [];
        for (const [convId, convResults] of conversationMap.entries()) {
            // Sort messages within conversation by timestamp
            convResults.sort((a, b) => a.message.timestamp.getTime() - b.message.timestamp.getTime());
            const firstResult = convResults[0];
            const projectPath = this.decodeProjectPath(firstResult.message.projectPath);
            // Create summary from first few matches
            const summary = this.createConversationSummary(convResults);
            formattedResults.push({
                conversationId: convId,
                projectPath: projectPath,
                projectName: firstResult.message.projectName,
                date: firstResult.message.timestamp.toISOString().split('T')[0],
                summary: summary,
                resumeCommand: `cd '${projectPath}' && claude --resume ${convId}`,
                messageCount: convResults.length,
                firstMatch: {
                    type: firstResult.message.type,
                    content: firstResult.message.content.substring(0, 200) + (firstResult.message.content.length > 200 ? '...' : ''),
                    timestamp: firstResult.message.timestamp.toISOString()
                }
            });
        }
        // Sort by relevance (number of matches) and date
        formattedResults.sort((a, b) => {
            // First by number of matches (more matches = more relevant)
            if (b.messageCount !== a.messageCount) {
                return b.messageCount - a.messageCount;
            }
            // Then by date (newer first)
            return b.date.localeCompare(a.date);
        });
        // Limit results
        const limitedResults = formattedResults.slice(0, limit);
        return {
            formattedResults: limitedResults,
            rawResults: results.slice(0, limit * 3), // Keep some raw results for reference
            totalMatches: results.length
        };
    }
    decodeProjectPath(encodedPath) {
        // Decode the encoded project path
        return encodedPath
            .replace(/-Users-/g, '/Users/')
            .replace(/-/g, '/')
            .replace(/\/+/g, '/')
            .toLowerCase();
    }
    createConversationSummary(results) {
        // Get unique message types and topics
        const messageTypes = new Set();
        const topics = [];
        results.slice(0, 5).forEach(result => {
            messageTypes.add(result.message.type);
            // Extract key phrases from content
            const content = result.message.content.toLowerCase();
            if (content.length > 50) {
                topics.push(content.substring(0, 100));
            }
        });
        // Build summary
        const types = Array.from(messageTypes).join(', ');
        const mainTopic = topics[0] ? topics[0].substring(0, 150) + '...' : 'Multiple messages';
        return `${results.length} matches (${types}) - ${mainTopic}`;
    }
}
exports.ResultFormatter = ResultFormatter;
//# sourceMappingURL=result-formatter.js.map