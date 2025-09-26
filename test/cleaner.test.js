const assert = require('assert');
const { DebugStatementParser } = require('../parser');
const { CodeCleaner } = require('../cleaner');
const { testFiles } = require('./fixtures/testFiles');

suite('CodeCleaner Tests', () => {
    let parser;
    let cleaner;

    setup(() => {
        parser = new DebugStatementParser();
        cleaner = new CodeCleaner();
    });

    suite('Basic Console Statement Removal', () => {
        test('should remove console.log statements', () => {
            const code = `
function test() {
    console.log('Remove this');
    const x = 5;
    console.log('And this');
    return x;
}`;

            const statements = parser.parseCode(code, 'test.js');
            const result = cleaner.removeDebugStatements(code, statements);

            assert.strictEqual(result.removedCount, 2);
            assert.ok(!result.cleanCode.includes("console.log('Remove this')"));
            assert.ok(!result.cleanCode.includes("console.log('And this')"));
            assert.ok(result.cleanCode.includes('const x = 5;'));
            assert.ok(result.cleanCode.includes('return x;'));
        });

        test('should remove different console methods', () => {
            const code = testFiles.basicConsole;
            const statements = parser.parseCode(code, 'test.js');
            const result = cleaner.removeDebugStatements(code, statements);

            assert.ok(result.removedCount >= 6, 'Should remove all console methods');
            assert.ok(!result.cleanCode.includes('console.log'));
            assert.ok(!result.cleanCode.includes('console.debug'));
            assert.ok(!result.cleanCode.includes('console.warn'));
            assert.ok(!result.cleanCode.includes('console.error'));
            assert.ok(!result.cleanCode.includes('console.info'));
            assert.ok(!result.cleanCode.includes('console.trace'));
        });

        test('should preserve non-debug code', () => {
            const code = `
function calculateSum(a, b) {
    console.log('Calculating sum');
    const result = a + b;
    console.debug('Debug info');
    return result;
}`;

            const statements = parser.parseCode(code, 'test.js');
            const result = cleaner.removeDebugStatements(code, statements);

            assert.ok(result.cleanCode.includes('function calculateSum(a, b)'));
            assert.ok(result.cleanCode.includes('const result = a + b;'));
            assert.ok(result.cleanCode.includes('return result;'));
        });
    });

    suite('Configuration-based Filtering', () => {
        test('should respect removeConsoleLog config', () => {
            const config = { removeConsoleLog: false };
            const cleanerWithConfig = new CodeCleaner(config);

            const code = `
                console.log('Keep this');
                console.debug('Remove this');
            `;

            const statements = parser.parseCode(code, 'test.js');
            const result = cleanerWithConfig.removeDebugStatements(code, statements);

            assert.ok(result.cleanCode.includes("console.log('Keep this')"));
            assert.ok(!result.cleanCode.includes("console.debug('Remove this')"));
        });

        test('should respect removeConsoleError config', () => {
            const config = { removeConsoleError: true };
            const cleanerWithConfig = new CodeCleaner(config);

            const code = `
                console.log('Remove this');
                console.error('Remove this too');
            `;

            const statements = parser.parseCode(code, 'test.js');
            const result = cleanerWithConfig.removeDebugStatements(code, statements);

            assert.ok(!result.cleanCode.includes("console.log('Remove this')"));
            assert.ok(!result.cleanCode.includes("console.error('Remove this too')"));
        });

        test('should respect multiple console method configs', () => {
            const config = {
                removeConsoleLog: true,
                removeConsoleWarn: false,
                removeConsoleError: false,
                removeConsoleDebug: true
            };
            const cleanerWithConfig = new CodeCleaner(config);

            const code = `
                console.log('Remove this');
                console.warn('Keep this');
                console.error('Keep this');
                console.debug('Remove this');
            `;

            const statements = parser.parseCode(code, 'test.js');
            const result = cleanerWithConfig.removeDebugStatements(code, statements);

            assert.ok(!result.cleanCode.includes("console.log('Remove this')"));
            assert.ok(result.cleanCode.includes("console.warn('Keep this')"));
            assert.ok(result.cleanCode.includes("console.error('Keep this')"));
            assert.ok(!result.cleanCode.includes("console.debug('Remove this')"));
        });
    });

    suite('Whitespace Cleaning', () => {
        test('should clean excessive blank lines', () => {
            const code = `function test() {



    return 'hello';




}`;

            const statements = parser.parseCode(code, 'test.js');
            const result = cleaner.removeDebugStatements(code, statements);

            // Should reduce multiple blank lines to maxEmptyLines (default 2)
            const lines = result.cleanCode.split('\n');
            let consecutiveEmptyLines = 0;
            let maxConsecutiveEmpty = 0;

            lines.forEach(line => {
                if (line.trim() === '') {
                    consecutiveEmptyLines++;
                    maxConsecutiveEmpty = Math.max(maxConsecutiveEmpty, consecutiveEmptyLines);
                } else {
                    consecutiveEmptyLines = 0;
                }
            });

            assert.ok(maxConsecutiveEmpty <= 2, 'Should limit consecutive empty lines');
        });

        test('should respect maxEmptyLines config', () => {
            const config = { maxEmptyLines: 1 };
            const cleanerWithConfig = new CodeCleaner(config);

            const code = `line1



line2`;

            const statements = parser.parseCode(code, 'test.js');
            const result = cleanerWithConfig.removeDebugStatements(code, statements);

            const emptyLineMatches = result.cleanCode.match(/\n\s*\n/g);
            // Should have at most 1 consecutive empty line
            assert.ok(!emptyLineMatches || emptyLineMatches.length <= 1);
        });

        test('should remove trailing whitespace', () => {
            const code = `function test() {
    console.log('test');
    return 'hello';
}`;

            const statements = parser.parseCode(code, 'test.js');
            const result = cleaner.removeDebugStatements(code, statements);

            const lines = result.cleanCode.split('\n');
            lines.forEach(line => {
                if (line.length > 0) {
                    assert.ok(!line.match(/\s+$/), 'Should not have trailing whitespace');
                }
            });
        });

        test('should respect cleanWhitespace config', () => {
            const config = { cleanWhitespace: false };
            const cleanerWithConfig = new CodeCleaner(config);

            const code = `function test() {



    console.log('test');
    return 'hello';
}`;

            const statements = parser.parseCode(code, 'test.js');
            const result = cleanerWithConfig.removeDebugStatements(code, statements);

            // Should preserve original whitespace when cleanWhitespace is false
            assert.ok(result.cleanCode.includes('   \n'));
        });
    });

    suite('Line Removal Logic', () => {
        test('should remove entire lines for standalone statements', () => {
            const code = `function test() {
    const x = 5;
    console.log('standalone');
    const y = 10;
    return x + y;
}`;

            const statements = parser.parseCode(code, 'test.js');
            const result = cleaner.removeDebugStatements(code, statements);

            const lines = result.cleanCode.split('\n');
            const hasStandaloneLine = lines.some(line => line.trim() === "console.log('standalone');");
            assert.ok(!hasStandaloneLine, 'Should remove entire line for standalone statement');
        });

        test('should handle inline statements correctly', () => {
            const code = `const result = doSomething(); console.log(result); return result;`;

            const statements = parser.parseCode(code, 'test.js');
            const result = cleaner.removeDebugStatements(code, statements);

            // Should remove just the console.log part, keeping the rest
            assert.ok(result.cleanCode.includes('const result = doSomething()'));
            assert.ok(result.cleanCode.includes('return result'));
            assert.ok(!result.cleanCode.includes('console.log(result)'));
        });

        test('should handle multiline statements', () => {
            const code = `console.log(
    'multiline',
    'statement',
    { key: 'value' }
);`;

            const statements = parser.parseCode(code, 'test.js');
            const result = cleaner.removeDebugStatements(code, statements);

            assert.ok(!result.cleanCode.includes('multiline'));
            assert.ok(!result.cleanCode.includes('statement'));
            assert.ok(!result.cleanCode.includes("key: 'value'"));
        });
    });

    suite('Mixed Statement Types', () => {
        test('should remove all debug statement types', () => {
            const code = testFiles.mixedStatements;
            const statements = parser.parseCode(code, 'test.js');
            const result = cleaner.removeDebugStatements(code, statements);

            assert.ok(!result.cleanCode.includes('console.log'));
            assert.ok(!result.cleanCode.includes('console.debug'));
            assert.ok(!result.cleanCode.includes('debugger'));
            assert.ok(!result.cleanCode.includes('print('));
            assert.ok(!result.cleanCode.includes('System.out.println'));
        });

        test('should remove only specific statement types', () => {
            const code = testFiles.mixedStatements;
            const statements = parser.parseCode(code, 'test.js');

            // Test console-only removal
            const consoleResult = cleaner.removeConsoleLogsOnly(code, statements);
            assert.ok(!consoleResult.cleanCode.includes('console.log'));
            assert.ok(consoleResult.cleanCode.includes('debugger'));

            // Test debugger-only removal
            const debuggerResult = cleaner.removeDebuggerStatementsOnly(code, statements);
            assert.ok(debuggerResult.cleanCode.includes('console.log'));
            assert.ok(!debuggerResult.cleanCode.includes('debugger'));
        });
    });

    suite('Complex Scenarios', () => {
        test('should handle nested functions and classes', () => {
            const code = testFiles.nestedStatements;
            const statements = parser.parseCode(code, 'test.js');
            const result = cleaner.removeDebugStatements(code, statements);

            // Verify class structure is preserved
            assert.ok(result.cleanCode.includes('class DataProcessor'));
            assert.ok(result.cleanCode.includes('constructor()'));
            assert.ok(result.cleanCode.includes('process(items)'));
            assert.ok(result.cleanCode.includes('processItem(item)'));

            // Verify debug statements are removed
            assert.ok(!result.cleanCode.includes('console.log'));
            assert.ok(!result.cleanCode.includes('console.debug'));
            assert.ok(!result.cleanCode.includes('console.error'));
            assert.ok(!result.cleanCode.includes('debugger'));
        });

        test('should preserve code structure in complex files', () => {
            const code = testFiles.typeScript;
            const statements = parser.parseCode(code, 'test.ts');
            const result = cleaner.removeDebugStatements(code, statements);

            // Verify TypeScript structure is preserved
            assert.ok(result.cleanCode.includes('interface User'));
            assert.ok(result.cleanCode.includes('class UserService'));
            assert.ok(result.cleanCode.includes('addUser(user: User): void'));
            assert.ok(result.cleanCode.includes('getUser(name: string): User | undefined'));
        });

        test('should handle JSX/React components', () => {
            const code = testFiles.reactComponent;
            const statements = parser.parseCode(code, 'test.tsx');
            const result = cleaner.removeDebugStatements(code, statements);

            // Verify React structure is preserved
            assert.ok(result.cleanCode.includes('import React'));
            assert.ok(result.cleanCode.includes('useState'));
            assert.ok(result.cleanCode.includes('useEffect'));
            assert.ok(result.cleanCode.includes('<div>'));
            assert.ok(result.cleanCode.includes('{users.map'));

            // Verify debug statements are removed
            assert.ok(!result.cleanCode.includes('console.log'));
            assert.ok(!result.cleanCode.includes('debugger'));
        });
    });

    suite('Edge Cases', () => {
        test('should handle empty input', () => {
            const result = cleaner.removeDebugStatements('', []);
            assert.strictEqual(result.removedCount, 0);
            assert.strictEqual(result.cleanCode, '');
        });

        test('should handle code with no debug statements', () => {
            const code = testFiles.cleanCode;
            const statements = parser.parseCode(code, 'test.js');
            const result = cleaner.removeDebugStatements(code, statements);

            assert.strictEqual(result.removedCount, 0);
            assert.strictEqual(result.cleanCode.trim(), code.trim());
        });

        test('should handle syntax errors gracefully', () => {
            const code = testFiles.syntaxError;
            const statements = parser.fallbackRegexParse(code); // Use fallback for syntax errors
            const result = cleaner.removeDebugStatements(code, statements);

            // Should still remove what it can find
            assert.ok(result.removedCount > 0);
            assert.ok(!result.cleanCode.includes('console.log'));
        });
    });

    suite('Cleanup Reports and Analytics', () => {
        test('should generate cleanup report', () => {
            const code = `
function test() {
    console.log('line 1');
    console.log('line 2');
    const x = 5;
    console.debug('line 3');
    return x;
}`;

            const statements = parser.parseCode(code, 'test.js');
            const result = cleaner.removeDebugStatements(code, statements);
            const report = cleaner.generateCleanupReport(code, result);

            assert.ok(report.originalLines > 0);
            assert.ok(report.cleanedLines > 0);
            assert.ok(report.removedCount > 0);
            assert.ok(report.linesReduced >= 0);
            assert.ok(report.statementsByType);
        });

        test('should categorize statements by type', () => {
            const code = `
                console.log('test');
                console.debug('test');
                debugger;
                print('test');
            `;

            const statements = parser.parseCode(code, 'test.js');
            const result = cleaner.removeDebugStatements(code, statements);
            const byType = cleaner.getStatementsByType(result.removedStatements);

            assert.ok(byType.console.length > 0);
            assert.ok(byType.debugger.length > 0);
            assert.ok(byType.print.length > 0);
        });

        test('should preview changes before applying', () => {
            const code = `
function test() {
    console.log('test');
    debugger;
}`;

            const statements = parser.parseCode(code, 'test.js');
            const preview = cleaner.previewChanges(code, statements);

            assert.ok(preview.length > 0);
            assert.ok(preview.some(p => p.type === 'console'));
            assert.ok(preview.some(p => p.type === 'debugger'));
            assert.ok(preview.every(p => p.line > 0));
            assert.ok(preview.every(p => p.text));
            assert.ok(preview.every(p => p.action));
        });
    });

    suite('Performance Tests', () => {
        test('should handle large files efficiently', () => {
            // Generate a large file
            let largeCode = 'function largeFunction() {\n';
            for (let i = 0; i < 1000; i++) {
                largeCode += `    console.log('Statement ${i}');\n`;
                largeCode += `    const var${i} = ${i};\n`;
            }
            largeCode += '}';

            const statements = parser.parseCode(largeCode, 'large.js');

            const startTime = Date.now();
            const result = cleaner.removeDebugStatements(largeCode, statements);
            const endTime = Date.now();

            assert.strictEqual(result.removedCount, 1000);
            assert.ok((endTime - startTime) < 5000, 'Should clean large files within reasonable time');
        });
    });

    suite('Advanced Configuration', () => {
        test('should handle all configuration options', () => {
            const config = {
                removeConsoleLog: true,
                removeConsoleWarn: false,
                removeConsoleError: false,
                removeConsoleInfo: true,
                removeConsoleDebug: true,
                removeConsoleTrace: true,
                removeDebugger: true,
                removePrint: true,
                removeSystemOut: true,
                maxEmptyLines: 1,
                cleanWhitespace: true
            };

            const cleanerWithConfig = new CodeCleaner(config);

            const code = `
                console.log('remove');
                console.warn('keep');
                console.error('keep');
                console.info('remove');
                console.debug('remove');
                console.trace('remove');
                debugger;
                print('remove');



            `;

            const statements = parser.parseCode(code, 'test.js');
            const result = cleanerWithConfig.removeDebugStatements(code, statements);

            assert.ok(!result.cleanCode.includes("console.log('remove')"));
            assert.ok(result.cleanCode.includes("console.warn('keep')"));
            assert.ok(result.cleanCode.includes("console.error('keep')"));
            assert.ok(!result.cleanCode.includes("console.info('remove')"));
            assert.ok(!result.cleanCode.includes("console.debug('remove')"));
            assert.ok(!result.cleanCode.includes("console.trace('remove')"));
            assert.ok(!result.cleanCode.includes('debugger'));
            assert.ok(!result.cleanCode.includes("print('remove')"));
        });
    });
});