import { SourceMap } from 'node:module';
import { expect } from 'chai';
import { compileSfc } from '../test-support/compile-sfc.mjs';

const FILENAME = '/virtual/Answer.vue';
const SOURCE = [
	'<template>',
	'  <p>{{ answer }}</p>',
	'</template>',
	'',
	'<script>',
	'export default {',
	'  computed: {',
	'    answer() {',
	'      return 42;',
	'    },',
	'  },',
	'};',
	'</script>',
	'',
].join('\n');

const INLINE_MAP = /sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)/;

describe('Vue SFC compiler', () => {
	it('compiles an SFC to an ES module with a render function and an inline source map', () => {
		const { code } = compileSfc(SOURCE, FILENAME);
		expect(code).to.include('export default');
		expect(code).to.include('render');
		expect(code).to.match(INLINE_MAP);
	});

	it('maps script lines back to the same lines in the .vue file', () => {
		const { code } = compileSfc(SOURCE, FILENAME);
		const payload = JSON.parse(Buffer.from(INLINE_MAP.exec(code)[1], 'base64').toString('utf8'));
		const generatedLines = code.split('\n');
		const lineIndex = generatedLines.findIndex((line) => line.includes('return 42'));
		expect(lineIndex, 'generated line containing return 42').to.be.greaterThan(-1);

		const entry = new SourceMap(payload).findEntry(
			lineIndex,
			generatedLines[lineIndex].indexOf('return'),
		);
		expect(entry.originalSource).to.equal(FILENAME);
		expect(entry.originalLine).to.equal(8); // zero-based: line 9 of the .vue file
	});

	it('rejects <script setup> because the project uses the Options API', () => {
		expect(() => compileSfc('<script setup>\nconst a = 1;\n</script>\n', FILENAME)).to.throw(
			'script setup',
		);
	});

	it('rejects TypeScript script blocks because the web app is JavaScript', () => {
		expect(() =>
			compileSfc('<script lang="ts">\nexport default {};\n</script>\n', FILENAME),
		).to.throw('lang="ts"');
	});

	it('reports template compile errors with the file name', () => {
		const broken =
			'<template>\n  <div v-if>x</div>\n</template>\n<script>\nexport default {};\n</script>\n';
		expect(() => compileSfc(broken, FILENAME)).to.throw(FILENAME);
	});

	it('imports .vue files as ES modules through the registered loader', async () => {
		const module = await import('../src/components/common/SampleCounter.vue');
		expect(module.default.name).to.equal('SampleCounter');
		expect(module.default.render).to.be.a('function');
	});
});
