'use strict';

const { expect } = require('chai');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const YAML = require('yaml');

const root = path.resolve(__dirname, '..', '..', '..');
const readText = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const loadScript = (name) => import(pathToFileURL(path.join(root, 'scripts', name)).href);
const runScript = (name, args) =>
	spawnSync(process.execPath, [path.join(root, 'scripts', name), ...args], {
		cwd: root,
		encoding: 'utf8',
	});

const workflow = YAML.parse(readText('.github', 'workflows', 'ci.yml'));

describe('branching and PR process', function () {
	this.timeout(60000);

	describe('PR template', () => {
		const template = readText('.github', 'pull_request_template.md');

		it('has summary, story ID, how to test and checklist sections', () => {
			for (const heading of ['## Summary', '## Story ID', '## How to test', '## Checklist']) {
				expect(template).to.include(heading);
			}
		});

		it('has a checklist of unchecked items covering the quality gates', () => {
			const items = template.split('\n').filter((line) => line.startsWith('- [ ] '));
			expect(items.length).to.be.at.least(6);
			expect(template).to.include('80%');
			expect(template).to.include('keyboard accessible');
			expect(template).to.include('Conventional Commit');
		});
	});

	describe('CODEOWNERS', () => {
		const rules = readText('.github', 'CODEOWNERS')
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line && !line.startsWith('#'));

		it('assigns every file to at least one owner', () => {
			const catchAll = rules.find((line) => line.startsWith('* '));
			expect(catchAll, 'a "* @owner" rule').to.be.a('string');
			const owners = catchAll.split(/\s+/).slice(1);
			expect(owners.length).to.be.at.least(1);
			for (const owner of owners) {
				expect(owner).to.match(/^@[A-Za-z0-9][A-Za-z0-9-]*(\/[A-Za-z0-9._-]+)?$/);
			}
		});

		it('no longer contains the @OWNER placeholder', () => {
			expect(rules.join(' ')).to.not.include('@OWNER');
		});

		it('requires code owner review in the rulesets by default', async () => {
			const { buildRulesets } = await loadScript('apply-github-settings.mjs');
			for (const ruleset of buildRulesets()) {
				const rule = ruleset.rules.find((entry) => entry.type === 'pull_request');
				expect(rule.parameters.require_code_owner_review, ruleset.name).to.equal(true);
			}
		});

		it('can switch code owner review off for a solo maintainer', async () => {
			const { buildRulesets } = await loadScript('apply-github-settings.mjs');
			const [develop] = buildRulesets({ codeOwnerReview: false });
			const rule = develop.rules.find((entry) => entry.type === 'pull_request');
			expect(rule.parameters.require_code_owner_review).to.equal(false);
		});
	});

	describe('branch protection script', () => {
		it('protects develop, uat and main with two active rulesets', async () => {
			const { buildRulesets } = await loadScript('apply-github-settings.mjs');
			const rulesets = buildRulesets();
			expect(rulesets.map((ruleset) => ruleset.name)).to.deep.equal([
				'protect-develop',
				'protect-uat-main',
			]);
			expect(rulesets[0].conditions.ref_name.include).to.deep.equal(['refs/heads/develop']);
			expect(rulesets[1].conditions.ref_name.include).to.deep.equal([
				'refs/heads/uat',
				'refs/heads/main',
			]);
			for (const ruleset of rulesets) {
				expect(ruleset.enforcement).to.equal('active');
				expect(ruleset.target).to.equal('branch');
			}
		});

		it('requires a pull request with at least one approval', async () => {
			const { buildRulesets } = await loadScript('apply-github-settings.mjs');
			for (const ruleset of buildRulesets()) {
				const rule = ruleset.rules.find((entry) => entry.type === 'pull_request');
				expect(rule, ruleset.name).to.not.equal(undefined);
				expect(rule.parameters.required_approving_review_count).to.be.at.least(1);
				expect(rule.parameters.dismiss_stale_reviews_on_push).to.equal(true);
				expect(rule.parameters.required_review_thread_resolution).to.equal(true);
			}
		});

		it('blocks direct pushes, force pushes and deletion', async () => {
			const { buildRulesets } = await loadScript('apply-github-settings.mjs');
			for (const ruleset of buildRulesets()) {
				const types = ruleset.rules.map((rule) => rule.type);
				expect(types, ruleset.name).to.include.members([
					'pull_request',
					'non_fast_forward',
					'deletion',
				]);
			}
		});

		it('requires the CI passed check to be up to date', async () => {
			const { buildRulesets, REQUIRED_CHECK } = await loadScript('apply-github-settings.mjs');
			expect(REQUIRED_CHECK).to.equal(workflow.jobs['ci-passed'].name);
			for (const ruleset of buildRulesets()) {
				const rule = ruleset.rules.find((entry) => entry.type === 'required_status_checks');
				expect(rule.parameters.strict_required_status_checks_policy, ruleset.name).to.equal(true);
				expect(rule.parameters.required_status_checks).to.deep.equal([{ context: 'CI passed' }]);
			}
		});

		it('allows squash only into develop and merge commits only into uat and main', async () => {
			const { buildRulesets } = await loadScript('apply-github-settings.mjs');
			const methods = buildRulesets().map(
				(ruleset) =>
					ruleset.rules.find((rule) => rule.type === 'pull_request').parameters
						.allowed_merge_methods,
			);
			expect(methods).to.deep.equal([['squash'], ['merge']]);
		});

		it('grants an admin bypass for pull requests only when asked', async () => {
			const { buildRulesets } = await loadScript('apply-github-settings.mjs');
			expect(buildRulesets()[0].bypass_actors).to.deep.equal([]);
			expect(buildRulesets({ bypass: true })[0].bypass_actors).to.deep.equal([
				{ actor_id: 5, actor_type: 'RepositoryRole', bypass_mode: 'pull_request' },
			]);
		});

		it('sets repository defaults for the branching model', async () => {
			const { REPOSITORY_SETTINGS } = await loadScript('apply-github-settings.mjs');
			expect(REPOSITORY_SETTINGS).to.include({
				default_branch: 'develop',
				allow_squash_merge: true,
				allow_merge_commit: true,
				allow_rebase_merge: false,
				delete_branch_on_merge: true,
			});
		});

		it('prints the plan as JSON on a dry run without calling GitHub', () => {
			const result = runScript('apply-github-settings.mjs', ['--dry-run', '--bypass']);
			expect(result.status, result.stderr).to.equal(0);
			const plan = JSON.parse(result.stdout);
			expect(plan.rulesets).to.have.lengthOf(2);
			expect(plan.repository.default_branch).to.equal('develop');
			expect(plan.rulesets[0].bypass_actors).to.have.lengthOf(1);
		});

		it('rejects unknown options', () => {
			const result = runScript('apply-github-settings.mjs', ['--nope']);
			expect(result.status).to.equal(2);
			expect(result.stderr).to.include('Unknown option');
		});
	});

	describe('branch name check', () => {
		it('accepts feature branches named after a story', async () => {
			const { validateBranchName } = await loadScript('check-branch-name.mjs');
			for (const name of [
				'feature/E0-06-branching-and-pr-process',
				'feature/E4-02-page-sizes',
				'feature/E14-05-playwright-suite',
			]) {
				expect(validateBranchName(name), name).to.deep.equal({ valid: true, kind: 'feature' });
			}
		});

		it('accepts hotfix branches named after a ticket', async () => {
			const { validateBranchName } = await loadScript('check-branch-name.mjs');
			for (const name of ['hotfix/BD-123-login-error', 'hotfix/INC2-45-fix-cart']) {
				expect(validateBranchName(name), name).to.deep.equal({ valid: true, kind: 'hotfix' });
			}
		});

		it('rejects names that break the pattern', async () => {
			const { validateBranchName } = await loadScript('check-branch-name.mjs');
			for (const name of [
				'my-branch',
				'feature/add-login',
				'feature/E4-02',
				'feature/E4-2-page-sizes',
				'feature/E4-02-Page-Sizes',
				'feature/e4-02-page-sizes',
				'hotfix/login-error',
				'hotfix/bd-123-login-error',
				'bugfix/E4-02-page-sizes',
				'',
			]) {
				const result = validateBranchName(name);
				expect(result.valid, `"${name}"`).to.equal(false);
				expect(result.reason, `"${name}"`).to.include('feature/STORY-ID-name');
			}
		});

		it('accepts only the allowed source branches for each target branch', async () => {
			const { validatePullRequest } = await loadScript('check-branch-name.mjs');
			const valid = [
				['feature/E4-02-page-sizes', 'develop'],
				['hotfix/BD-123-login-error', 'develop'],
				['dependabot/npm_and_yarn/mocha-12.0.0', 'develop'],
				['develop', 'uat'],
				['hotfix/BD-123-login-error', 'uat'],
				['uat', 'main'],
				['hotfix/BD-123-login-error', 'main'],
			];
			for (const [head, base] of valid) {
				expect(validatePullRequest(head, base).valid, `${head} -> ${base}`).to.equal(true);
			}
			const invalid = [
				['feature/E4-02-page-sizes', 'uat'],
				['feature/E4-02-page-sizes', 'main'],
				['develop', 'main'],
				['uat', 'develop'],
				['main', 'develop'],
				['develop', 'develop'],
				['dependabot/npm_and_yarn/mocha-12.0.0', 'main'],
				['feature/E4-02-page-sizes', 'release'],
			];
			for (const [head, base] of invalid) {
				expect(validatePullRequest(head, base).valid, `${head} -> ${base}`).to.equal(false);
			}
		});

		it('explains why a pull request pairing is rejected', async () => {
			const { validatePullRequest } = await loadScript('check-branch-name.mjs');
			const result = validatePullRequest('feature/E4-02-page-sizes', 'main');
			expect(result.reason).to.include('cannot be merged into main');
			expect(result.reason).to.include('uat');
		});

		it('exits non-zero on the command line for a bad name', () => {
			const result = runScript('check-branch-name.mjs', [
				'--head',
				'my-branch',
				'--base',
				'develop',
			]);
			expect(result.status).to.equal(1);
			expect(result.stderr).to.include('feature/STORY-ID-name');
		});

		it('exits zero on the command line for a good name', () => {
			const result = runScript('check-branch-name.mjs', [
				'--head',
				'feature/E0-06-branching-and-pr-process',
				'--base',
				'develop',
			]);
			expect(result.status, result.stderr).to.equal(0);
			expect(result.stdout).to.include('OK');
		});

		it('exits with a usage error when no branch is given', () => {
			expect(runScript('check-branch-name.mjs', []).status).to.equal(2);
		});

		it('runs the check on pull requests in CI and requires it for CI passed', () => {
			const job = workflow.jobs['branch-name'];
			expect(job.if).to.equal("github.event_name == 'pull_request'");
			const step = job.steps.find(
				(entry) => entry.run && entry.run.includes('check-branch-name.mjs'),
			);
			expect(step, 'branch name step').to.not.equal(undefined);
			expect(step.run).to.include('"$HEAD_REF"');
			expect(step.env.HEAD_REF).to.include('github.head_ref');
			expect(step.env.BASE_REF).to.include('github.base_ref');
			expect(workflow.jobs['ci-passed'].needs).to.include('branch-name');
		});
	});

	describe('CONTRIBUTING', () => {
		const guide = readText('CONTRIBUTING.md');

		it('documents the branch naming patterns', () => {
			expect(guide).to.include('feature/STORY-ID-name');
			expect(guide).to.include('hotfix/TICKET-name');
		});

		it('documents squash-merge into develop and merge commits for uat and main', () => {
			expect(guide).to.match(/\|\s*`develop`\s*\|\s*Squash merge/);
			expect(guide).to.match(/\|\s*`uat`\s*\|\s*Merge commit/);
			expect(guide).to.match(/\|\s*`main`\s*\|\s*Merge commit/);
		});

		it('documents the hotfix flow with back-merges into uat and develop', () => {
			expect(guide).to.include('## Hotfix');
			expect(guide).to.match(/back-merge/i);
			expect(guide).to.include('`uat`');
			expect(guide).to.include('`develop`');
		});

		it('states that direct pushes are not allowed', () => {
			expect(guide).to.match(/direct pushes/i);
		});
	});
});
