import { expect } from 'chai';
import { getAppInfo } from '../src/app-info';

describe('api toolchain', () => {
	it('runs a Mocha and Chai test in apps/api', () => {
		const info = getAppInfo();
		expect(info.name).to.equal('bigdaddy-api');
		expect(info.apiPrefix).to.equal('/api/v1');
	});

	it('accepts a custom API prefix', () => {
		const info = getAppInfo('/api/v2');
		expect(info.apiPrefix).to.equal('/api/v2');
	});
});
