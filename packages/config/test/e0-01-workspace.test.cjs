'use strict';

const { expect } = require('chai');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..', '..');
const readText = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const readJson = (...parts) => JSON.parse(readText(...parts));

describe('E0-01 monorepo scaffold', () => {
	it('E0-01 AC1 contains the required top-level directories', () => {
		const required = [
			'apps/web',
			'apps/api',
			'packages/seed',
			'packages/config',
			'infra',
			'docs',
			'.github',
		];
		for (const dir of required) {
			const fullPath = path.join(root, dir);
			expect(fs.existsSync(fullPath), `${dir} should exist`).to.equal(true);
			expect(fs.statSync(fullPath).isDirectory(), `${dir} should be a directory`).to.equal(true);
		}
	});

	it('E0-01 AC1 declares apps and packages as npm workspaces', () => {
		const { workspaces } = readJson('package.json');
		expect(workspaces).to.deep.equal(['apps/*', 'packages/*']);
	});

	it('E0-01 AC2 pins the Node LTS version in .nvmrc and engines', () => {
		const nvmrc = readText('.nvmrc').trim();
		const rootPackage = readJson('package.json');
		expect(nvmrc).to.match(/^\d+$/);
		expect(rootPackage.engines.node).to.include(nvmrc);
		expect(readText('.npmrc')).to.include('engine-strict=true');
	});

	it('E0-01 AC3 exposes a workspace-wide test command and a test script per app', () => {
		expect(readJson('package.json').scripts.test).to.equal(
			'npm run test --workspaces --if-present',
		);
		expect(readJson('apps/api/package.json').scripts.test).to.equal('mocha');
		expect(readJson('apps/web/package.json').scripts.test).to.equal('mocha');
	});

	it('E0-01 AC4 runs c8 with the shared config in each app', () => {
		for (const app of ['apps/api', 'apps/web']) {
			const script = readJson(app, 'package.json').scripts['test:coverage'];
			expect(script, `${app} test:coverage`).to.include('c8');
			expect(script, `${app} test:coverage`).to.include('packages/config/c8.base.json');
		}
	});

	it('E0-01 AC4 enforces 80% lines and branches in the shared c8 config', () => {
		const c8Config = readJson('packages/config/c8.base.json');
		expect(c8Config['check-coverage']).to.equal(true);
		expect(c8Config.lines).to.equal(80);
		expect(c8Config.branches).to.equal(80);
	});

	it('E0-01 AC5 makes each app depend on and extend the shared config', () => {
		for (const app of ['apps/api', 'apps/web']) {
			const pkg = readJson(app, 'package.json');
			expect(pkg.devDependencies['@bigdaddy/config'], `${app} dependency`).to.equal('*');
			expect(readText(app, '.mocharc.cjs'), `${app} mocharc`).to.include(
				'@bigdaddy/config/mocharc.base.cjs',
			);
		}
		const apiTsconfig = readJson('apps/api/tsconfig.json');
		expect(apiTsconfig.extends).to.equal('@bigdaddy/config/tsconfig.base.json');
	});
});
