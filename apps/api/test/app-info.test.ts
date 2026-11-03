import { expect } from 'chai';
import { getAppInfo } from '../src/app-info';

describe('E0-01 api toolchain', () => {
  it('E0-01 AC3 runs a Mocha and Chai test in apps/api', () => {
	const info = getAppInfo();
	expect(info.name).to.equal('bigdaddy-api');
	expect(info.apiPrefix).to.equal('/api/v1');
  });
});
