'use strict';

const base = require('@bigdaddy/config/mocharc.base.cjs');

module.exports = {
	...base,
	'node-option': [
		'import=./test-support/register-vue-loader.mjs',
		'import=./test-support/setup-dom.mjs',
	],
	globals: ['__VUE*'],
	spec: ['test/**/*.test.js'],
};
