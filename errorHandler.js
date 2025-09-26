const vscode = require('vscode');

class ErrorHandler {
    static logError(error, context = '') {
        const timestamp = new Date().toISOString();
        const message = `[${timestamp}] Debug Cleanup Pro Error${context ? ` (${context})` : ''}: ${error.message}`;
        console.error(message, error.stack);
    }

    static handleParseError(error, filePath) {
        this.logError(error, `parsing ${filePath}`);

        if (error.message.includes('Unexpected token')) {
            return {
                type: 'syntax',
                message: `Syntax error in file: ${filePath}. The file may have invalid JavaScript/TypeScript syntax.`,
                suggestion: 'Check for syntax errors in the file or exclude it from cleanup.'
            };
        } else if (error.message.includes('plugins')) {
            return {
                type: 'babel',
                message: `Babel parsing error in file: ${filePath}. Unsupported language features detected.`,
                suggestion: 'The file may contain unsupported syntax. Cleanup will fallback to regex parsing.'
            };
        } else {
            return {
                type: 'unknown',
                message: `Unable to parse file: ${filePath}. ${error.message}`,
                suggestion: 'The file will be skipped or processed with fallback methods.'
            };
        }
    }

    static handleFileError(error, filePath) {
        this.logError(error, `processing file ${filePath}`);

        if (error.code === 'ENOENT') {
            return {
                type: 'file_not_found',
                message: `File not found: ${filePath}`,
                suggestion: 'The file may have been moved or deleted during processing.'
            };
        } else if (error.code === 'EACCES') {
            return {
                type: 'permission',
                message: `Permission denied accessing: ${filePath}`,
                suggestion: 'Check file permissions or run VSCode with appropriate privileges.'
            };
        } else if (error.code === 'EMFILE' || error.code === 'ENFILE') {
            return {
                type: 'too_many_files',
                message: 'Too many files open simultaneously',
                suggestion: 'Try processing a smaller workspace or restart VSCode.'
            };
        } else {
            return {
                type: 'file_system',
                message: `File system error processing: ${filePath}. ${error.message}`,
                suggestion: 'Check file accessibility and disk space.'
            };
        }
    }

    static handleWorkspaceError(error, operation) {
        this.logError(error, `workspace ${operation}`);

        if (error.message.includes('workspace')) {
            return {
                type: 'workspace',
                message: `Workspace error during ${operation}: ${error.message}`,
                suggestion: 'Ensure a workspace is open and accessible.'
            };
        } else {
            return {
                type: 'operation',
                message: `Operation failed: ${operation}. ${error.message}`,
                suggestion: 'Try the operation again or check VSCode logs for more details.'
            };
        }
    }

    static async showError(errorInfo, showDetails = false) {
        const actions = showDetails ? ['Show Details', 'OK'] : ['Show Details'];

        const result = await vscode.window.showErrorMessage(
            errorInfo.message,
            { modal: false },
            ...actions
        );

        if (result === 'Show Details') {
            const detailMessage = `Error Type: ${errorInfo.type}\n\nMessage: ${errorInfo.message}\n\nSuggestion: ${errorInfo.suggestion}`;
            vscode.window.showInformationMessage(detailMessage, { modal: true });
        }
    }

    static async showWarning(message, suggestion = null) {
        const actions = suggestion ? ['Show Suggestion'] : [];
        const result = await vscode.window.showWarningMessage(message, ...actions);

        if (result === 'Show Suggestion' && suggestion) {
            vscode.window.showInformationMessage(suggestion);
        }
    }
}

class ProgressReporter {
    constructor(title, cancellable = false) {
        this.title = title;
        this.cancellable = cancellable;
        this.progress = null;
        this.token = null;
    }

    async start() {
        return new Promise((resolve, reject) => {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: this.title,
                cancellable: this.cancellable
            }, async (progress, token) => {
                this.progress = progress;
                this.token = token;
                resolve({ progress, token });
            });
        });
    }

    report(increment, message) {
        if (this.progress) {
            this.progress.report({ increment, message });
        }
    }

    isCancelled() {
        return this.token?.isCancellationRequested ?? false;
    }
}

class UserFeedback {
    static success(message, details = null) {
        if (details) {
            const actions = ['Show Details'];
            vscode.window.showInformationMessage(message, ...actions).then(result => {
                if (result === 'Show Details') {
                    vscode.window.showInformationMessage(details, { modal: true });
                }
            });
        } else {
            vscode.window.showInformationMessage(message);
        }
    }

    static warning(message, suggestion = null) {
        ErrorHandler.showWarning(message, suggestion);
    }

    static error(message, errorInfo = null) {
        if (errorInfo) {
            ErrorHandler.showError(errorInfo);
        } else {
            vscode.window.showErrorMessage(message);
        }
    }

    static async confirm(message, confirmText = 'Yes', cancelText = 'No') {
        const result = await vscode.window.showInformationMessage(
            message,
            { modal: true },
            confirmText,
            cancelText
        );
        return result === confirmText;
    }

    static async showQuickPick(items, placeHolder) {
        return await vscode.window.showQuickPick(items, {
            placeHolder,
            canPickMany: false
        });
    }

    static statusBarMessage(message, timeout = 5000) {
        vscode.window.setStatusBarMessage(message, timeout);
    }

    static showCleanupSummary(results) {
        const {
            processedFiles = 0,
            totalFiles = 0,
            removedStatements = 0,
            skippedFiles = 0,
            errors = 0,
            duration = 0
        } = results;

        let message = `Cleanup Complete!\n`;
        message += `• Processed: ${processedFiles}/${totalFiles} files\n`;
        message += `• Removed: ${removedStatements} debug statements\n`;

        if (skippedFiles > 0) {
            message += `• Skipped: ${skippedFiles} files\n`;
        }

        if (errors > 0) {
            message += `• Errors: ${errors} files with issues\n`;
        }

        message += `• Duration: ${(duration / 1000).toFixed(2)}s`;

        const actions = errors > 0 ? ['Show Errors', 'OK'] : ['OK'];

        vscode.window.showInformationMessage(
            `Processed ${processedFiles} files, removed ${removedStatements} debug statements`,
            ...actions
        ).then(result => {
            if (result === 'Show Errors') {
                vscode.window.showInformationMessage(message, { modal: true });
            }
        });
    }
}

class ValidationHelper {
    static validateEditor(editor) {
        if (!editor) {
            throw new Error('No active editor found');
        }
        return true;
    }

    static validateWorkspace() {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            throw new Error('No workspace folder is open');
        }
        return true;
    }

    static validateSelection(selection) {
        if (!selection || selection.isEmpty) {
            throw new Error('No text selected');
        }
        return true;
    }

    static validateFileType(filePath, supportedTypes) {
        if (!supportedTypes || supportedTypes.length === 0) {
            return true; // Allow all if no restrictions
        }

        const extension = filePath.split('.').pop()?.toLowerCase();
        const languageId = this.getLanguageFromExtension(extension);

        return supportedTypes.some(type =>
            type.toLowerCase() === languageId ||
            type.toLowerCase() === extension
        );
    }

    static getLanguageFromExtension(extension) {
        const mapping = {
            'js': 'javascript',
            'ts': 'typescript',
            'jsx': 'javascriptreact',
            'tsx': 'typescriptreact',
            'java': 'java',
            'py': 'python'
        };
        return mapping[extension] || extension;
    }

    static shouldExcludeFile(filePath, excludePatterns) {
        if (!excludePatterns || excludePatterns.length === 0) {
            return false;
        }

        return excludePatterns.some(pattern => {
            // Convert glob pattern to regex
            const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
            return regex.test(filePath);
        });
    }
}

module.exports = {
    ErrorHandler,
    ProgressReporter,
    UserFeedback,
    ValidationHelper
};