const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');
const { CodeCleaner } = require('./cleaner');

class DebugStatementParser {
    constructor() {
        this.debugStatements = [];
    }

    parseCode(code, filePath = 'unknown') {
        this.debugStatements = [];

        try {
            const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
            const isJSX = filePath.endsWith('.jsx') || filePath.endsWith('.tsx');

            const ast = parse(code, {
                sourceType: 'module',
                allowImportExportEverywhere: true,
                allowReturnOutsideFunction: true,
                plugins: [
                    'asyncGenerators',
                    'bigInt',
                    'classProperties',
                    'decorators-legacy',
                    'doExpressions',
                    'dynamicImport',
                    'exportDefaultFrom',
                    'exportNamespaceFrom',
                    'functionBind',
                    'functionSent',
                    'importMeta',
                    'nullishCoalescingOperator',
                    'numericSeparator',
                    'objectRestSpread',
                    'optionalCatchBinding',
                    'optionalChaining',
                    'throwExpressions',
                    'topLevelAwait',
                    'trailingFunctionCommas',
                    ...(isTypeScript ? ['typescript'] : []),
                    ...(isJSX ? ['jsx'] : [])
                ]
            });

            traverse(ast, {
                CallExpression: (path) => {
                    this.handleCallExpression(path, code);
                },
                DebuggerStatement: (path) => {
                    this.handleDebuggerStatement(path, code);
                }
            });

        } catch (error) {
            console.warn(`Failed to parse file ${filePath}:`, error.message);
            return this.fallbackRegexParse(code);
        }

        return this.debugStatements;
    }

    handleCallExpression(path, code) {
        const node = path.node;

        if (this.isConsoleCall(node)) {
            this.addDebugStatement(node, code, 'console');
        } else if (this.isPrintCall(node)) {
            this.addDebugStatement(node, code, 'print');
        } else if (this.isSystemOutCall(node)) {
            this.addDebugStatement(node, code, 'system.out');
        }
    }

    handleDebuggerStatement(path, code) {
        const node = path.node;
        this.addDebugStatement(node, code, 'debugger');
    }

    isConsoleCall(node) {
        return (
            t.isMemberExpression(node.callee) &&
            t.isIdentifier(node.callee.object, { name: 'console' }) &&
            t.isIdentifier(node.callee.property) &&
            ['log', 'debug', 'info', 'warn', 'error', 'trace', 'table', 'time', 'timeEnd'].includes(node.callee.property.name)
        );
    }

    isPrintCall(node) {
        return t.isIdentifier(node.callee, { name: 'print' });
    }

    isSystemOutCall(node) {
        return (
            t.isMemberExpression(node.callee) &&
            t.isMemberExpression(node.callee.object) &&
            t.isIdentifier(node.callee.object.object, { name: 'System' }) &&
            t.isIdentifier(node.callee.object.property, { name: 'out' }) &&
            t.isIdentifier(node.callee.property, { name: 'println' })
        );
    }

    addDebugStatement(node, code, type) {
        const start = node.start;
        let end = node.end;

        // Extend end position to include optional semicolon
        const afterStatement = code.substring(end);
        const semicolonMatch = afterStatement.match(/^[\s]*;/);
        if (semicolonMatch) {
            end += semicolonMatch[0].length;
        }

        // Find the actual line boundaries in the source code
        const lines = code.split('\n');
        let lineStart = 0;
        let lineEnd = 0;
        let lineNumber = 1;

        for (let i = 0; i < lines.length; i++) {
            lineEnd = lineStart + lines[i].length;
            if (start >= lineStart && start <= lineEnd) {
                lineNumber = i + 1;
                break;
            }
            lineStart = lineEnd + 1; // +1 for newline character
        }

        // Get the full line content
        const lineContent = lines[lineNumber - 1];
        const statementText = code.substring(start, end);

        this.debugStatements.push({
            type,
            line: lineNumber,
            column: start - lineStart,
            start,
            end,
            text: statementText,
            lineContent: lineContent.trim()
        });
    }

    fallbackRegexParse(code) {
        const patterns = [
            // Enhanced console pattern to handle complex scenarios
            { regex: /console\.(log|debug|info|warn|error|trace|table|time|timeEnd)\s*\([^)]*\)\s*;?\s*/g, type: 'console' },
            { regex: /print\s*\([^)]*\)\s*;?\s*/g, type: 'print' },
            { regex: /System\.out\.println\s*\([^)]*\)\s*;?\s*/g, type: 'system.out' },
            { regex: /debugger\s*;?\s*/g, type: 'debugger' }
        ];

        const statements = [];
        const lines = code.split('\n');

        patterns.forEach(({ regex, type }) => {
            let match;
            while ((match = regex.exec(code)) !== null) {
                const start = match.index;
                const end = start + match[0].length;

                // Find line number
                let lineStart = 0;
                let lineNumber = 1;
                for (let i = 0; i < lines.length; i++) {
                    if (start >= lineStart && start <= lineStart + lines[i].length) {
                        lineNumber = i + 1;
                        break;
                    }
                    lineStart += lines[i].length + 1;
                }

                statements.push({
                    type,
                    line: lineNumber,
                    column: start - lineStart,
                    start,
                    end,
                    text: match[0],
                    lineContent: lines[lineNumber - 1]?.trim() || ''
                });
            }
        });

        return statements.sort((a, b) => a.start - b.start);
    }

    removeDebugStatements(code, statements) {
        const cleaner = new CodeCleaner();
        return cleaner.removeDebugStatements(code, statements);
    }

    removeConsoleLogsOnly(code, statements) {
        const cleaner = new CodeCleaner();
        return cleaner.removeConsoleLogsOnly(code, statements);
    }

    removePrintStatementsOnly(code, statements) {
        const cleaner = new CodeCleaner();
        return cleaner.removePrintStatementsOnly(code, statements);
    }

    removeDebuggerStatementsOnly(code, statements) {
        const cleaner = new CodeCleaner();
        return cleaner.removeDebuggerStatementsOnly(code, statements);
    }

    previewChanges(code, statements) {
        const cleaner = new CodeCleaner();
        return cleaner.previewChanges(code, statements);
    }

    generateCleanupReport(originalCode, cleanResult) {
        const cleaner = new CodeCleaner();
        return cleaner.generateCleanupReport(originalCode, cleanResult);
    }
}

module.exports = { DebugStatementParser };