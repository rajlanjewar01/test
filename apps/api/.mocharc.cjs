'use strict';

const base = require('@bigdaddy/config/mocharc.base.cjs');

module.exports = {
	...base,
	'node-option': ['import=tsx'],
	spec: ['test/**/*.test.ts'],
};
