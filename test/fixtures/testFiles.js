// Test data files for various console.log scenarios

const testFiles = {
    // Basic JavaScript console statements
    basicConsole: `
function calculateSum(a, b) {
    console.log('Calculating sum');
    const result = a + b;
    console.debug('Debug info:', { a, b, result });
    console.warn('Warning message');
    console.error('Error message');
    console.info('Info message');
    console.trace('Trace message');
    return result;
}`,

    // Mixed debug statements
    mixedStatements: `
function processData(data) {
    console.log('Processing data:', data);

    if (!data) {
        debugger;
        throw new Error('No data provided');
    }

    print('Python-style print');
    System.out.println('Java-style output');

    const processed = data.map(item => {
        console.debug('Processing item:', item);
        return item * 2;
    });

    console.log('Processed data:', processed);
    return processed;
}`,

    // Complex nested scenarios
    nestedStatements: `
class DataProcessor {
    constructor() {
        console.log('DataProcessor initialized');
    }

    process(items) {
        items.forEach((item, index) => {
            console.log(\`Processing item \${index}:\`, item);

            if (item.debug) {
                debugger;
                console.debug('Debug mode enabled for item:', item);
            }

            try {
                this.processItem(item);
            } catch (error) {
                console.error('Error processing item:', error);
            }
        });
    }

    processItem(item) {
        const result = item.value * 2;
        console.info('Item processed successfully:', result);
        return result;
    }
}`,

    // Edge cases and tricky scenarios
    edgeCases: `
// Console in comments should not be removed
// console.log('This should stay');

const code = \`
    console.log('String template with console');
\`;

const regex = /console\\.log\\(/g;

function test() {
    // Real console statements to remove
    console.log("Normal console");
    console.log(\`Template literal: \${Date.now()}\`);
    console.log(
        'Multi-line',
        'console statement'
    );

    /*
    console.log('Comment block console');
    */

    window.console?.log?.('Optional chaining console');
    console['log']('Bracket notation console');
}`,

    // TypeScript specific
    typeScript: `
interface User {
    name: string;
    age: number;
}

class UserService {
    private users: User[] = [];

    addUser(user: User): void {
        console.log('Adding user:', user);
        this.users.push(user);
        console.debug('Total users:', this.users.length);
    }

    getUser(name: string): User | undefined {
        console.log('Searching for user:', name);
        const user = this.users.find(u => u.name === name);

        if (!user) {
            console.warn('User not found:', name);
            return undefined;
        }

        console.info('User found:', user);
        return user;
    }
}`,

    // JSX/React specific
    reactComponent: `
import React, { useState, useEffect } from 'react';

const UserComponent: React.FC = () => {
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

        try {
            const response = await fetch('/api/users');
            const data = await response.json();
            console.log('Users loaded:', data);
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    };

    const handleClick = (userId: string) => {
        console.log('User clicked:', userId);
        debugger; // Debug point
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
};`,

    // Already clean code (no debug statements)
    cleanCode: `
function add(a, b) {
    return a + b;
}

class Calculator {
    constructor() {
        this.history = [];
    }

    calculate(operation, a, b) {
        let result;

        switch (operation) {
            case 'add':
                result = a + b;
                break;
            case 'subtract':
                result = a - b;
                break;
            default:
                throw new Error('Unknown operation');
        }

        this.history.push({ operation, a, b, result });
        return result;
    }
}`,

    // Syntax error file
    syntaxError: `
function brokenFunction() {
    console.log('This has syntax errors';
    // Missing closing parenthesis

    const obj = {
        prop1: 'value1'
        prop2: 'value2' // Missing comma
    };

    console.log('More logs');
}`,

    // Python-style code
    pythonStyle: `
def process_data(data):
    print("Processing data:", data)

    for item in data:
        print(f"Processing item: {item}")

        if item < 0:
            print("Warning: negative value")

    print("Processing complete")
    return data`,

    // Java-style code
    javaStyle: `
public class DataProcessor {
    public void processData(List<String> data) {
        System.out.println("Processing data: " + data.size() + " items");

        for (int i = 0; i < data.size(); i++) {
            String item = data.get(i);
            System.out.println("Processing item " + i + ": " + item);

            if (item.isEmpty()) {
                System.err.println("Warning: empty item at index " + i);
            }
        }

        System.out.println("Processing complete");
    }
}`
};

module.exports = { testFiles };