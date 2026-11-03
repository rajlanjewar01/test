import { expect } from 'chai';
import { getAppInfo } from '../src/lib/app-info.js';

describe('E0-01 web toolchain', () => {
	it('E0-01 AC3 runs a Mocha and Chai test in apps/web', () => {
		const info = getAppInfo();
		expect(info.name).to.equal('bigdaddy-web');
		expect(info.locales).to.deep.equal(['en', 'es', 'fr']);
	});
});
