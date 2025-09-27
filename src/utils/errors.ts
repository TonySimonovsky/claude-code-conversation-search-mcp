export class ConversationSearchError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly userMessage: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ConversationSearchError';
  }
}

export class DatabaseError extends ConversationSearchError {
  constructor(message: string, cause?: Error) {
    const userMessage = 'Database operation failed. Try refreshing the index or check if the database file is accessible.';
    super('DATABASE_ERROR', message, userMessage, cause);
  }
}

export class FileAccessError extends ConversationSearchError {
  constructor(filePath: string, cause?: Error) {
    const userMessage = `Cannot access conversation file. Please check if Claude Code has proper file permissions and the file exists.`;
    super('FILE_ACCESS_ERROR', `Failed to access file: ${filePath}`, userMessage, cause);
  }
}

export class ParsingError extends ConversationSearchError {
  constructor(filePath: string, lineNumber?: number, cause?: Error) {
    const locationInfo = lineNumber ? ` at line ${lineNumber}` : '';
    const userMessage = `Conversation file format is invalid${locationInfo}. This file may be corrupted or not a valid Claude conversation.`;
    super('PARSING_ERROR', `Failed to parse conversation file: ${filePath}${locationInfo}`, userMessage, cause);
  }
}

export class ConfigurationError extends ConversationSearchError {
  constructor(setting: string, cause?: Error) {
    const userMessage = `Configuration issue with ${setting}. Please check your environment variables or MCP server configuration.`;
    super('CONFIG_ERROR', `Configuration error: ${setting}`, userMessage, cause);
  }
}

export class SearchError extends ConversationSearchError {
  constructor(query: string, cause?: Error) {
    const userMessage = 'Search failed. Try simplifying your query or check if the database is properly indexed.';
    super('SEARCH_ERROR', `Search failed for query: ${query}`, userMessage, cause);
  }
}

export class IndexingError extends ConversationSearchError {
  constructor(message: string, cause?: Error) {
    const userMessage = 'Failed to index conversations. Check if Claude Code projects directory exists and contains valid conversation files.';
    super('INDEXING_ERROR', message, userMessage, cause);
  }
}

export function createUserFriendlyError(error: unknown, fallbackMessage: string = 'An unexpected error occurred'): ConversationSearchError {
  if (error instanceof ConversationSearchError) {
    return error;
  }
  
  if (error instanceof Error) {
    // Try to identify common error patterns and create appropriate user-friendly errors
    if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
      return new FileAccessError(error.message, error);
    }
    
    if (error.message.includes('EACCES') || error.message.includes('permission denied')) {
      return new ConfigurationError('file permissions', error);
    }
    
    if (error.message.includes('database') || error.message.includes('SQL')) {
      return new DatabaseError(error.message, error);
    }
    
    if (error.message.includes('JSON') || error.message.includes('parse')) {
      return new ParsingError('unknown file', undefined, error);
    }
  }
  
  return new ConversationSearchError('UNKNOWN_ERROR', String(error), fallbackMessage);
}

export function getErrorResponse(error: unknown, context: string): { isError: true; content: [{ type: 'text'; text: string }] } {
  const searchError = createUserFriendlyError(error);
  
  const errorText = [
    `❌ ${context} failed`,
    '',
    `**Error:** ${searchError.userMessage}`,
    '',
    '**Troubleshooting tips:**'
  ];

  switch (searchError.code) {
    case 'FILE_ACCESS_ERROR':
      errorText.push(
        '• Check if ~/.claude/projects directory exists',
        '• Verify Claude Code has read permissions',
        '• Ensure conversation files are not corrupted'
      );
      break;
    
    case 'DATABASE_ERROR':
      errorText.push(
        '• Try running refresh_index() to rebuild the database',
        '• Check if database file is not locked by another process',
        '• Verify disk space is available'
      );
      break;
    
    case 'PARSING_ERROR':
      errorText.push(
        '• Some conversation files may be corrupted',
        '• Try restarting Claude Code to regenerate files',
        '• Check if specific files can be manually opened'
      );
      break;
    
    case 'CONFIG_ERROR':
      errorText.push(
        '• Check MCP server configuration in claude_desktop_config.json',
        '• Verify environment variables are set correctly',
        '• Ensure proper file paths and permissions'
      );
      break;
    
    case 'SEARCH_ERROR':
      errorText.push(
        '• Try a simpler search query',
        '• Check if database is indexed (run refresh_index())',
        '• Verify search terms are not empty'
      );
      break;
    
    case 'INDEXING_ERROR':
      errorText.push(
        '• Check if ~/.claude/projects contains conversation files',
        '• Verify Claude Code is creating conversation files',
        '• Try restarting the MCP server'
      );
      break;
    
    default:
      errorText.push(
        '• Try restarting the MCP server',
        '• Check the console for detailed error logs',
        '• Verify Claude Code is working properly'
      );
  }
  
  return {
    isError: true,
    content: [{
      type: 'text',
      text: errorText.join('\n')
    }]
  };
}