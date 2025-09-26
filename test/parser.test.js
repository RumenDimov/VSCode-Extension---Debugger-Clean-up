const assert = require('assert');
const { DebugStatementParser } = require('../parser');
const { testFiles } = require('./fixtures/testFiles');

suite('DebugStatementParser Tests', () => {
    let parser;

    setup(() => {
        parser = new DebugStatementParser();
    });

    suite('Basic Console Statement Detection', () => {
        test('should detect console.log statements', () => {
            const code = `
                console.log('Hello world');
                const x = 5;
                console.log('Value:', x);
            `;

            const statements = parser.parseCode(code, 'test.js');
            assert.strictEqual(statements.length, 2);
            assert.strictEqual(statements[0].type, 'console');
            assert.strictEqual(statements[1].type, 'console');
        });

        test('should detect different console methods', () => {
            const statements = parser.parseCode(testFiles.basicConsole, 'test.js');

            // Should find console.log, console.debug, console.warn, console.error, console.info, console.trace
            assert.strictEqual(statements.length, 6);

            const consoleStatements = statements.filter(s => s.type === 'console');
            assert.strictEqual(consoleStatements.length, 6);
        });

        test('should detect console statements with various argument types', () => {
            const code = `
                console.log();
                console.log('string');
                console.log(42);
                console.log(true, false);
                console.log({ key: 'value' });
                console.log(['array', 'items']);
                console.log(\`template \${variable}\`);
            `;

            const statements = parser.parseCode(code, 'test.js');
            assert.strictEqual(statements.length, 7);
        });
    });

    suite('Mixed Debug Statement Detection', () => {
        test('should detect all types of debug statements', () => {
            const statements = parser.parseCode(testFiles.mixedStatements, 'test.js');

            const consoleStatements = statements.filter(s => s.type === 'console');
            const debuggerStatements = statements.filter(s => s.type === 'debugger');
            const printStatements = statements.filter(s => s.type === 'print');
            const systemOutStatements = statements.filter(s => s.type === 'system.out');

            assert.ok(consoleStatements.length > 0, 'Should detect console statements');
            assert.ok(debuggerStatements.length > 0, 'Should detect debugger statements');
            assert.ok(printStatements.length > 0, 'Should detect print statements');
            assert.ok(systemOutStatements.length > 0, 'Should detect System.out.println statements');
        });

        test('should provide accurate line numbers', () => {
            const code = `line 1
console.log('line 2');
line 3
console.debug('line 4');
line 5`;

            const statements = parser.parseCode(code, 'test.js');
            assert.strictEqual(statements.length, 2);
            assert.strictEqual(statements[0].line, 2);
            assert.strictEqual(statements[1].line, 4);
        });

        test('should extract statement text correctly', () => {
            const code = `console.log('Hello world');`;
            const statements = parser.parseCode(code, 'test.js');

            assert.strictEqual(statements.length, 1);
            assert.ok(statements[0].text.includes('console.log'));
            assert.ok(statements[0].text.includes('Hello world'));
        });
    });

    suite('Complex Scenarios', () => {
        test('should handle nested functions and classes', () => {
            const statements = parser.parseCode(testFiles.nestedStatements, 'test.js');

            // Should find console statements in constructor, methods, and nested callbacks
            const consoleStatements = statements.filter(s => s.type === 'console');
            const debuggerStatements = statements.filter(s => s.type === 'debugger');

            assert.ok(consoleStatements.length >= 5, 'Should find multiple console statements');
            assert.ok(debuggerStatements.length >= 1, 'Should find debugger statement');
        });

        test('should handle template literals and multi-line statements', () => {
            const statements = parser.parseCode(testFiles.edgeCases, 'test.js');

            // Should not include console statements in comments or strings
            const realStatements = statements.filter(s =>
                !s.lineContent.trim().startsWith('//') &&
                !s.lineContent.trim().startsWith('/*')
            );

            assert.ok(realStatements.length > 0, 'Should find real console statements');
        });

        test('should handle TypeScript syntax', () => {
            const statements = parser.parseCode(testFiles.typeScript, 'test.ts');

            const consoleStatements = statements.filter(s => s.type === 'console');
            assert.ok(consoleStatements.length >= 4, 'Should parse TypeScript and find console statements');
        });

        test('should handle JSX/React syntax', () => {
            const statements = parser.parseCode(testFiles.reactComponent, 'test.tsx');

            const consoleStatements = statements.filter(s => s.type === 'console');
            const debuggerStatements = statements.filter(s => s.type === 'debugger');

            assert.ok(consoleStatements.length >= 4, 'Should parse JSX and find console statements');
            assert.ok(debuggerStatements.length >= 1, 'Should find debugger statement in JSX');
        });
    });

    suite('Edge Cases and Error Handling', () => {
        test('should return empty array for clean code', () => {
            const statements = parser.parseCode(testFiles.cleanCode, 'test.js');
            assert.strictEqual(statements.length, 0);
        });

        test('should handle empty input', () => {
            const statements = parser.parseCode('', 'test.js');
            assert.strictEqual(statements.length, 0);
        });

        test('should handle only whitespace', () => {
            const statements = parser.parseCode('   \n  \t  \n  ', 'test.js');
            assert.strictEqual(statements.length, 0);
        });

        test('should fallback to regex parsing on syntax errors', () => {
            const statements = parser.parseCode(testFiles.syntaxError, 'test.js');

            // Should still find console statements even with syntax errors
            assert.ok(statements.length > 0, 'Should find statements using fallback parsing');
        });
    });

    suite('Language-Specific Detection', () => {
        test('should detect Python print statements', () => {
            const statements = parser.parseCode(testFiles.pythonStyle, 'test.py');
            const printStatements = statements.filter(s => s.type === 'print');

            // Should use regex fallback for Python and find print statements
            assert.ok(printStatements.length > 0, 'Should detect Python print statements');
        });

        test('should detect Java System.out.println statements', () => {
            const statements = parser.parseCode(testFiles.javaStyle, 'test.java');
            const systemOutStatements = statements.filter(s => s.type === 'system.out');

            // Should use regex fallback for Java and find System.out statements
            assert.ok(systemOutStatements.length > 0, 'Should detect Java System.out.println statements');
        });
    });

    suite('Statement Classification', () => {
        test('should correctly classify console methods', () => {
            const code = `
                console.log('log');
                console.debug('debug');
                console.warn('warn');
                console.error('error');
                console.info('info');
                console.trace('trace');
                console.table(['data']);
                console.time('timer');
                console.timeEnd('timer');
            `;

            const statements = parser.parseCode(code, 'test.js');
            assert.strictEqual(statements.length, 9);

            statements.forEach(statement => {
                assert.strictEqual(statement.type, 'console');
                assert.ok(statement.text.includes('console.'));
            });
        });

        test('should handle debugger statements', () => {
            const code = `
                debugger;
                debugger
                if (condition) debugger;
            `;

            const statements = parser.parseCode(code, 'test.js');
            const debuggerStatements = statements.filter(s => s.type === 'debugger');

            assert.strictEqual(debuggerStatements.length, 3);
        });
    });

    suite('Regex Fallback Parser', () => {
        test('should parse with regex fallback', () => {
            const code = `
                console.log('test');
                print('python');
                System.out.println('java');
                debugger;
            `;

            const statements = parser.fallbackRegexParse(code);

            assert.ok(statements.length >= 4, 'Regex parser should find all statement types');

            const types = statements.map(s => s.type);
            assert.ok(types.includes('console'), 'Should find console statements');
            assert.ok(types.includes('print'), 'Should find print statements');
            assert.ok(types.includes('system.out'), 'Should find system.out statements');
            assert.ok(types.includes('debugger'), 'Should find debugger statements');
        });

        test('should provide line numbers in regex fallback', () => {
            const code = `line 1
console.log('line 2');
line 3
print('line 4');`;

            const statements = parser.fallbackRegexParse(code);

            assert.strictEqual(statements.length, 2);
            assert.strictEqual(statements[0].line, 2);
            assert.strictEqual(statements[1].line, 4);
        });
    });

    suite('Semicolon Handling', () => {
        test('should include semicolons in statement boundaries', () => {
            const code = `
                console.log('with semicolon');
                console.log('without semicolon')
                console.debug('with spaces before') ;
            `;

            const statements = parser.parseCode(code, 'test.js');

            // Check that semicolons are included in the text
            const withSemicolon = statements.find(s => s.text.includes('with semicolon'));
            const withoutSemicolon = statements.find(s => s.text.includes('without semicolon'));
            const withSpaces = statements.find(s => s.text.includes('with spaces before'));

            assert.ok(withSemicolon.text.includes(';'), 'Should include semicolon');
            assert.ok(!withoutSemicolon.text.includes(';'), 'Should not include semicolon when none exists');
            assert.ok(withSpaces.text.includes(';'), 'Should include semicolon even with spaces');
        });

        test('should handle debugger statements with and without semicolons', () => {
            const code = `
                debugger;
                debugger
                if (condition) debugger;
            `;

            const statements = parser.parseCode(code, 'test.js');
            const debuggerStatements = statements.filter(s => s.type === 'debugger');

            assert.strictEqual(debuggerStatements.length, 3);

            // Check semicolon inclusion
            const withSemicolon = debuggerStatements.filter(s => s.text.includes(';'));
            const withoutSemicolon = debuggerStatements.filter(s => !s.text.includes(';'));

            assert.ok(withSemicolon.length >= 1, 'Should find debugger with semicolon');
            assert.ok(withoutSemicolon.length >= 1, 'Should find debugger without semicolon');
        });

        test('should handle multiline statements with semicolons', () => {
            const code = `console.log(
    'multiline',
    'statement'
);`;

            const statements = parser.parseCode(code, 'test.js');
            assert.strictEqual(statements.length, 1);
            assert.ok(statements[0].text.includes(';'), 'Should include semicolon in multiline statement');
        });
    });

    suite('Performance Tests', () => {
        test('should handle large files efficiently', () => {
            // Generate a large file with many console statements
            let largeCode = '';
            for (let i = 0; i < 1000; i++) {
                largeCode += `console.log('Statement ${i}');\n`;
            }

            const startTime = Date.now();
            const statements = parser.parseCode(largeCode, 'large.js');
            const endTime = Date.now();

            assert.strictEqual(statements.length, 1000);
            assert.ok((endTime - startTime) < 5000, 'Should parse large files within reasonable time');
        });
    });
});