# Debug Cleanup Pro

A powerful VSCode extension for cleaning up debug statements and console logs from your code. Debug Cleanup Pro uses advanced AST parsing with Babel to safely and accurately remove debug statements while preserving your code structure.

![Debug Cleanup Pro](https://img.shields.io/badge/VSCode-Extension-blue?style=flat-square&logo=visual-studio-code)
![Version](https://img.shields.io/badge/version-0.0.1-green?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

## ✨ Features

- **🎯 Accurate Detection** - Uses Babel AST parsing for precise console statement detection
- **🔧 Configurable Cleanup** - Granular control over which statements to remove
- **📝 Multiple Languages** - Supports JavaScript, TypeScript, JSX, Python, and Java
- **⚡ Performance Optimized** - Handles large codebases efficiently
- **🧹 Smart Whitespace Cleaning** - Removes excessive blank lines and trailing whitespace
- **📊 Detailed Reports** - Shows cleanup statistics and performance metrics
- **🔍 Preview Mode** - Preview changes before applying them
- **⌨️ Keyboard Shortcuts** - Quick access with customizable keybindings
- **🎨 Workspace Support** - Clean entire workspaces with progress indicators
- **🛡️ Error Handling** - Graceful fallback parsing for syntax errors

## 🚀 Quick Start

### Installation

1. **From VSCode Marketplace:**
   - Open VSCode
   - Go to Extensions view (`Ctrl+Shift+X`)
   - Search for "Debug Cleanup Pro"
   - Click Install

2. **From Command Line:**
   ```bash
   code --install-extension debug-cleanup-pro
   ```

3. **Manual Installation:**
   - Download the `.vsix` file
   - Run `code --install-extension debug-cleanup-pro.vsix`

### Basic Usage

1. **Clean Current File:**
   - Open a file with debug statements
   - Press `Ctrl+Alt+C` (or `Cmd+Alt+C` on Mac)
   - Or use Command Palette: `Debug Cleanup Pro: Clean Current File`

2. **Clean Selection:**
   - Select code containing debug statements
   - Press `Ctrl+Alt+S` (or `Cmd+Alt+S` on Mac)
   - Or use Command Palette: `Debug Cleanup Pro: Clean Selection`

3. **Clean Workspace:**
   - Press `Ctrl+Alt+W` (or `Cmd+Alt+W` on Mac)
   - Or use Command Palette: `Debug Cleanup Pro: Clean Workspace`

## 📋 Commands

| Command | Keybinding | Description |
|---------|------------|-------------|
| `Debug Cleanup Pro: Cleanup Debug Statements` | - | Legacy cleanup command |
| `Debug Cleanup Pro: Clean Current File` | `Ctrl+Alt+C` | Clean debug statements in active file |
| `Debug Cleanup Pro: Clean Selection` | `Ctrl+Alt+S` | Clean debug statements in selected text |
| `Debug Cleanup Pro: Clean Workspace` | `Ctrl+Alt+W` | Clean debug statements in all workspace files |

## ⚙️ Configuration

Access settings through: **File > Preferences > Settings > Extensions > Debug Cleanup Pro**

### Console Statement Control

Fine-tune which console methods to remove:

```json
{
  "debugCleanupPro.removeConsoleLog": true,     // console.log()
  "debugCleanupPro.removeConsoleWarn": true,    // console.warn()
  "debugCleanupPro.removeConsoleError": false,  // console.error() - keep by default
  "debugCleanupPro.removeConsoleInfo": true,    // console.info()
  "debugCleanupPro.removeConsoleDebug": true,   // console.debug()
  "debugCleanupPro.removeConsoleTrace": true    // console.trace()
}
```

### Debug Statement Types

Control which types of debug statements to remove:

```json
{
  "debugCleanupPro.removeDebugger": true,    // debugger; statements
  "debugCleanupPro.removePrint": true,       // print() statements (Python)
  "debugCleanupPro.removeSystemOut": true    // System.out.println() (Java)
}
```

### Whitespace & Formatting

Configure code formatting after cleanup:

```json
{
  "debugCleanupPro.maxEmptyLines": 2,        // Max consecutive empty lines (1-10)
  "debugCleanupPro.cleanWhitespace": true,   // Remove trailing whitespace
  "debugCleanupPro.preserveComments": true   // Keep comments during cleanup
}
```

### File Processing

Control which files are processed:

```json
{
  "debugCleanupPro.includeFileTypes": [
    "javascript",
    "typescript",
    "javascriptreact",
    "typescriptreact",
    "java",
    "python"
  ],
  "debugCleanupPro.excludePatterns": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/*.min.js"
  ]
}
```

### User Experience

Customize the cleanup experience:

```json
{
  "debugCleanupPro.showPreview": false,  // Show preview before cleaning
  "debugCleanupPro.autoSave": false      // Auto-save files after cleanup
}
```

## 🎯 Supported Debug Statements

### JavaScript/TypeScript
```javascript
// Console methods
console.log('debug message');
console.debug('debug info');
console.warn('warning');
console.error('error message');  // Can be preserved
console.info('information');
console.trace('trace info');
console.table(['data']);
console.time('timer');
console.timeEnd('timer');

// Debugger statements
debugger;
```

### Python
```python
print("debug message")
print(f"variable: {value}")
```

### Java
```java
System.out.println("debug message");
System.err.println("error message");
```

## 📁 File Type Support

| Language | Extensions | AST Parsing | Regex Fallback |
|----------|------------|-------------|-----------------|
| JavaScript | `.js` | ✅ | ✅ |
| TypeScript | `.ts` | ✅ | ✅ |
| React JSX | `.jsx` | ✅ | ✅ |
| React TSX | `.tsx` | ✅ | ✅ |
| Python | `.py` | ❌ | ✅ |
| Java | `.java` | ❌ | ✅ |

## 🔧 Advanced Usage

### Workspace Configuration

Create a `.vscode/settings.json` in your workspace:

```json
{
  "debugCleanupPro.removeConsoleError": false,
  "debugCleanupPro.maxEmptyLines": 1,
  "debugCleanupPro.excludePatterns": [
    "**/node_modules/**",
    "**/coverage/**",
    "**/*.test.js",
    "**/*.spec.ts"
  ]
}
```

### Keybinding Customization

Customize keybindings in **File > Preferences > Keyboard Shortcuts**:

```json
{
  "key": "ctrl+shift+d",
  "command": "debug-cleanup-pro.cleanCurrentFile",
  "when": "editorTextFocus"
}
```

### Integration with Build Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "clean-debug": "# Use workspace cleanup command",
    "prebuild": "# Clean debug statements before build"
  }
}
```

## 🚨 Error Handling

Debug Cleanup Pro handles various error scenarios gracefully:

### Syntax Errors
- Automatically falls back to regex parsing
- Shows informative warnings
- Continues processing other files

### File System Errors
- Permission denied → Shows permission guidance
- File not found → Skips missing files
- Large files → Processes with progress indicators

### Babel Parsing Errors
- Unsupported syntax → Uses regex fallback
- Plugin errors → Provides helpful suggestions

## 📊 Performance

### Benchmarks
- **Small files** (< 1KB): ~10ms
- **Medium files** (10-100KB): ~50-200ms
- **Large files** (1MB+): ~500ms-2s
- **Workspace** (1000+ files): Progress indicators with cancellation

### Memory Usage
- Minimal memory footprint
- Streaming file processing
- Efficient AST traversal

## 🔍 Examples

### Before Cleanup
```javascript
import React, { useState, useEffect } from 'react';

const UserComponent = () => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        console.log('Component mounted');
        loadUsers();

        return () => {
            console.log('Component unmounted');
        };
    }, []);

    const loadUsers = async () => {
        console.log('Loading users...');
        debugger;

        try {
            const response = await fetch('/api/users');
            const data = await response.json();
            console.debug('Users loaded:', data);
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    };

    const handleClick = (userId) => {
        console.log('User clicked:', userId);
    };

    return (
        <div>
            {users.map(user => (
                <div key={user.id} onClick={() => handleClick(user.id)}>
                    {user.name}
                </div>
            ))}
        </div>
    );
};
```

### After Cleanup
```javascript
import React, { useState, useEffect } from 'react';

const UserComponent = () => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        loadUsers();

        return () => {
        };
    }, []);

    const loadUsers = async () => {
        try {
            const response = await fetch('/api/users');
            const data = await response.json();
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    };

    const handleClick = (userId) => {
    };

    return (
        <div>
            {users.map(user => (
                <div key={user.id} onClick={() => handleClick(user.id)}>
                    {user.name}
                </div>
            ))}
        </div>
    );
};
```

*Note: `console.error` statements are preserved by default as they're often used for production error logging.*

## 🛠️ Development

### Prerequisites
- Node.js 16+
- VSCode 1.74+

### Setup
```bash
git clone https://github.com/your-username/debug-cleanup-pro
cd debug-cleanup-pro
npm install
```

### Testing
```bash
npm test                # All tests
npm run test:unit       # Unit tests only
npm run test:parser     # Parser tests
npm run test:cleaner    # Cleaner tests
npm run coverage        # Coverage report
```

### Building
```bash
npm run compile         # Compile TypeScript
npm run package         # Create .vsix package
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Reporting Issues
- Use the [Issue Tracker](https://github.com/your-username/debug-cleanup-pro/issues)
- Provide sample code that reproduces the issue
- Include VSCode version and extension version
- Describe expected vs. actual behavior

## 📝 Changelog

### [0.0.1] - Initial Release
- ✨ Basic console statement detection and removal
- 🎯 Babel AST parsing for JavaScript/TypeScript
- ⚙️ Configurable cleanup options
- 📊 Cleanup reports and statistics
- ⌨️ Keyboard shortcuts and commands
- 🧹 Whitespace cleaning
- 🛡️ Error handling and fallback parsing

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Babel** - For powerful JavaScript parsing capabilities
- **VSCode Team** - For the excellent extension API
- **Contributors** - Thank you to all contributors who helped improve this extension

## 📞 Support

- **Documentation**: [Extension Wiki](https://github.com/your-username/debug-cleanup-pro/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-username/debug-cleanup-pro/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/debug-cleanup-pro/discussions)

---

**Happy Debugging! 🐛✨**

*Debug Cleanup Pro - Keep your code clean and production-ready*