#!/usr/bin/env node
// Validates branch names and the head/base pairing of pull requests.
// Usage: node scripts/check-branch-name.mjs --head <branch> [--base <branch>]
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const FEATURE = /^feature\/E\d+-\d{2,}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HOTFIX = /^hotfix\/[A-Z][A-Z0-9]*-\d+-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DEPENDABOT = /^dependabot\/[A-Za-z0-9._/-]+$/;
const PERMANENT_BRANCHES = ['develop', 'uat', 'main'];

const ALLOWED_SOURCES = {
	develop: ['feature', 'hotfix', 'dependabot'],
	uat: ['develop', 'hotfix'],
	main: ['uat', 'hotfix'],
};

export const BRANCH_NAME_HELP = [
	'Allowed branch names:',
	'  feature/STORY-ID-name   for example feature/E4-02-page-sizes',
	'  hotfix/TICKET-name      for example hotfix/BD-123-login-error',
	'Use lowercase letters, digits and hyphens after the ID.',
].join('\n');

export function classifyBranch(name) {
	if (PERMANENT_BRANCHES.includes(name)) {
		return name;
	}
	if (FEATURE.test(name)) {
		return 'feature';
	}
	if (HOTFIX.test(name)) {
		return 'hotfix';
	}
	if (DEPENDABOT.test(name)) {
		return 'dependabot';
	}
	return null;
}

export function validateBranchName(name) {
	const kind = classifyBranch(name ?? '');
	if (kind === null) {
		return {
			valid: false,
			kind: null,
			reason: `"${name}" is not an allowed branch name.\n${BRANCH_NAME_HELP}`,
		};
	}
	return { valid: true, kind };
}

export function validatePullRequest(head, base) {
	const named = validateBranchName(head);
	if (!named.valid) {
		return named;
	}
	const allowed = ALLOWED_SOURCES[base];
	if (!allowed) {
		return {
			valid: false,
			kind: named.kind,
			reason: `Pull requests into "${base}" are not supported. Use develop, uat or main.`,
		};
	}
	if (!allowed.includes(named.kind)) {
		return {
			valid: false,
			kind: named.kind,
			reason:
				`"${head}" (${named.kind}) cannot be merged into ${base}. ` +
				`Allowed sources for ${base}: ${allowed.join(', ')}.`,
		};
	}
	return { valid: true, kind: named.kind };
}

function readOption(args, name) {
	const index = args.indexOf(name);
	return index === -1 ? undefined : args[index + 1];
}

function main() {
	const args = process.argv.slice(2);
	const head = readOption(args, '--head');
	const base = readOption(args, '--base');
	if (!head) {
		console.error('Usage: node scripts/check-branch-name.mjs --head <branch> [--base <branch>]');
		process.exitCode = 2;
		return;
	}
	const result = base ? validatePullRequest(head, base) : validateBranchName(head);
	if (!result.valid) {
		console.error(result.reason);
		process.exitCode = 1;
		return;
	}
	console.log(base ? `OK: ${head} (${result.kind}) -> ${base}` : `OK: ${head} (${result.kind})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
	main();
}
