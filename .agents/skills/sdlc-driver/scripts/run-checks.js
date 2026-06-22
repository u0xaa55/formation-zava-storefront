#!/usr/bin/env node
/**
 * run-checks.js
 *
 * Run lint and test-with-coverage for the project, emit a structured
 * JSON result to stdout. Non-interactive: no prompts, no TTY dependency.
 *
 * Usage: node scripts/run-checks.js [--help]
 *
 * Exit codes:
 *   0  all checks passed (lint green, tests green)
 *   1  one or more checks failed
 *   2  unexpected execution error (captured in output)
 *
 * Output schema (stdout, JSON):
 * {
 *   "lint":  { "pass": boolean, "exit": number, "output": string },
 *   "test":  { "pass": boolean, "exit": number, "output": string },
 *   "allPass": boolean
 * }
 *
 * Diagnostics (phase progress, timing) go to stderr.
 * All stdout is valid JSON — do not mix in prose.
 */
'use strict';

const { execSync } = require('child_process');

if (process.argv.includes('--help')) {
    const fs = require('fs');
    const header = fs
        .readFileSync(__filename, 'utf8')
        .split('\n')
        .slice(0, 22)
        .map((l) => l.replace(/^\/\*\*?/, '').replace(/^ \* ?/, '').replace(/^ \*\/$/, ''))
        .join('\n');
    process.stdout.write(header + '\n');
    process.exit(0);
}

/**
 * Run a shell command, capture combined stdout+stderr.
 * Returns { pass, exit, output }. Never throws.
 */
function runPhase(name, cmd) {
    process.stderr.write(`[run-checks] ${name}: running "${cmd}"\n`);
    const start = Date.now();
    let output = '';
    let exitCode = 0;
    try {
        output = execSync(cmd, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true,
        });
    } catch (err) {
        output = [err.stdout, err.stderr].filter(Boolean).join('\n');
        exitCode = typeof err.status === 'number' ? err.status : 1;
    }
    const ms = Date.now() - start;
    const pass = exitCode === 0;
    process.stderr.write(`[run-checks] ${name}: exit=${exitCode} pass=${pass} (${ms}ms)\n`);
    return { pass, exit: exitCode, output };
}

let lint, test;

try {
    lint = runPhase('lint', 'npm run lint');
    test = runPhase('test', 'npm test -- --coverage');
} catch (unexpected) {
    const result = {
        lint: lint || { pass: false, exit: 2, output: '' },
        test: { pass: false, exit: 2, output: String(unexpected) },
        allPass: false,
        error: String(unexpected),
    };
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    process.exit(2);
}

const result = {
    lint,
    test,
    allPass: lint.pass && test.pass,
};

process.stdout.write(JSON.stringify(result, null, 2) + '\n');
process.exit(result.allPass ? 0 : 1);
