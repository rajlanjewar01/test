import { expect } from 'chai';
import { getAppInfo } from '../src/lib/app-info.js';

describe('web toolchain', () => {
	it('E0-01 AC1 runs a Mocha and Chai test in apps/web', () => {
		const info = getAppInfo();
		expect(info.name).to.equal('bigdaddy-web');
		expect(info.locales).to.deep.equal(['en', 'es', 'fr']);
	});
});
