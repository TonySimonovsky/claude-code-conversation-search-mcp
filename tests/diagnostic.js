#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=== MCP Server Diagnostic Test ===\n');

// Check if lib directory exists
const libPath = path.join(__dirname, '..', 'lib');
const binPath = path.join(__dirname, '..', 'bin', 'claude-conversation-search');
const srcIndexPath = path.join(__dirname, '..', 'src', 'index.ts');
const libIndexPath = path.join(__dirname, '..', 'lib', 'index.js');

console.log('1. Checking directory structure...');
console.log(`   lib/ exists: ${fs.existsSync(libPath)}`);
console.log(`   bin/claude-conversation-search exists: ${fs.existsSync(binPath)}`);
console.log(`   src/index.ts exists: ${fs.existsSync(srcIndexPath)}`);
console.log(`   lib/index.js exists: ${fs.existsSync(libIndexPath)}`);

// Check file timestamps
if (fs.existsSync(srcIndexPath) && fs.existsSync(libIndexPath)) {
  const srcStat = fs.statSync(srcIndexPath);
  const libStat = fs.statSync(libIndexPath);
  console.log(`\n2. File timestamps:`);
  console.log(`   src/index.ts modified: ${srcStat.mtime}`);
  console.log(`   lib/index.js modified: ${libStat.mtime}`);
  
  if (srcStat.mtime > libStat.mtime) {
    console.log('   ⚠️  WARNING: Source file is newer than compiled file! Need to rebuild.');
  }
}

// Check if bin file is executable
if (fs.existsSync(binPath)) {
  const binStat = fs.statSync(binPath);
  const isExecutable = (binStat.mode & parseInt('111', 8)) !== 0;
  console.log(`\n3. Bin file executable: ${isExecutable}`);
}

// Try to run the server with a simple test
console.log('\n4. Testing server startup...');
console.log('   Running: node lib/index.js (will timeout after 3 seconds)');

const server = spawn('node', [libIndexPath], {
  env: { ...process.env, DEBUG: 'true' },
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

server.stdout.on('data', (data) => {
  output += data.toString();
});

server.stderr.on('data', (data) => {
  errorOutput += data.toString();
  process.stderr.write(`   [STDERR] ${data.toString()}`);
});

// Set a timeout to kill the process after 3 seconds
setTimeout(() => {
  server.kill('SIGTERM');
}, 3000);

server.on('exit', (code, signal) => {
  console.log(`\n5. Server exit status:`);
  console.log(`   Exit code: ${code}`);
  console.log(`   Signal: ${signal}`);
  
  if (code !== 0 && signal !== 'SIGTERM') {
    console.log('\n   ❌ Server failed to start properly');
    console.log('   Error output:', errorOutput);
  } else if (signal === 'SIGTERM') {
    console.log('\n   ✅ Server started and was terminated by test (expected behavior)');
  }
  
  console.log('\n6. Testing with MCP protocol handshake...');
  testMCPHandshake();
});

function testMCPHandshake() {
  const server2 = spawn('node', [libIndexPath], {
    env: { ...process.env, DEBUG: 'true' },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Send a basic MCP initialization message
  const initMessage = JSON.stringify({
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {}
    },
    id: 1
  }) + '\n';
  
  console.log('   Sending MCP initialize message...');
  server2.stdin.write(initMessage);
  
  let response = '';
  server2.stdout.on('data', (data) => {
    response += data.toString();
    console.log(`   [RESPONSE] ${data.toString()}`);
  });
  
  server2.stderr.on('data', (data) => {
    console.log(`   [STDERR] ${data.toString()}`);
  });
  
  setTimeout(() => {
    server2.kill('SIGTERM');
    console.log('\n=== Diagnostic Complete ===');
    
    // Final recommendations
    console.log('\n📋 Recommendations:');
    console.log('1. Rebuild the project: npm run build');
    console.log('2. Check that all dependencies are installed: npm install');
    console.log('3. Verify the Claude projects directory exists: ~/.claude/projects');
    console.log('4. Enable debug mode to see more details: DEBUG=true');
  }, 2000);
}