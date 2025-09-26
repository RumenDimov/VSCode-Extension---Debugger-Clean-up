const vscode = require('vscode');
const { DebugStatementParser } = require('./parser');
const { CodeCleaner } = require('./cleaner');
const { ErrorHandler, ProgressReporter, UserFeedback, ValidationHelper } = require('./errorHandler');

function activate(context) {
    console.log('Debug Cleanup Pro is now active!');

    function getConfiguration() {
        const config = vscode.workspace.getConfiguration('debugCleanupPro');
        return {
            removeConsoleLog: config.get('removeConsoleLog'),
            removeConsoleWarn: config.get('removeConsoleWarn'),
            removeConsoleError: config.get('removeConsoleError'),
            removeConsoleInfo: config.get('removeConsoleInfo'),
            removeConsoleDebug: config.get('removeConsoleDebug'),
            removeConsoleTrace: config.get('removeConsoleTrace'),
            removeDebugger: config.get('removeDebugger'),
            removePrint: config.get('removePrint'),
            removeSystemOut: config.get('removeSystemOut'),
            maxEmptyLines: config.get('maxEmptyLines'),
            cleanWhitespace: config.get('cleanWhitespace'),
            preserveComments: config.get('preserveComments'),
            showPreview: config.get('showPreview'),
            autoSave: config.get('autoSave'),
            excludePatterns: config.get('excludePatterns'),
            includeFileTypes: config.get('includeFileTypes')
        };
    }

    let disposable = vscode.commands.registerCommand('debug-cleanup-pro.cleanupDebug', async function () {
        const startTime = Date.now();

        try {
            ValidationHelper.validateEditor(vscode.window.activeTextEditor);

            const editor = vscode.window.activeTextEditor;
            const document = editor.document;
            const text = document.getText();
            const filePath = document.fileName;
            const fileName = filePath.split('\\').pop() || filePath.split('/').pop();

            UserFeedback.statusBarMessage(`Analyzing ${fileName}...`);

            const config = getConfiguration();

            // Validate file type
            if (!ValidationHelper.validateFileType(filePath, config.includeFileTypes)) {
                UserFeedback.warning(
                    `File type not supported: ${fileName}`,
                    'Check the includeFileTypes setting to add support for this file type.'
                );
                return;
            }

            const parser = new DebugStatementParser();
            let statements;

            try {
                statements = parser.parseCode(text, filePath);
            } catch (parseError) {
                const errorInfo = ErrorHandler.handleParseError(parseError, filePath);
                UserFeedback.warning(errorInfo.message, errorInfo.suggestion);

                // Try fallback parsing
                try {
                    statements = parser.fallbackRegexParse(text);
                    UserFeedback.statusBarMessage('Using fallback regex parsing...');
                } catch (fallbackError) {
                    ErrorHandler.showError(ErrorHandler.handleParseError(fallbackError, filePath));
                    return;
                }
            }

            if (statements.length === 0) {
                UserFeedback.success(`No debug statements found in ${fileName}`);
                return;
            }

            const cleaner = new CodeCleaner(config);
            const cleanResult = cleaner.removeDebugStatements(text, statements);

            if (cleanResult.removedCount === 0) {
                UserFeedback.success(
                    `No debug statements to clean in ${fileName}`,
                    'All found debug statements are disabled in your configuration settings.'
                );
                return;
            }

            // Show preview if configured
            if (config.showPreview) {
                const preview = cleaner.previewChanges(text, statements);
                const previewMessage = preview.map(change =>
                    `Line ${change.line}: ${change.action} - ${change.text}`
                ).join('\n');

                const proceed = await UserFeedback.confirm(
                    `Found ${cleanResult.removedCount} debug statements to remove. Continue?`,
                    'Clean Now',
                    'Cancel'
                );

                if (!proceed) {
                    UserFeedback.statusBarMessage('Cleanup cancelled');
                    return;
                }
            }

            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(text.length)
            );
            edit.replace(document.uri, fullRange, cleanResult.cleanCode);

            await vscode.workspace.applyEdit(edit);

            const duration = Date.now() - startTime;
            const report = cleaner.generateCleanupReport(text, cleanResult);

            UserFeedback.success(
                `Cleaned ${fileName}: Removed ${cleanResult.removedCount} debug statement(s)`,
                `Lines reduced: ${report.linesReduced}\nDuration: ${(duration / 1000).toFixed(2)}s`
            );

            if (config.autoSave) {
                await document.save();
                UserFeedback.statusBarMessage('File saved automatically');
            }

        } catch (error) {
            const errorInfo = error.message.includes('No active editor')
                ? { type: 'validation', message: error.message, suggestion: 'Open a file in the editor first.' }
                : ErrorHandler.handleFileError(error, 'current file');

            ErrorHandler.showError(errorInfo);
        }
    });

    context.subscriptions.push(disposable);

    let cleanCurrentFileCommand = vscode.commands.registerCommand('debug-cleanup-pro.cleanCurrentFile', async function () {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Cleaning current file...",
            cancellable: false
        }, async (progress) => {
            const startTime = Date.now();

            try {
                ValidationHelper.validateEditor(vscode.window.activeTextEditor);

                const editor = vscode.window.activeTextEditor;
                const document = editor.document;
                const text = document.getText();
                const filePath = document.fileName;
                const fileName = filePath.split('\\').pop() || filePath.split('/').pop();

                progress.report({ increment: 10, message: `Analyzing ${fileName}...` });

                const config = getConfiguration();

                // Validate file type
                if (!ValidationHelper.validateFileType(filePath, config.includeFileTypes)) {
                    UserFeedback.warning(
                        `File type not supported: ${fileName}`,
                        'Check the includeFileTypes setting to add support for this file type.'
                    );
                    return;
                }

                progress.report({ increment: 30, message: 'Parsing code...' });

                const parser = new DebugStatementParser();
                let statements;

                try {
                    statements = parser.parseCode(text, filePath);
                } catch (parseError) {
                    const errorInfo = ErrorHandler.handleParseError(parseError, filePath);
                    UserFeedback.warning(errorInfo.message, errorInfo.suggestion);

                    try {
                        statements = parser.fallbackRegexParse(text);
                        progress.report({ increment: 20, message: 'Using fallback parsing...' });
                    } catch (fallbackError) {
                        ErrorHandler.showError(ErrorHandler.handleParseError(fallbackError, filePath));
                        return;
                    }
                }

                if (statements.length === 0) {
                    UserFeedback.success(`No debug statements found in ${fileName}`);
                    return;
                }

                progress.report({ increment: 30, message: 'Cleaning debug statements...' });

                const cleaner = new CodeCleaner(config);
                const cleanResult = cleaner.removeDebugStatements(text, statements);

                if (cleanResult.removedCount === 0) {
                    UserFeedback.success(
                        `No debug statements to clean in ${fileName}`,
                        'All found debug statements are disabled in your configuration settings.'
                    );
                    return;
                }

                const edit = new vscode.WorkspaceEdit();
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(text.length)
                );
                edit.replace(document.uri, fullRange, cleanResult.cleanCode);

                await vscode.workspace.applyEdit(edit);

                progress.report({ increment: 10, message: 'Finalizing...' });

                const duration = Date.now() - startTime;
                const report = cleaner.generateCleanupReport(text, cleanResult);

                UserFeedback.success(
                    `Cleaned ${fileName}: Removed ${cleanResult.removedCount} debug statement(s)`,
                    `Lines reduced: ${report.linesReduced}\nDuration: ${(duration / 1000).toFixed(2)}s`
                );

                if (config.autoSave) {
                    await document.save();
                    UserFeedback.statusBarMessage('File saved automatically');
                }

            } catch (error) {
                const errorInfo = error.message.includes('No active editor')
                    ? { type: 'validation', message: error.message, suggestion: 'Open a file in the editor first.' }
                    : ErrorHandler.handleFileError(error, filePath || 'current file');

                ErrorHandler.showError(errorInfo);
            }
        });
    });

    context.subscriptions.push(cleanCurrentFileCommand);

    let cleanWorkspaceCommand = vscode.commands.registerCommand('debug-cleanup-pro.cleanWorkspace', async function () {
        const startTime = Date.now();

        try {
            ValidationHelper.validateWorkspace();

            const config = getConfiguration();

            // Show confirmation dialog
            const proceed = await UserFeedback.confirm(
                'This will clean debug statements from all supported files in your workspace. Continue?',
                'Clean Workspace',
                'Cancel'
            );

            if (!proceed) {
                UserFeedback.statusBarMessage('Workspace cleanup cancelled');
                return;
            }

            return vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Cleaning workspace debug statements...",
                cancellable: true
            }, async (progress, token) => {
                let totalFiles = 0;
                let processedFiles = 0;
                let skippedFiles = 0;
                let totalRemovedStatements = 0;
                let errors = 0;
                const errorDetails = [];

                try {
                    // Get all supported files in workspace
                    const filePattern = getFilePattern(config.includeFileTypes);
                    const files = await vscode.workspace.findFiles(filePattern, getExcludePattern(config.excludePatterns));

                    totalFiles = files.length;

                    if (totalFiles === 0) {
                        UserFeedback.warning(
                            'No supported files found in workspace',
                            'Check your includeFileTypes and excludePatterns settings.'
                        );
                        return;
                    }

                    progress.report({ increment: 0, message: `Found ${totalFiles} files to process` });

                    for (const fileUri of files) {
                        if (token.isCancellationRequested) {
                            break;
                        }

                        const fileName = fileUri.fsPath.split('\\').pop() || fileUri.fsPath.split('/').pop();

                        try {
                            // Additional validation for excluded files
                            if (ValidationHelper.shouldExcludeFile(fileUri.fsPath, config.excludePatterns)) {
                                skippedFiles++;
                                continue;
                            }

                            const document = await vscode.workspace.openTextDocument(fileUri);
                            const text = document.getText();

                            const parser = new DebugStatementParser();
                            let statements;

                            try {
                                statements = parser.parseCode(text, document.fileName);
                            } catch (parseError) {
                                // Try fallback parsing
                                try {
                                    statements = parser.fallbackRegexParse(text);
                                } catch (fallbackError) {
                                    errors++;
                                    errorDetails.push({
                                        file: fileName,
                                        error: ErrorHandler.handleParseError(fallbackError, fileUri.fsPath)
                                    });
                                    continue;
                                }
                            }

                            if (statements.length > 0) {
                                const cleaner = new CodeCleaner(config);
                                const cleanResult = cleaner.removeDebugStatements(text, statements);

                                if (cleanResult.removedCount > 0) {
                                    const edit = new vscode.WorkspaceEdit();
                                    const fullRange = new vscode.Range(
                                        document.positionAt(0),
                                        document.positionAt(text.length)
                                    );
                                    edit.replace(fileUri, fullRange, cleanResult.cleanCode);
                                    await vscode.workspace.applyEdit(edit);

                                    totalRemovedStatements += cleanResult.removedCount;

                                    if (config.autoSave) {
                                        await document.save();
                                    }
                                }
                            }

                        } catch (fileError) {
                            errors++;
                            errorDetails.push({
                                file: fileName,
                                error: ErrorHandler.handleFileError(fileError, fileUri.fsPath)
                            });
                        }

                        processedFiles++;
                        const progressPercent = Math.round((processedFiles / totalFiles) * 100);
                        progress.report({
                            increment: progressPercent - Math.round(((processedFiles - 1) / totalFiles) * 100),
                            message: `Processing ${fileName} (${processedFiles}/${totalFiles})`
                        });
                    }

                    const duration = Date.now() - startTime;

                    if (!token.isCancellationRequested) {
                        UserFeedback.showCleanupSummary({
                            processedFiles,
                            totalFiles,
                            removedStatements: totalRemovedStatements,
                            skippedFiles,
                            errors,
                            duration
                        });

                        // Log error details if any
                        if (errors > 0) {
                            console.log('Workspace cleanup errors:', errorDetails);
                        }
                    } else {
                        UserFeedback.warning('Workspace cleanup was cancelled');
                    }

                } catch (error) {
                    const errorInfo = ErrorHandler.handleWorkspaceError(error, 'cleanup');
                    ErrorHandler.showError(errorInfo);
                }
            });

        } catch (error) {
            const errorInfo = error.message.includes('No workspace')
                ? { type: 'validation', message: error.message, suggestion: 'Open a workspace folder first.' }
                : ErrorHandler.handleWorkspaceError(error, 'initialization');

            ErrorHandler.showError(errorInfo);
        }
    });

    let cleanSelectionCommand = vscode.commands.registerCommand('debug-cleanup-pro.cleanSelection', async function () {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: "Cleaning selection...",
            cancellable: false
        }, async (progress) => {
            const startTime = Date.now();

            try {
                ValidationHelper.validateEditor(vscode.window.activeTextEditor);

                const editor = vscode.window.activeTextEditor;
                const selection = editor.selection;

                ValidationHelper.validateSelection(selection);

                const document = editor.document;
                const selectedText = document.getText(selection);
                const filePath = document.fileName;

                progress.report({ increment: 20, message: 'Analyzing selection...' });

                const config = getConfiguration();

                // Validate file type
                if (!ValidationHelper.validateFileType(filePath, config.includeFileTypes)) {
                    UserFeedback.warning(
                        'File type not supported for cleanup',
                        'Check the includeFileTypes setting to add support for this file type.'
                    );
                    return;
                }

                progress.report({ increment: 40, message: 'Parsing selected code...' });

                const parser = new DebugStatementParser();
                let statements;

                try {
                    statements = parser.parseCode(selectedText, filePath);
                } catch (parseError) {
                    const errorInfo = ErrorHandler.handleParseError(parseError, filePath);
                    UserFeedback.warning(errorInfo.message, errorInfo.suggestion);

                    try {
                        statements = parser.fallbackRegexParse(selectedText);
                        progress.report({ increment: 20, message: 'Using fallback parsing...' });
                    } catch (fallbackError) {
                        ErrorHandler.showError(ErrorHandler.handleParseError(fallbackError, filePath));
                        return;
                    }
                }

                if (statements.length === 0) {
                    UserFeedback.success('No debug statements found in selection');
                    return;
                }

                progress.report({ increment: 30, message: 'Cleaning debug statements...' });

                const cleaner = new CodeCleaner(config);
                const cleanResult = cleaner.removeDebugStatements(selectedText, statements);

                if (cleanResult.removedCount === 0) {
                    UserFeedback.success(
                        'No debug statements to clean in selection',
                        'All found debug statements are disabled in your configuration settings.'
                    );
                    return;
                }

                const edit = new vscode.WorkspaceEdit();
                edit.replace(document.uri, selection, cleanResult.cleanCode);

                await vscode.workspace.applyEdit(edit);

                progress.report({ increment: 10, message: 'Finalizing...' });

                const duration = Date.now() - startTime;

                UserFeedback.success(
                    `Cleaned selection: Removed ${cleanResult.removedCount} debug statement(s)`,
                    `Duration: ${(duration / 1000).toFixed(2)}s`
                );

                if (config.autoSave) {
                    await document.save();
                    UserFeedback.statusBarMessage('File saved automatically');
                }

            } catch (error) {
                let errorInfo;

                if (error.message.includes('No active editor')) {
                    errorInfo = { type: 'validation', message: error.message, suggestion: 'Open a file in the editor first.' };
                } else if (error.message.includes('No text selected')) {
                    errorInfo = { type: 'validation', message: error.message, suggestion: 'Select some text to clean debug statements from.' };
                } else {
                    errorInfo = ErrorHandler.handleFileError(error, 'selection');
                }

                ErrorHandler.showError(errorInfo);
            }
        });
    });

    function getFilePattern(includeFileTypes) {
        if (!includeFileTypes || includeFileTypes.length === 0) {
            return '**/*.{js,ts,jsx,tsx,java,py}';
        }

        const extensions = [];
        includeFileTypes.forEach(type => {
            switch (type.toLowerCase()) {
                case 'javascript':
                    extensions.push('js');
                    break;
                case 'typescript':
                    extensions.push('ts');
                    break;
                case 'javascriptreact':
                    extensions.push('jsx');
                    break;
                case 'typescriptreact':
                    extensions.push('tsx');
                    break;
                case 'java':
                    extensions.push('java');
                    break;
                case 'python':
                    extensions.push('py');
                    break;
                default:
                    extensions.push(type);
            }
        });

        return `**/*.{${extensions.join(',')}}`;
    }

    function getExcludePattern(excludePatterns) {
        if (!excludePatterns || excludePatterns.length === 0) {
            return '**/node_modules/**';
        }
        return `{${excludePatterns.join(',')}}`;
    }

    context.subscriptions.push(cleanWorkspaceCommand);
    context.subscriptions.push(cleanSelectionCommand);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};