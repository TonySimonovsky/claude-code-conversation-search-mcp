#!/usr/bin/env node

/**
 * Example: Programmatic usage of the ConversationSearchServer
 * 
 * This example shows how to use the MCP server programmatically
 * for building custom tools or integrations.
 */

import { ConversationSearchServer } from 'claude-code-conversation-search-mcp';
import path from 'path';
import os from 'os';

async function main() {
  // Initialize the server
  const server = new ConversationSearchServer({
    projectsDir: path.join(os.homedir(), '.claude', 'projects'),
    dbPath: path.join(os.homedir(), '.claude', 'conversation-search.db'),
    indexInterval: 0, // Disable auto-indexing
    autoIndexing: false
  });

  try {
    console.log('🔍 Starting conversation search example...\n');

    // 1. Refresh the index
    console.log('📚 Refreshing conversation index...');
    const indexResult = await server.callTool('refresh_index', {});
    console.log(indexResult.content[0].text);

    // 2. List available projects
    console.log('\n📁 Available projects:');
    const projectsResult = await server.callTool('list_projects', {});
    console.log(projectsResult.content[0].text);

    // 3. Search for specific topics
    const searchQueries = [
      'React component implementation',
      'TypeScript error debugging',
      'database optimization',
      'authentication setup'
    ];

    for (const query of searchQueries) {
      console.log(`\n🔍 Searching for: "${query}"`);
      const searchResult = await server.callTool('search_conversations', {
        query: query,
        limit: 3
      });
      console.log(searchResult.content[0].text);
    }

    // 4. Get server information
    console.log('\n🖥️  Server information:');
    const serverInfo = await server.callTool('get_server_info', {});
    console.log(serverInfo.content[0].text);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Clean up
    server.close();
    console.log('\n✅ Example completed!');
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Run the example
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});