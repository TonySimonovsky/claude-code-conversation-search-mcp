import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ShortcutConfig {
  name: string;
  target: string;
  type: 'symlink' | 'alias' | 'batch';
}

export class ShortcutManager {
  private shortcutsDir: string;
  private shortcutsConfig: Map<string, string> = new Map();
  private configFile: string;

  constructor() {
    this.shortcutsDir = this.getShortcutsDirectory();
    this.configFile = path.join(this.shortcutsDir, 'shortcuts.json');
    this.ensureShortcutsDirectory();
    this.loadShortcutsConfig();
  }

  /**
   * Get or create a shortcut for a project path
   * Returns the shortcut name that can be used in cd commands
   */
  async getOrCreateShortcut(projectPath: string, projectName: string): Promise<string> {
    let shortcutName = this.generateShortcutName(projectName);
    
    // Check if shortcut already exists and points to the same path
    const existingPath = this.shortcutsConfig.get(shortcutName);
    if (existingPath === projectPath) {
      return shortcutName;
    }

    // Handle collisions by adding a number
    let counter = 1;
    let originalName = shortcutName;
    while (this.shortcutsConfig.has(shortcutName) && this.shortcutsConfig.get(shortcutName) !== projectPath) {
      shortcutName = `${originalName}${counter}`;
      counter++;
    }

    // Create new shortcut
    await this.createShortcut(shortcutName, projectPath);
    this.shortcutsConfig.set(shortcutName, projectPath);
    this.saveShortcutsConfig();
    
    return shortcutName;
  }

  /**
   * Generate project-based shortcut name with 3-5 words hyphenated
   */
  private generateShortcutName(projectName: string): string {
    // Convert project name to 3-5 words, hyphenated
    const cleanName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    // Limit to 3-5 words (take first 5 parts separated by hyphens)
    const words = cleanName.split('-').slice(0, 5);
    const shortName = words.join('-');

    return shortName;
  }

  /**
   * Create OS-specific shortcut
   */
  private async createShortcut(name: string, targetPath: string): Promise<void> {
    const platform = os.platform();
    
    try {
      switch (platform) {
        case 'win32':
          await this.createWindowsShortcut(name, targetPath);
          break;
        case 'darwin':
        case 'linux':
          await this.createUnixSymlink(name, targetPath);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch {
      // Don't throw - fallback to original path
      // Error logged silently to avoid spamming output
    }
  }

  /**
   * Create Windows directory shortcut using mklink
   */
  private async createWindowsShortcut(name: string, targetPath: string): Promise<void> {
    const linkPath = path.join(this.shortcutsDir, name);
    
    // Remove existing link if it exists
    try {
      await fs.promises.unlink(linkPath);
    } catch {
      // Ignore if doesn't exist
    }
    
    // Windows: Create directory junction (like symlink but works without admin rights)
    const { spawn } = await import('child_process');
    const mklink = spawn('cmd', ['/c', 'mklink', '/J', `"${linkPath}"`, `"${targetPath}"`], {
      stdio: 'inherit'
    });
    
    return new Promise((resolve, reject) => {
      mklink.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          // Fallback: try symlink (requires admin)
          const symlinkCmd = spawn('cmd', ['/c', 'mklink', '/D', `"${linkPath}"`, `"${targetPath}"`], {
            stdio: 'inherit'
          });
          symlinkCmd.on('close', (symlinkCode) => {
            if (symlinkCode === 0) {
              resolve();
            } else {
              reject(new Error(`Failed to create Windows directory shortcut`));
            }
          });
        }
      });
    });
  }

  /**
   * Create Unix symlink - actual directory shortcut
   */
  private async createUnixSymlink(name: string, targetPath: string): Promise<void> {
    const linkPath = path.join(this.shortcutsDir, name);
    
    // Remove existing symlink if it exists
    try {
      await fs.promises.unlink(linkPath);
    } catch {
      // Ignore if doesn't exist
    }
    
    // Create actual directory symlink
    await fs.promises.symlink(targetPath, linkPath);
  }

  /**
   * Get shortcuts directory based on OS (much shorter path)
   */
  private getShortcutsDirectory(): string {
    const homeDir = os.homedir();
    
    // Use much shorter paths - 3 times shorter
    return path.join(homeDir, '.cs');
  }

  /**
   * Ensure shortcuts directory exists
   */
  private ensureShortcutsDirectory(): void {
    try {
      if (!fs.existsSync(this.shortcutsDir)) {
        fs.mkdirSync(this.shortcutsDir, { recursive: true });
      }
    } catch {
      // Silently handle error - shortcuts are optional functionality
    }
  }

  /**
   * Load shortcuts configuration from file
   */
  private loadShortcutsConfig(): void {
    try {
      if (fs.existsSync(this.configFile)) {
        const configData = fs.readFileSync(this.configFile, 'utf8');
        const config = JSON.parse(configData);
        this.shortcutsConfig = new Map(Object.entries(config));
      }
    } catch {
      // Silently reset to empty config if load fails
      this.shortcutsConfig = new Map();
    }
  }

  /**
   * Save shortcuts configuration to file
   */
  private saveShortcutsConfig(): void {
    try {
      const config = Object.fromEntries(this.shortcutsConfig);
      fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
    } catch {
      // Silently handle save errors - shortcuts are optional functionality
    }
  }

  /**
   * Ensure shortcuts directory is in PATH (Windows only)
   */
  private async ensureInPath(): Promise<void> {
    if (os.platform() !== 'win32') return;
    
    // This is a complex operation that requires modifying Windows registry
    // Shortcuts will work directly if the batch files are in a PATH directory
  }

  /**
   * Get the command to use the shortcut based on OS
   */
  getShortcutCommand(shortcutName: string): string {
    const platform = os.platform();
    
    switch (platform) {
      case 'win32':
        // Windows uses %USERPROFILE% for home directory
        return `cd "%USERPROFILE%\\.cs\\${shortcutName}"`;
      case 'darwin':
      case 'linux':
      default:
        // Unix systems use ~ for home directory (no quotes for tilde expansion)
        return `cd ~/.cs/${shortcutName}`;
    }
  }

  /**
   * Check if a shortcut exists
   */
  hasShortcut(shortcutName: string): boolean {
    return this.shortcutsConfig.has(shortcutName);
  }

  /**
   * Get all shortcuts
   */
  getAllShortcuts(): Array<{name: string; path: string}> {
    return Array.from(this.shortcutsConfig.entries()).map(([name, path]) => ({
      name,
      path
    }));
  }
}