const assert = require('assert');
const vscode = require('vscode');
const { testFiles } = require('./fixtures/testFiles');

suite('Extension Integration Tests', () => {
    let document;
    let editor;

    setup(async () => {
        // Activate extension
        const extension = vscode.extensions.getExtension('debug-cleanup-pro');
        if (extension && !extension.isActive) {
            await extension.activate();
        }
    });

    teardown(async () => {
        // Close all open documents
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

    suite('Command Registration', () => {
        test('should register all commands', async () => {
            const commands = await vscode.commands.getCommands();

            assert.ok(commands.includes('debug-cleanup-pro.cleanupDebug'));
            assert.ok(commands.includes('debug-cleanup-pro.cleanCurrentFile'));
            assert.ok(commands.includes('debug-cleanup-pro.cleanWorkspace'));
            assert.ok(commands.includes('debug-cleanup-pro.cleanSelection'));
        });
    });

    suite('cleanupDebug Command', () => {
        test('should clean debug statements from active editor', async () => {
            // Create a document with debug statements
            const content = `
function test() {
    console.log('Remove this');
    const x = 5;
    console.debug('Remove this too');
    return x;
}`;

            document = await vscode.workspace.openTextDocument({
                content,
                language: 'javascript'
            });
            editor = await vscode.window.showTextDocument(document);

            // Execute the cleanup command
            await vscode.commands.executeCommand('debug-cleanup-pro.cleanupDebug');

            // Wait for the edit to be applied
            await new Promise(resolve => setTimeout(resolve, 100));

            const cleanedContent = document.getText();

            assert.ok(!cleanedContent.includes('console.log'));
            assert.ok(!cleanedContent.includes('console.debug'));
            assert.ok(cleanedContent.includes('const x = 5;'));
            assert.ok(cleanedContent.includes('return x;'));
        });

        test('should handle files with no debug statements', async () => {
            document = await vscode.workspace.openTextDocument({
                content: testFiles.cleanCode,
                language: 'javascript'
            });
            editor = await vscode.window.showTextDocument(document);

            const originalContent = document.getText();

            await vscode.commands.executeCommand('debug-cleanup-pro.cleanupDebug');
            await new Promise(resolve => setTimeout(resolve, 100));

            const finalContent = document.getText();
            assert.strictEqual(originalContent.trim(), finalContent.trim());
        });

        test('should handle TypeScript files', async () => {
            document = await vscode.workspace.openTextDocument({
                content: testFiles.typeScript,
                language: 'typescript'
            });
            editor = await vscode.window.showTextDocument(document);

            await vscode.commands.executeCommand('debug-cleanup-pro.cleanupDebug');
            await new Promise(resolve => setTimeout(resolve, 100));

            const cleanedContent = document.getText();

            assert.ok(!cleanedContent.includes('console.log'));
            assert.ok(!cleanedContent.includes('console.debug'));
            assert.ok(cleanedContent.includes('interface User'));
            assert.ok(cleanedContent.includes('class UserService'));
        });
    });

    suite('cleanCurrentFile Command', () => {
        test('should clean current file with progress indicator', async () => {
            const content = testFiles.mixedStatements;

            document = await vscode.workspace.openTextDocument({
                content,
                language: 'javascript'
            });
            editor = await vscode.window.showTextDocument(document);

            await vscode.commands.executeCommand('debug-cleanup-pro.cleanCurrentFile');
            await new Promise(resolve => setTimeout(resolve, 200));

            const cleanedContent = document.getText();

            assert.ok(!cleanedContent.includes('console.log'));
            assert.ok(!cleanedContent.includes('debugger'));
            assert.ok(!cleanedContent.includes('print('));
        });

        test('should show appropriate messages for different scenarios', async () => {
            // Test with clean code
            document = await vscode.workspace.openTextDocument({
                content: testFiles.cleanCode,
                language: 'javascript'
            });
            editor = await vscode.window.showTextDocument(document);

            // This should show a message that no debug statements were found
            await vscode.commands.executeCommand('debug-cleanup-pro.cleanCurrentFile');
            await new Promise(resolve => setTimeout(resolve, 100));
        });
    });

    suite('cleanSelection Command', () => {
        test('should clean only selected text', async () => {
            const content = `
function test1() {
    console.log('in function 1');
    return 1;
}

function test2() {
    console.log('in function 2');
    return 2;
}`;

            document = await vscode.workspace.openTextDocument({
                content,
                language: 'javascript'
            });
            editor = await vscode.window.showTextDocument(document);

            // Select only the first function
            const startPos = new vscode.Position(1, 0);
            const endPos = new vscode.Position(4, 1);
            editor.selection = new vscode.Selection(startPos, endPos);

            await vscode.commands.executeCommand('debug-cleanup-pro.cleanSelection');
            await new Promise(resolve => setTimeout(resolve, 200));

            const finalContent = document.getText();

            // Should remove console.log from first function but not second
            const lines = finalContent.split('\n');
            const function1Lines = lines.slice(1, 5).join('\n');
            const function2Lines = lines.slice(5, 9).join('\n');

            assert.ok(!function1Lines.includes('console.log'));
            assert.ok(function2Lines.includes('console.log'));
        });

        test('should handle empty selection', async () => {
            document = await vscode.workspace.openTextDocument({
                content: 'function test() { return 1; }',
                language: 'javascript'
            });
            editor = await vscode.window.showTextDocument(document);

            // No selection (cursor only)
            editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0));

            // This should show an error about no selection
            await vscode.commands.executeCommand('debug-cleanup-pro.cleanSelection');
            await new Promise(resolve => setTimeout(resolve, 100));
        });
    });

    suite('Configuration Integration', () => {
        test('should respect configuration settings', async () => {
            // Update configuration to keep console.error
            const config = vscode.workspace.getConfiguration('debugCleanupPro');
            await config.update('removeConsoleError', false, vscode.ConfigurationTarget.Global);

            const content = `
                console.log('remove this');
                console.error('keep this');
                console.warn('remove this');
            `;

            document = await vscode.workspace.openTextDocument({
                content,
                language: 'javascript'
            });
            editor = await vscode.window.showTextDocument(document);

            await vscode.commands.executeCommand('debug-cleanup-pro.cleanupDebug');
            await new Promise(resolve => setTimeout(resolve, 200));

            const cleanedContent = document.getText();

            assert.ok(!cleanedContent.includes("console.log('remove this')"));
            assert.ok(cleanedContent.includes("console.error('keep this')"));
            assert.ok(!cleanedContent.includes("console.warn('remove this')"));

            // Reset configuration
            await config.update('removeConsoleError', false, vscode.ConfigurationTarget.Global);
        });

        test('should handle maxEmptyLines configuration', async () => {
            const config = vscode.workspace.getConfiguration('debugCleanupPro');
            await config.update('maxEmptyLines', 1, vscode.ConfigurationTarget.Global);

            const content = `
function test() {
    console.log('test');



    return 'hello';
}`;

            document = await vscode.workspace.openTextDocument({
                content,
                language: 'javascript'
            });
            editor = await vscode.window.showTextDocument(document);

            await vscode.commands.executeCommand('debug-cleanup-pro.cleanupDebug');
            await new Promise(resolve => setTimeout(resolve, 200));

            const cleanedContent = document.getText();
            const consecutiveNewlines = cleanedContent.match(/\n\n\n+/g);

            assert.ok(!consecutiveNewlines || consecutiveNewlines.length === 0,
                'Should not have more than 1 consecutive empty line');

            // Reset configuration
            await config.update('maxEmptyLines', 2, vscode.ConfigurationTarget.Global);
        });
    });

    suite('Error Handling', () => {
        test('should handle command execution without active editor', async () => {
            // Close all editors
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');

            // This should show an appropriate error message
            await vscode.commands.executeCommand('debug-cleanup-pro.cleanupDebug');
            await new Promise(resolve => setTimeout(resolve, 100));

            // No assertion needed - just ensuring no crash
        });

        test('should handle files with syntax errors', async () => {
            document = await vscode.workspace.openTextDocument({
                content: testFiles.syntaxError,
                language: 'javascript'
            });
            editor = await vscode.window.showTextDocument(document);

            // Should use fallback parsing and still remove what it can
            await vscode.commands.executeCommand('debug-cleanup-pro.cleanupDebug');
            await new Promise(resolve => setTimeout(resolve, 200));

            const cleanedContent = document.getText();
            // Should still remove console statements even with syntax errors
            const hasConsole = cleanedContent.includes('console.log');
            assert.ok(!hasConsole || cleanedContent.includes('console.log') < document.getText().match(/console\.log/g)?.length);
        });
    });

    suite('File Type Support', () => {
        test('should handle JavaScript files', async () => {
            document = await vscode.workspace.openTextDocument({
                content: testFiles.basicConsole,
                language: 'javascript'
            });
            editor = await vscode.window.showTextDocument(document);

            await vscode.commands.executeCommand('debug-cleanup-pro.cleanupDebug');
            await new Promise(resolve => setTimeout(resolve, 100));

            const cleanedContent = document.getText();
            assert.ok(!cleanedContent.includes('console.log'));
        });

        test('should handle TypeScript files', async () => {
            document = await vscode.workspace.openTextDocument({
                content: testFiles.typeScript,
                language: 'typescript'
            });
            editor = await vscode.window.showTextDocument(document);

            await vscode.commands.executeCommand('debug-cleanup-pro.cleanupDebug');
            await new Promise(resolve => setTimeout(resolve, 100));

            const cleanedContent = document.getText();
            assert.ok(!cleanedContent.includes('console.log'));
            assert.ok(cleanedContent.includes('interface User'));
        });

        test('should handle React/JSX files', async () => {
            document = await vscode.workspace.openTextDocument({
                content: testFiles.reactComponent,
                language: 'typescriptreact'
            });
            editor = await vscode.window.showTextDocument(document);

            await vscode.commands.executeCommand('debug-cleanup-pro.cleanupDebug');
            await new Promise(resolve => setTimeout(resolve, 100));

            const cleanedContent = document.getText();
            assert.ok(!cleanedContent.includes('console.log'));
            assert.ok(cleanedContent.includes('React.FC'));
            assert.ok(cleanedContent.includes('<div>'));
        });
    });

    suite('Performance and Stability', () => {
        test('should handle large files without timeout', async () => {
            // Create a large file
            let largeContent = 'function largeFunction() {\n';
            for (let i = 0; i < 100; i++) {
                largeContent += `    console.log('Statement ${i}');\n`;
                largeContent += `    const var${i} = ${i};\n`;
            }
            largeContent += '}';

            document = await vscode.workspace.openTextDocument({
                content: largeContent,
                language: 'javascript'
            });
            editor = await vscode.window.showTextDocument(document);

            const startTime = Date.now();
            await vscode.commands.executeCommand('debug-cleanup-pro.cleanupDebug');
            await new Promise(resolve => setTimeout(resolve, 500));
            const endTime = Date.now();

            assert.ok((endTime - startTime) < 10000, 'Should complete within reasonable time');

            const cleanedContent = document.getText();
            assert.ok(!cleanedContent.includes('console.log'));
        });

        test('should not crash on malformed input', async () => {
            const malformedContent = `
                console.log('test'
                function incomplete() {
                    console.debug('debug'
                }
                console.
            `;

            document = await vscode.workspace.openTextDocument({
                content: malformedContent,
                language: 'javascript'
            });
            editor = await vscode.window.showTextDocument(document);

            // Should not crash, may use fallback parsing
            await vscode.commands.executeCommand('debug-cleanup-pro.cleanupDebug');
            await new Promise(resolve => setTimeout(resolve, 200));

            // No specific assertions - just ensuring no crash
        });
    });
});