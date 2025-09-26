const assert = require('assert');
const { ErrorHandler, ValidationHelper, UserFeedback } = require('../errorHandler');

suite('Error Handler Tests', () => {
    suite('Error Classification', () => {
        test('should classify syntax errors correctly', () => {
            const syntaxError = new Error('Unexpected token }');
            const errorInfo = ErrorHandler.handleParseError(syntaxError, 'test.js');

            assert.strictEqual(errorInfo.type, 'syntax');
            assert.ok(errorInfo.message.includes('Syntax error'));
            assert.ok(errorInfo.suggestion.includes('syntax errors'));
        });

        test('should classify babel errors correctly', () => {
            const babelError = new Error('Unknown plugin "invalidPlugin" specified');
            const errorInfo = ErrorHandler.handleParseError(babelError, 'test.js');

            assert.strictEqual(errorInfo.type, 'babel');
            assert.ok(errorInfo.message.includes('Babel parsing error'));
            assert.ok(errorInfo.suggestion.includes('fallback'));
        });

        test('should classify file system errors correctly', () => {
            const fileError = new Error('ENOENT: no such file or directory');
            fileError.code = 'ENOENT';
            const errorInfo = ErrorHandler.handleFileError(fileError, 'test.js');

            assert.strictEqual(errorInfo.type, 'file_not_found');
            assert.ok(errorInfo.message.includes('File not found'));
        });

        test('should classify permission errors correctly', () => {
            const permissionError = new Error('EACCES: permission denied');
            permissionError.code = 'EACCES';
            const errorInfo = ErrorHandler.handleFileError(permissionError, 'test.js');

            assert.strictEqual(errorInfo.type, 'permission');
            assert.ok(errorInfo.message.includes('Permission denied'));
        });
    });

    suite('Validation Helper', () => {
        test('should validate editor correctly', () => {
            assert.throws(() => ValidationHelper.validateEditor(null), /No active editor/);
            assert.throws(() => ValidationHelper.validateEditor(undefined), /No active editor/);
            assert.ok(ValidationHelper.validateEditor({ document: {} }));
        });

        test('should validate workspace correctly', () => {
            // Mock vscode workspace
            const mockVscode = {
                workspace: {
                    workspaceFolders: null
                }
            };

            assert.throws(() => ValidationHelper.validateWorkspace(), /No workspace/);
        });

        test('should validate selection correctly', () => {
            const emptySelection = { isEmpty: true };
            const validSelection = { isEmpty: false };

            assert.throws(() => ValidationHelper.validateSelection(emptySelection), /No text selected/);
            assert.ok(ValidationHelper.validateSelection(validSelection));
        });

        test('should validate file types correctly', () => {
            const supportedTypes = ['javascript', 'typescript'];

            assert.ok(ValidationHelper.validateFileType('test.js', supportedTypes));
            assert.ok(ValidationHelper.validateFileType('test.ts', supportedTypes));
            assert.ok(!ValidationHelper.validateFileType('test.py', supportedTypes));
            assert.ok(ValidationHelper.validateFileType('test.any', [])); // Empty array allows all
        });

        test('should convert file extensions to language IDs', () => {
            assert.strictEqual(ValidationHelper.getLanguageFromExtension('js'), 'javascript');
            assert.strictEqual(ValidationHelper.getLanguageFromExtension('ts'), 'typescript');
            assert.strictEqual(ValidationHelper.getLanguageFromExtension('jsx'), 'javascriptreact');
            assert.strictEqual(ValidationHelper.getLanguageFromExtension('tsx'), 'typescriptreact');
            assert.strictEqual(ValidationHelper.getLanguageFromExtension('py'), 'python');
            assert.strictEqual(ValidationHelper.getLanguageFromExtension('unknown'), 'unknown');
        });

        test('should check exclude patterns correctly', () => {
            const excludePatterns = ['**/node_modules/**', '**/*.min.js', '**/dist/**'];

            assert.ok(ValidationHelper.shouldExcludeFile('/path/node_modules/lib.js', excludePatterns));
            assert.ok(ValidationHelper.shouldExcludeFile('/path/script.min.js', excludePatterns));
            assert.ok(ValidationHelper.shouldExcludeFile('/path/dist/bundle.js', excludePatterns));
            assert.ok(!ValidationHelper.shouldExcludeFile('/path/src/main.js', excludePatterns));
            assert.ok(!ValidationHelper.shouldExcludeFile('/path/test.js', []));
        });
    });

    suite('Error Logging', () => {
        test('should log errors with context', () => {
            let loggedMessage;
            const originalError = console.error;
            console.error = (message) => {
                loggedMessage = message;
            };

            const testError = new Error('Test error message');
            ErrorHandler.logError(testError, 'test context');

            assert.ok(loggedMessage.includes('Debug Cleanup Pro Error'));
            assert.ok(loggedMessage.includes('test context'));
            assert.ok(loggedMessage.includes('Test error message'));

            console.error = originalError;
        });

        test('should log errors without context', () => {
            let loggedMessage;
            const originalError = console.error;
            console.error = (message) => {
                loggedMessage = message;
            };

            const testError = new Error('Test error message');
            ErrorHandler.logError(testError);

            assert.ok(loggedMessage.includes('Debug Cleanup Pro Error'));
            assert.ok(loggedMessage.includes('Test error message'));
            assert.ok(!loggedMessage.includes('undefined'));

            console.error = originalError;
        });
    });

    suite('Workspace Error Handling', () => {
        test('should handle workspace-specific errors', () => {
            const workspaceError = new Error('No workspace folder found');
            const errorInfo = ErrorHandler.handleWorkspaceError(workspaceError, 'cleanup');

            assert.strictEqual(errorInfo.type, 'workspace');
            assert.ok(errorInfo.message.includes('Workspace error during cleanup'));
        });

        test('should handle general operation errors', () => {
            const operationError = new Error('Operation failed for unknown reason');
            const errorInfo = ErrorHandler.handleWorkspaceError(operationError, 'scanning');

            assert.strictEqual(errorInfo.type, 'operation');
            assert.ok(errorInfo.message.includes('Operation failed: scanning'));
        });
    });

    suite('File System Error Types', () => {
        test('should handle too many files error', () => {
            const tooManyFilesError = new Error('EMFILE: too many open files');
            tooManyFilesError.code = 'EMFILE';
            const errorInfo = ErrorHandler.handleFileError(tooManyFilesError, 'test.js');

            assert.strictEqual(errorInfo.type, 'too_many_files');
            assert.ok(errorInfo.suggestion.includes('smaller workspace'));
        });

        test('should handle generic file system errors', () => {
            const genericError = new Error('Unknown file system error');
            const errorInfo = ErrorHandler.handleFileError(genericError, 'test.js');

            assert.strictEqual(errorInfo.type, 'file_system');
            assert.ok(errorInfo.message.includes('File system error'));
        });
    });

    suite('Error Message Quality', () => {
        test('should provide helpful error messages', () => {
            const syntaxError = new Error('Unexpected token }');
            const errorInfo = ErrorHandler.handleParseError(syntaxError, 'broken.js');

            assert.ok(errorInfo.message.length > 20, 'Should provide descriptive message');
            assert.ok(errorInfo.suggestion.length > 20, 'Should provide helpful suggestion');
            assert.ok(errorInfo.type.length > 0, 'Should categorize error type');
        });

        test('should include file paths in error messages', () => {
            const error = new Error('Test error');
            const errorInfo = ErrorHandler.handleParseError(error, '/path/to/test.js');

            assert.ok(errorInfo.message.includes('/path/to/test.js'));
        });

        test('should provide context-appropriate suggestions', () => {
            const permissionError = new Error('Permission denied');
            permissionError.code = 'EACCES';
            const errorInfo = ErrorHandler.handleFileError(permissionError, 'test.js');

            assert.ok(errorInfo.suggestion.includes('permissions') || errorInfo.suggestion.includes('privileges'));
        });
    });
});