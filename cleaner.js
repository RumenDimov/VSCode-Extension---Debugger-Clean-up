class CodeCleaner {
    constructor(config = {}) {
        this.removedStatements = [];
        this.config = {
            removeConsoleLog: config.removeConsoleLog ?? true,
            removeConsoleWarn: config.removeConsoleWarn ?? true,
            removeConsoleError: config.removeConsoleError ?? false,
            removeConsoleInfo: config.removeConsoleInfo ?? true,
            removeConsoleDebug: config.removeConsoleDebug ?? true,
            removeConsoleTrace: config.removeConsoleTrace ?? true,
            removeDebugger: config.removeDebugger ?? true,
            removePrint: config.removePrint ?? true,
            removeSystemOut: config.removeSystemOut ?? true,
            maxEmptyLines: config.maxEmptyLines ?? 2,
            cleanWhitespace: config.cleanWhitespace ?? true,
            preserveComments: config.preserveComments ?? true,
            showPreview: config.showPreview ?? false,
            autoSave: config.autoSave ?? false,
            excludePatterns: config.excludePatterns ?? [],
            includeFileTypes: config.includeFileTypes ?? []
        };
    }

    removeDebugStatements(code, statements) {
        if (!statements || statements.length === 0) {
            return { cleanCode: code, removedCount: 0, removedStatements: [] };
        }

        this.removedStatements = [];

        // Filter statements based on configuration
        const filteredStatements = this.filterStatementsByConfig(statements);

        if (filteredStatements.length === 0) {
            return { cleanCode: code, removedCount: 0, removedStatements: [] };
        }

        // Sort statements by position (descending) to avoid index shifting issues
        const sortedStatements = filteredStatements.sort((a, b) => b.start - a.start);

        let cleanCode = code;
        let removedCount = 0;

        sortedStatements.forEach(statement => {
            const removalResult = this.removeStatement(cleanCode, statement);
            cleanCode = removalResult.code;

            if (removalResult.removed) {
                removedCount++;
                this.removedStatements.push({
                    ...statement,
                    originalPosition: statement.start
                });
            }
        });

        // Clean up excessive whitespace after removal if configured
        if (this.config.cleanWhitespace) {
            cleanCode = this.cleanWhitespace(cleanCode);
        }

        return {
            cleanCode,
            removedCount,
            removedStatements: this.removedStatements.reverse()
        };
    }

    removeStatement(code, statement) {
        const before = code.substring(0, statement.start);
        const after = code.substring(statement.end);

        // Analyze the context around the statement
        const context = this.analyzeStatementContext(code, statement);

        let adjustedBefore = before;
        let adjustedAfter = after;

        if (context.isOnOwnLine) {
            // Statement is on its own line - remove the entire line including newline
            const result = this.removeEntireLine(before, after, context);
            adjustedBefore = result.before;
            adjustedAfter = result.after;
        } else if (context.isAtLineStart) {
            // Statement starts the line but has other content after
            adjustedAfter = this.cleanTrailingCommaOrSemicolon(after);
        } else if (context.isAtLineEnd) {
            // Statement ends the line but has other content before
            adjustedBefore = this.cleanLeadingCommaOrSemicolon(before);
        } else {
            // Statement is in the middle of a line
            adjustedBefore = this.cleanLeadingCommaOrSemicolon(before);
            adjustedAfter = this.cleanTrailingCommaOrSemicolon(after);
        }

        return {
            code: adjustedBefore + adjustedAfter,
            removed: true
        };
    }

    analyzeStatementContext(code, statement) {
        const lines = code.split('\n');
        let currentPos = 0;
        let lineNumber = 0;
        let lineStart = 0;

        // Find which line the statement is on
        for (let i = 0; i < lines.length; i++) {
            if (statement.start >= currentPos && statement.start < currentPos + lines[i].length + 1) {
                lineNumber = i;
                lineStart = currentPos;
                break;
            }
            currentPos += lines[i].length + 1; // +1 for newline
        }

        const line = lines[lineNumber];
        const statementStartInLine = statement.start - lineStart;
        const statementEndInLine = statement.end - lineStart;

        const beforeInLine = line.substring(0, statementStartInLine);
        const afterInLine = line.substring(statementEndInLine);

        return {
            lineNumber,
            lineStart,
            line,
            beforeInLine,
            afterInLine,
            isOnOwnLine: beforeInLine.trim() === '' && afterInLine.trim() === '',
            isAtLineStart: beforeInLine.trim() === '',
            isAtLineEnd: afterInLine.trim() === '',
            hasContentBefore: beforeInLine.trim() !== '',
            hasContentAfter: afterInLine.trim() !== ''
        };
    }

    removeEntireLine(before, after, context) {
        const beforeLines = before.split('\n');
        const afterLines = after.split('\n');

        let adjustedBefore = before;
        let adjustedAfter = after;

        // Remove the newline character after the statement if it exists
        if (after.startsWith('\n')) {
            adjustedAfter = after.substring(1);
        } else if (after.startsWith('\r\n')) {
            adjustedAfter = after.substring(2);
        }

        // If the line before is empty/whitespace only, clean it up too
        if (beforeLines.length > 0) {
            const lastBeforeLine = beforeLines[beforeLines.length - 1];
            if (lastBeforeLine.trim() === '') {
                beforeLines.pop();
                adjustedBefore = beforeLines.join('\n') + (beforeLines.length > 0 ? '\n' : '');
            }
        }

        return { before: adjustedBefore, after: adjustedAfter };
    }

    cleanLeadingCommaOrSemicolon(before) {
        // Remove trailing commas or semicolons that would be left hanging
        return before.replace(/[,;]\s*$/, '');
    }

    cleanTrailingCommaOrSemicolon(after) {
        // Remove leading commas that would be left hanging
        return after.replace(/^\s*,/, '');
    }

    filterStatementsByConfig(statements) {
        return statements.filter(statement => {
            switch (statement.type) {
                case 'console':
                    if (statement.text.includes('console.log') && !this.config.removeConsoleLog) return false;
                    if (statement.text.includes('console.warn') && !this.config.removeConsoleWarn) return false;
                    if (statement.text.includes('console.error') && !this.config.removeConsoleError) return false;
                    if (statement.text.includes('console.info') && !this.config.removeConsoleInfo) return false;
                    if (statement.text.includes('console.debug') && !this.config.removeConsoleDebug) return false;
                    if (statement.text.includes('console.trace') && !this.config.removeConsoleTrace) return false;
                    return true;
                case 'debugger':
                    return this.config.removeDebugger;
                case 'print':
                    return this.config.removePrint;
                case 'system.out':
                    return this.config.removeSystemOut;
                default:
                    return true;
            }
        });
    }

    cleanWhitespace(code) {
        // Remove excessive blank lines based on maxEmptyLines configuration
        const maxLines = this.config.maxEmptyLines;
        const pattern = new RegExp(`(\\n\\s*){${maxLines + 1},}`, 'g');
        const replacement = '\n'.repeat(maxLines);
        code = code.replace(pattern, replacement);

        // Remove trailing whitespace from lines
        code = code.replace(/[ \t]+$/gm, '');

        // Ensure file ends with single newline
        code = code.replace(/\n*$/, '\n');

        return code;
    }

    removeConsoleLogsOnly(code, statements) {
        const consoleStatements = statements.filter(stmt => stmt.type === 'console');
        return this.removeDebugStatements(code, consoleStatements);
    }

    removePrintStatementsOnly(code, statements) {
        const printStatements = statements.filter(stmt => stmt.type === 'print');
        return this.removeDebugStatements(code, printStatements);
    }

    removeDebuggerStatementsOnly(code, statements) {
        const debuggerStatements = statements.filter(stmt => stmt.type === 'debugger');
        return this.removeDebugStatements(code, debuggerStatements);
    }

    removeSystemOutStatementsOnly(code, statements) {
        const systemOutStatements = statements.filter(stmt => stmt.type === 'system.out');
        return this.removeDebugStatements(code, systemOutStatements);
    }

    getStatementsByType(statements) {
        const byType = {
            console: [],
            print: [],
            debugger: [],
            'system.out': []
        };

        statements.forEach(stmt => {
            if (byType[stmt.type]) {
                byType[stmt.type].push(stmt);
            }
        });

        return byType;
    }

    generateCleanupReport(originalCode, cleanResult) {
        const report = {
            originalLines: originalCode.split('\n').length,
            cleanedLines: cleanResult.cleanCode.split('\n').length,
            linesReduced: 0,
            removedCount: cleanResult.removedCount,
            statementsByType: this.getStatementsByType(cleanResult.removedStatements || [])
        };

        report.linesReduced = report.originalLines - report.cleanedLines;

        return report;
    }

    previewChanges(code, statements) {
        const changes = [];

        statements.forEach(statement => {
            const context = this.analyzeStatementContext(code, statement);
            changes.push({
                line: statement.line,
                type: statement.type,
                text: statement.text,
                action: context.isOnOwnLine ? 'Remove entire line' : 'Remove statement',
                context: context.lineContent || context.line
            });
        });

        return changes.sort((a, b) => a.line - b.line);
    }
}

module.exports = { CodeCleaner };