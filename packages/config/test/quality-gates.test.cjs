'use strict';

const { expect } = require('chai');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..', '..', '..');
const readText = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const readJson = (...parts) => JSON.parse(readText(...parts));

const isWin = process.platform === 'win32';
const binMap = {};
const pkgNames = { commitlint: '@commitlint/cli' };
const resolveBin = (name) => {
	if (!binMap[name]) {
		const pkg_name = pkgNames[name] || name;
		const pkgPath = require.resolve(`${pkg_name}/package.json`);
		const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
		const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin[name];
		binMap[name] = path.resolve(path.dirname(pkgPath), bin);
	}
	return binMap[name];
};

const run = (args, input) => {
	const [cmd, ...rest] = args;
	return spawnSync(process.execPath, [resolveBin(cmd), ...rest], {
		cwd: root,
		input,
		encoding: 'utf8',
	});
};

const lintSample = (filename, code) => {
	const result = run(['eslint', '--stdin', '--stdin-filename', filename, '--format', 'json'], code);
	expect(result.stdout, result.stderr).to.not.equal('');
	const [report] = JSON.parse(result.stdout);
	return report.messages.map((message) => message.ruleId);
};

describe('lint, format and commit gates', function () {
	this.timeout(120000);

	describe('ESLint', () => {
		it('passes on all workspaces with zero warnings', () => {
			const result = run(['eslint', '.', '--max-warnings', '0']);
			expect(result.status, result.stdout + result.stderr).to.equal(0);
		});

		it('uses the shared ESLint config from @bigdaddy/config', () => {
			expect(readText('eslint.config.mjs')).to.include('@bigdaddy/config/eslint.base.mjs');
		});

		it('accepts clean code', () => {
			expect(lintSample('apps/web/src/sample.js', 'export const answer = 42;\n')).to.deep.equal([]);
		});

		it('flags var and loose equality', () => {
			const rules = lintSample(
				'apps/web/src/sample.js',
				'var a = 1;\nif (a == 1) {\n  a = 2;\n}\n',
			);
			expect(rules).to.include('no-var');
			expect(rules).to.include('eqeqeq');
		});

		it('flags an import the workspace does not declare', () => {
			const rules = lintSample(
				'apps/web/src/sample.js',
				"import typescript from 'typescript';\nexport default typescript;\n",
			);
			expect(rules).to.include('import/no-extraneous-dependencies');
		});
	});

	describe('Prettier', () => {
		it('check passes on all workspaces', () => {
			const result = run(['prettier', '--check', '.']);
			expect(result.status, result.stdout + result.stderr).to.equal(0);
		});

		it('formats with the shared Prettier config', () => {
			expect(readText('prettier.config.mjs')).to.include('@bigdaddy/config/prettier.base.mjs');
			const result = run(
				['prettier', '--stdin-filepath', 'apps/web/src/sample.js'],
				'const a = {b:"x"}',
			);
			expect(result.stdout).to.equal("const a = { b: 'x' };\n");
		});
	});

	describe('commitlint', () => {
		it('rejects a message that is not a Conventional Commit', () => {
			const result = run(['commitlint'], 'added some stuff');
			expect(result.status, result.stdout + result.stderr).to.not.equal(0);
		});

		it('rejects an unknown type', () => {
			const result = run(['commitlint'], 'feature: add health endpoint');
			expect(result.status).to.not.equal(0);
		});

		it('accepts a Conventional Commit', () => {
			const result = run(['commitlint'], 'feat(api): add health endpoint');
			expect(result.status, result.stdout + result.stderr).to.equal(0);
		});

		it('uses the shared commitlint config from @bigdaddy/config', () => {
			expect(readText('commitlint.config.mjs')).to.include('@bigdaddy/config/commitlint.base.mjs');
		});
	});

	describe('Husky and lint-staged', () => {
		it('installs the hooks through the prepare script', () => {
			expect(readJson('package.json').scripts.prepare).to.equal('husky');
		});

		it('runs lint-staged on pre-commit', () => {
			expect(readText('.husky/pre-commit')).to.include('lint-staged');
		});

		it('runs commitlint on commit-msg', () => {
			expect(readText('.husky/commit-msg')).to.include('commitlint --edit');
		});

		it('lint-staged runs ESLint and Prettier on staged code', async () => {
			const configUrl = pathToFileURL(path.join(root, 'lint-staged.config.mjs')).href;
			const { default: config } = await import(configUrl);
			const commands = config['*.{js,mjs,cjs,ts}'].join(' ');
			expect(commands).to.include('eslint');
			expect(commands).to.include('prettier');
		});

		describe('commit-msg hook behaviour', () => {
			let messageFile;

			const runHook = (message) => {
				fs.writeFileSync(messageFile, message);
				if (isWin) {
					return spawnSync(process.execPath, [resolveBin('commitlint'), '--edit', messageFile], {
						cwd: root,
						encoding: 'utf8',
						timeout: 30000,
					});
				}
				return spawnSync('sh', ['.husky/commit-msg', messageFile], {
					cwd: root,
					encoding: 'utf8',
					timeout: 30000,
				});
			};

			before(() => {
				messageFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bigdaddy-')), 'MSG');
			});

			it('the commit-msg hook rejects a bad message', () => {
				const result = runHook('added some stuff\n');
				expect(result.status, result.stdout + result.stderr).to.not.equal(0);
			});

			it('the commit-msg hook accepts a good message', () => {
				const result = runHook('chore(repo): add quality gates\n');
				expect(result.status, result.stdout + result.stderr).to.equal(0);
			});
		});
	});
});
