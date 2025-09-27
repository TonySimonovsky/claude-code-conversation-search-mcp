# GitHub Releases - Standalone Binaries

## Overview

In addition to NPM installation, Claude Code Conversation Search MCP provides standalone binaries for direct execution without requiring Node.js installation.

## Available Platforms

- **Linux x64**: `claude-code-conversation-search-linux`
- **macOS x64**: `claude-code-conversation-search-macos` 
- **Windows x64**: `claude-code-conversation-search-windows.exe`

## Installation

### Download from GitHub Releases

1. Visit the [Releases page](https://github.com/TonySimonovsky/claude-code-conversation-search-mcp/releases)
2. Download the appropriate binary for your platform
3. Make it executable (Linux/macOS only):
   ```bash
   chmod +x claude-code-conversation-search-*
   ```

### Add to PATH (Optional)

To use the binary from anywhere:

#### Linux/macOS
```bash
# Move to a directory in your PATH
sudo mv claude-code-conversation-search-* /usr/local/bin/claude-code-conversation-search

# Or add current directory to PATH
export PATH=$PATH:$(pwd)
```

#### Windows
1. Move the `.exe` file to a folder in your PATH
2. Or add the current folder to your Windows PATH environment variable

## Usage

### Direct Execution
```bash
# Linux
./claude-code-conversation-search-linux

# macOS  
./claude-code-conversation-search-macos

# Windows
claude-code-conversation-search-windows.exe
```

### Claude Code Configuration

Add the binary path to your Claude Code MCP configuration:

#### Linux/macOS Configuration
```json
{
  "mcpServers": {
    "conversation-search": {
      "command": "/path/to/claude-code-conversation-search-linux",
      "args": []
    }
  }
}
```

#### Windows Configuration
```json
{
  "mcpServers": {
    "conversation-search": {
      "command": "C:\\path\\to\\claude-code-conversation-search-windows.exe",
      "args": []
    }
  }
}
```

## Advantages of Standalone Binaries

✅ **No Node.js Required**: Run without installing Node.js or npm  
✅ **Self-Contained**: All dependencies bundled  
✅ **Fast Startup**: No module resolution overhead  
✅ **Easy Distribution**: Single file deployment  
✅ **Consistent Environment**: Same runtime across all installations

## Automatic Updates

Standalone binaries don't auto-update. To get the latest version:

1. Check the [Releases page](https://github.com/TonySimonovsky/claude-code-conversation-search-mcp/releases) for new versions
2. Download and replace your existing binary
3. Restart Claude Code to use the updated version

## Troubleshooting

### Permission Denied (Linux/macOS)
```bash
chmod +x claude-code-conversation-search-*
```

### Binary Not Found
- Ensure the binary is in your PATH
- Use absolute path in Claude Code configuration
- Verify the binary has execute permissions

### Claude Code Can't Connect
- Check that the binary path in configuration is correct
- Ensure no antivirus software is blocking execution
- Verify Claude Code has permission to execute the binary

## Technical Details

- **Runtime**: Node.js 18.x embedded
- **Packaging**: Built with [pkg](https://github.com/vercel/pkg)
- **Database**: SQLite with FTS5 (bundled)
- **Performance**: Identical to NPM version

## Build Process

Binaries are automatically built and published via GitHub Actions on every release tag. The build process:

1. Runs full test suite
2. Compiles TypeScript to JavaScript
3. Packages with pkg for each platform
4. Creates GitHub Release with artifacts

## Support

For issues specific to standalone binaries, please report on the [GitHub Issues page](https://github.com/TonySimonovsky/claude-code-conversation-search-mcp/issues) with:

- Operating system and version
- Binary filename used
- Error messages or logs
- Claude Code configuration (if applicable)