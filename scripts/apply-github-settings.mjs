#!/usr/bin/env node
// Applies the repository settings and branch rulesets described in CONTRIBUTING.md.
// Requires the GitHub CLI (gh) logged in with admin rights on the repository.
// Usage:
//   node scripts/apply-github-settings.mjs --dry-run
//   node scripts/apply-github-settings.mjs [--repo owner/name] [--bypass] [--no-code-owner-review]
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const REQUIRED_CHECK = 'CI passed';

export const REPOSITORY_SETTINGS = {
	default_branch: 'develop',
	allow_squash_merge: true,
	allow_merge_commit: true,
	allow_rebase_merge: false,
	delete_branch_on_merge: true,
	allow_update_branch: true,
};

export const WORKFLOW_PERMISSIONS = {
	default_workflow_permissions: 'read',
	can_approve_pull_request_reviews: false,
};

const SECRET_SCANNING = {
	security_and_analysis: {
		secret_scanning: { status: 'enabled' },
		secret_scanning_push_protection: { status: 'enabled' },
	},
};

const USAGE =
	'Usage: node scripts/apply-github-settings.mjs [--repo owner/name] [--bypass] ' +
	'[--no-code-owner-review] [--dry-run]';

export function buildRuleset({
	name,
	branches,
	mergeMethod,
	bypass = false,
	codeOwnerReview = true,
	approvals = 1,
	requiredCheck = REQUIRED_CHECK,
}) {
	return {
		name,
		target: 'branch',
		enforcement: 'active',
		conditions: {
			ref_name: { include: branches.map((branch) => `refs/heads/${branch}`), exclude: [] },
		},
		// Role 5 is repository admin. Mode pull_request: may merge a PR without approval,
		// but can never push directly to the branch.
		bypass_actors: bypass
			? [{ actor_id: 5, actor_type: 'RepositoryRole', bypass_mode: 'pull_request' }]
			: [],
		rules: [
			{ type: 'deletion' },
			{ type: 'non_fast_forward' },
			{
				type: 'pull_request',
				parameters: {
					required_approving_review_count: approvals,
					dismiss_stale_reviews_on_push: true,
					require_code_owner_review: codeOwnerReview,
					require_last_push_approval: false,
					required_review_thread_resolution: true,
					allowed_merge_methods: [mergeMethod],
				},
			},
			{
				type: 'required_status_checks',
				parameters: {
					strict_required_status_checks_policy: true,
					required_status_checks: [{ context: requiredCheck }],
				},
			},
		],
	};
}

export function buildRulesets(options = {}) {
	return [
		buildRuleset({
			...options,
			name: 'protect-develop',
			branches: ['develop'],
			mergeMethod: 'squash',
		}),
		buildRuleset({
			...options,
			name: 'protect-uat-main',
			branches: ['uat', 'main'],
			mergeMethod: 'merge',
		}),
	];
}

export function buildPlan(options = {}) {
	return {
		repository: REPOSITORY_SETTINGS,
		workflowPermissions: WORKFLOW_PERMISSIONS,
		rulesets: buildRulesets(options),
	};
}

function parseArgs(argv) {
	const options = { repo: undefined, bypass: false, codeOwnerReview: true, dryRun: false };
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--repo') {
			options.repo = argv[index + 1];
			index += 1;
		} else if (arg === '--bypass') {
			options.bypass = true;
		} else if (arg === '--no-code-owner-review') {
			options.codeOwnerReview = false;
		} else if (arg === '--dry-run') {
			options.dryRun = true;
		} else {
			throw new Error(`Unknown option: ${arg}`);
		}
	}
	return options;
}

function gh(args, body) {
	return execFileSync('gh', ['api', ...args, ...(body === undefined ? [] : ['--input', '-'])], {
		input: body === undefined ? undefined : JSON.stringify(body),
		encoding: 'utf8',
		stdio: ['pipe', 'pipe', 'pipe'],
	});
}

function detectRepository() {
	return execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], {
		encoding: 'utf8',
	}).trim();
}

function upsertRuleset(repo, ruleset) {
	const existing = JSON.parse(gh([`repos/${repo}/rulesets`])).find(
		(entry) => entry.name === ruleset.name,
	);
	if (existing) {
		gh(['-X', 'PUT', `repos/${repo}/rulesets/${existing.id}`], ruleset);
		return 'updated';
	}
	gh(['-X', 'POST', `repos/${repo}/rulesets`], ruleset);
	return 'created';
}

function runStep(label, action) {
	try {
		const outcome = action();
		console.log(`ok   ${label}${outcome ? ` (${outcome})` : ''}`);
		return true;
	} catch (error) {
		const detail = String(error.stderr || error.message || '').trim();
		console.error(`FAIL ${label}: ${detail}`);
		return false;
	}
}

function main() {
	let options;
	try {
		options = parseArgs(process.argv.slice(2));
	} catch (error) {
		console.error(`${error.message}\n${USAGE}`);
		process.exitCode = 2;
		return;
	}

	const plan = buildPlan(options);
	if (options.dryRun) {
		console.log(JSON.stringify(plan, null, 2));
		return;
	}

	const repo = options.repo ?? detectRepository();
	console.log(`Applying settings to ${repo}`);
	const results = [
		runStep('repository settings', () => {
			gh(['-X', 'PATCH', `repos/${repo}`], plan.repository);
		}),
		runStep('actions workflow permissions', () => {
			gh(['-X', 'PUT', `repos/${repo}/actions/permissions/workflow`], plan.workflowPermissions);
		}),
		runStep('dependabot alerts', () => {
			gh(['-X', 'PUT', `repos/${repo}/vulnerability-alerts`]);
		}),
		runStep('dependabot security updates', () => {
			gh(['-X', 'PUT', `repos/${repo}/automated-security-fixes`]);
		}),
		runStep('secret scanning and push protection', () => {
			gh(['-X', 'PATCH', `repos/${repo}`], SECRET_SCANNING);
		}),
		...plan.rulesets.map((ruleset) =>
			runStep(`ruleset ${ruleset.name}`, () => upsertRuleset(repo, ruleset)),
		),
	];
	process.exitCode = results.every(Boolean) ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
	main();
}
