'use strict';

const { expect } = require('chai');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..', '..');
const readText = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const readJson = (...parts) => JSON.parse(readText(...parts));

describe('Vue SFC test harness', function () {
	this.timeout(180000);

	const webPackage = readJson('apps/web/package.json');

	it('registers the SFC loader and compiles with compiler-sfc and esbuild', () => {
		expect(readText('apps/web/.mocharc.cjs')).to.include('register-vue-loader.mjs');
		const compiler = readText('apps/web/test-support/compile-sfc.mjs');
		expect(compiler).to.include("from 'vue/compiler-sfc'");
		expect(compiler).to.include("from 'esbuild'");
		expect(readText('apps/web/test-support/register-vue-loader.mjs')).to.include('registerHooks');
	});

	it('declares Vue, @vue/test-utils and jsdom for the web app', () => {
		expect(webPackage.dependencies).to.have.property('vue');
		expect(webPackage.devDependencies).to.have.property('@vue/test-utils');
		expect(webPackage.devDependencies).to.have.property('jsdom');
		expect(readText('apps/web/.mocharc.cjs')).to.include('setup-dom.mjs');
	});

	it('declares MSW for the web app', () => {
		expect(webPackage.devDependencies).to.have.property('msw');
	});

	it('counts .vue files in the shared c8 configuration', () => {
		expect(readJson('packages/config/c8.base.json').extension).to.include('.vue');
	});

	it('reports coverage for a .vue file with lines mapped back into that file', () => {
		const result = spawnSync('npm', ['run', 'test:coverage', '--workspace', '@bigdaddy/web'], {
			cwd: root,
			encoding: 'utf8',
			shell: true,
		});
		expect(result.status, result.stdout + result.stderr).to.equal(0);

		const lcov = readText('apps/web/coverage/lcov.info');
		const record = lcov.split('end_of_record').find((entry) => entry.includes('SampleCounter.vue'));
		expect(record, 'lcov record for SampleCounter.vue').to.be.a('string');

		const lines = [...record.matchAll(/^DA:(\d+),(\d+)$/gm)].map((match) => ({
			line: Number(match[1]),
			hits: Number(match[2]),
		}));
		const fileLineCount = readText('apps/web/src/components/SampleCounter.vue').split('\n').length;
		expect(lines.length, 'mapped lines').to.be.greaterThan(0);
		expect(Math.max(...lines.map((entry) => entry.line))).to.be.at.most(fileLineCount);
		expect(lines.some((entry) => entry.hits > 0)).to.equal(true);
	});

	it('records the approach in an ADR with status, decision and alternatives', () => {
		const adr = readText('docs/adr/0001-vue-sfc-testing-with-mocha.md');
		for (const heading of [
			'## Status',
			'## Context',
			'## Decision',
			'## Consequences',
			'## Alternatives',
		]) {
			expect(adr).to.include(heading);
		}
	});

	it('names the tools and the escalation rule in the ADR', () => {
		const adr = readText('docs/adr/0001-vue-sfc-testing-with-mocha.md');
		expect(adr).to.include('@vue/compiler-sfc');
		expect(adr).to.include('esbuild');
		expect(adr).to.include('registerHooks');
		expect(adr).to.include('Escalation');
	});
});
