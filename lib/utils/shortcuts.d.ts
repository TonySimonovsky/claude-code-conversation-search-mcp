export interface ShortcutConfig {
    name: string;
    target: string;
    type: 'symlink' | 'alias' | 'batch';
}
export declare class ShortcutManager {
    private shortcutsDir;
    private shortcutsConfig;
    private configFile;
    constructor();
    /**
     * Get or create a shortcut for a project path
     * Returns the shortcut name that can be used in cd commands
     */
    getOrCreateShortcut(projectPath: string, projectName: string): Promise<string>;
    /**
     * Generate project-based shortcut name with 3-5 words hyphenated
     */
    private generateShortcutName;
    /**
     * Create OS-specific shortcut
     */
    private createShortcut;
    /**
     * Create Windows directory shortcut using mklink
     */
    private createWindowsShortcut;
    /**
     * Create Unix symlink - actual directory shortcut
     */
    private createUnixSymlink;
    /**
     * Get shortcuts directory based on OS (much shorter path)
     */
    private getShortcutsDirectory;
    /**
     * Ensure shortcuts directory exists
     */
    private ensureShortcutsDirectory;
    /**
     * Load shortcuts configuration from file
     */
    private loadShortcutsConfig;
    /**
     * Save shortcuts configuration to file
     */
    private saveShortcutsConfig;
    /**
     * Ensure shortcuts directory is in PATH (Windows only)
     */
    private ensureInPath;
    /**
     * Get the command to use the shortcut based on OS
     */
    getShortcutCommand(shortcutName: string): string;
    /**
     * Check if a shortcut exists
     */
    hasShortcut(shortcutName: string): boolean;
    /**
     * Get all shortcuts
     */
    getAllShortcuts(): Array<{
        name: string;
        path: string;
    }>;
}
//# sourceMappingURL=shortcuts.d.ts.map