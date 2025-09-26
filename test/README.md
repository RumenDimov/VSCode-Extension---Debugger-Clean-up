# Debug Cleanup Pro - Test Suite

This directory contains comprehensive tests for the Debug Cleanup Pro VSCode extension.

## Test Structure

### Unit Tests
- **`parser.test.js`** - Tests for the DebugStatementParser class
  - Console statement detection (log, debug, warn, error, info, trace)
  - Mixed debug statement types (debugger, print, System.out.println)
  - Complex scenarios (nested functions, classes, callbacks)
  - TypeScript and JSX support
  - Edge cases and error handling
  - Performance tests

- **`cleaner.test.js`** - Tests for the CodeCleaner class
  - Statement removal logic
  - Configuration-based filtering
  - Whitespace cleaning
  - Line removal logic
  - Complex file structures
  - Cleanup reports and analytics

- **`errorHandler.test.js`** - Tests for error handling utilities
  - Error classification and handling
  - Validation helpers
  - File system error types
  - Error message quality

### Integration Tests
- **`extension.test.js`** - End-to-end tests for VSCode extension commands
  - Command registration
  - cleanupDebug command
  - cleanCurrentFile command
  - cleanSelection command
  - Configuration integration
  - Error handling scenarios
  - File type support

### Test Fixtures
- **`fixtures/testFiles.js`** - Sample code files for testing various scenarios
  - Basic console statements
  - Mixed debug statement types
  - Complex nested structures
  - TypeScript interfaces and classes
  - React/JSX components
  - Edge cases and syntax errors
  - Different programming languages

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### Specific Test Suites
```bash
npm run test:parser    # Parser tests only
npm run test:cleaner   # Cleaner tests only
npm run test:errors    # Error handler tests only
```

### Code Coverage
```bash
npm run coverage
```

## Test Coverage Goals

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 70%
- **Statements**: 80%

## Test Scenarios Covered

### Console Statement Detection
- ✅ Basic console.log statements
- ✅ All console methods (debug, warn, error, info, trace, table, time, timeEnd)
- ✅ Various argument types (strings, numbers, objects, arrays, templates)
- ✅ Multiline console statements
- ✅ Console statements with complex expressions

### Language Support
- ✅ JavaScript (.js)
- ✅ TypeScript (.ts)
- ✅ React/JSX (.jsx, .tsx)
- ✅ Python print statements (.py)
- ✅ Java System.out.println (.java)

### Statement Types
- ✅ console.* methods
- ✅ debugger statements
- ✅ print() statements
- ✅ System.out.println statements

### Complex Scenarios
- ✅ Nested functions and classes
- ✅ Arrow functions and callbacks
- ✅ Template literals
- ✅ Optional chaining
- ✅ Destructuring assignments
- ✅ Async/await patterns

### Configuration Options
- ✅ Individual console method toggles
- ✅ maxEmptyLines setting
- ✅ cleanWhitespace setting
- ✅ File type inclusions/exclusions
- ✅ Exclude patterns

### Error Handling
- ✅ Syntax errors (fallback to regex)
- ✅ File permission errors
- ✅ File not found errors
- ✅ Workspace validation
- ✅ Selection validation
- ✅ Large file handling

### Performance
- ✅ Large files (1000+ statements)
- ✅ Parsing performance
- ✅ Cleanup performance
- ✅ Memory usage

### Edge Cases
- ✅ Empty files
- ✅ Files with no debug statements
- ✅ Malformed JavaScript
- ✅ Mixed content (comments, strings, code)
- ✅ Unicode characters
- ✅ Very long lines

## Test Data

The test suite uses realistic code samples including:

- Real-world JavaScript functions
- TypeScript interfaces and classes
- React functional components with hooks
- Complex nested structures
- Error-prone edge cases
- Performance stress tests

## Continuous Integration

Tests are designed to run in CI environments and include:

- Automated test execution
- Code coverage reporting
- Performance benchmarks
- Cross-platform compatibility
- VSCode extension testing framework integration

## Contributing

When adding new features:

1. Add corresponding test cases
2. Ensure test coverage remains above thresholds
3. Include both positive and negative test cases
4. Add performance tests for computationally intensive features
5. Update test documentation