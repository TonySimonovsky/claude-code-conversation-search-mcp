#!/usr/bin/env node

// CommonJS wrapper for pkg compatibility
// pkg doesn't work well with ES modules, so we import the ES module dynamically

(async () => {
  try {
    // Import the ES module
    const { ConversationSearchServer } = await import('../lib/index.js');
    
    // Create and start the server
    const server = new ConversationSearchServer();
    await server.run();
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
})();