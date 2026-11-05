#!/usr/bin/env node
// Fails when the lines and branches added by a change are covered below a threshold.
// Usage: node scripts/new-code-coverage.mjs --base <git ref> [--threshold 80]
// Run it from the repository root after `npm run test:coverage`.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const toPosix = (filePath) => filePath.split(path.sep).join('/');
const percentOf = ({ covered, total }) => (total === 0 ? 100 : (covered / total) * 100);

export function parseLcov(text, { prefix = '', root = process.cwd() } = {}) {
	const files = new Map();
	let current = null;
	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (line.startsWith('SF:')) {
			const source = line.slice(3);
			const relative = path.isAbsolute(source)
				? path.relative(root, source)
				: path.join(prefix, source);
			current = { lines: new Map(), branches: [] };
			files.set(toPosix(relative), current);
		} else if (current && line.startsWith('DA:')) {
			const [lineNumber, hits] = line.slice(3).split(',');
			current.lines.set(Number(lineNumber), Number(hits));
		} else if (current && line.startsWith('BRDA:')) {
			const [lineNumber, , , taken] = line.slice(5).split(',');
			current.branches.push({ line: Number(lineNumber), taken: taken === '-' ? 0 : Number(taken) });
		} else if (line === 'end_of_record') {
			current = null;
		}
	}
	return files;
}

export function parseChangedLines(diffText) {
	const changed = new Map();
	let file = null;
	for (const line of diffText.split(/\r?\n/)) {
		if (line.startsWith('+++ ')) {
			const target = line.slice(4);
			file = target === '/dev/null' ? null : target.replace(/^b\//, '');
			if (file && !changed.has(file)) {
				changed.set(file, new Set());
			}
			continue;
		}
		const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
		if (hunk && file) {
			const start = Number(hunk[1]);
			const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
			for (let offset = 0; offset < count; offset += 1) {
				changed.get(file).add(start + offset);
			}
		}
	}
	return changed;
}

export function evaluateNewCode(coverageByFile, changedByFile, threshold = 80) {
	const lines = { covered: 0, total: 0 };
	const branches = { covered: 0, total: 0 };
	const uncoveredLines = [];

	for (const [file, changedLines] of changedByFile) {
		const coverage = coverageByFile.get(file);
		if (!coverage) {
			continue;
		}
		for (const lineNumber of changedLines) {
			if (!coverage.lines.has(lineNumber)) {
				continue;
			}
			lines.total += 1;
			if (coverage.lines.get(lineNumber) > 0) {
				lines.covered += 1;
			} else {
				uncoveredLines.push(`${file}:${lineNumber}`);
			}
		}
		for (const branch of coverage.branches) {
			if (!changedLines.has(branch.line)) {
				continue;
			}
			branches.total += 1;
			if (branch.taken > 0) {
				branches.covered += 1;
			}
		}
	}

	const linesPercent = percentOf(lines);
	const branchesPercent = percentOf(branches);
	return {
		threshold,
		lines: { ...lines, percent: linesPercent },
		branches: { ...branches, percent: branchesPercent },
		uncoveredLines,
		passed: linesPercent >= threshold && branchesPercent >= threshold,
	};
}

export function formatSummary(result) {
	const row = (label, part) =>
		`${label}: ${part.covered}/${part.total} (${part.percent.toFixed(1)}%)`;
	const verdict = result.passed ? 'PASSED' : 'FAILED';
	const output = [
		`New code coverage ${verdict} (threshold ${result.threshold}%)`,
		row('Lines', result.lines),
		row('Branches', result.branches),
	];
	if (result.uncoveredLines.length > 0) {
		output.push('Uncovered new lines:', ...result.uncoveredLines.map((entry) => `  ${entry}`));
	}
	return output.join('\n');
}

function findLcovFiles(root) {
	const found = [];
	for (const group of ['apps', 'packages']) {
		const groupDir = path.join(root, group);
		if (!fs.existsSync(groupDir)) {
			continue;
		}
		for (const entry of fs.readdirSync(groupDir, { withFileTypes: true })) {
			const lcovPath = path.join(groupDir, entry.name, 'coverage', 'lcov.info');
			if (entry.isDirectory() && fs.existsSync(lcovPath)) {
				found.push({ lcovPath, prefix: path.join(group, entry.name) });
			}
		}
	}
	return found;
}

function readOption(args, name) {
	const index = args.indexOf(name);
	return index === -1 ? undefined : args[index + 1];
}

function main() {
	const args = process.argv.slice(2);
	const base = readOption(args, '--base');
	const threshold = Number(readOption(args, '--threshold') ?? 80);
	if (!base || Number.isNaN(threshold)) {
		console.error('Usage: node scripts/new-code-coverage.mjs --base <git ref> [--threshold 80]');
		process.exitCode = 2;
		return;
	}

	const root = process.cwd();
	const lcovFiles = findLcovFiles(root);
	if (lcovFiles.length === 0) {
		console.error('No coverage/lcov.info found. Run "npm run test:coverage" first.');
		process.exitCode = 2;
		return;
	}

	const coverage = new Map();
	for (const { lcovPath, prefix } of lcovFiles) {
		const parsed = parseLcov(fs.readFileSync(lcovPath, 'utf8'), { prefix, root });
		for (const [file, data] of parsed) {
			coverage.set(file, data);
		}
	}

	const diff = execFileSync(
		'git',
		[
			'diff',
			'--unified=0',
			'--no-color',
			`${base}...HEAD`,
			'--',
			'*.js',
			'*.mjs',
			'*.cjs',
			'*.ts',
			'*.vue',
		],
		{ cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
	);

	const result = evaluateNewCode(coverage, parseChangedLines(diff), threshold);
	const summary = formatSummary(result);
	console.log(summary);
	if (process.env.GITHUB_STEP_SUMMARY) {
		fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
	}
	process.exitCode = result.passed ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
	main();
}
