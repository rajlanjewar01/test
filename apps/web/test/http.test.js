import { expect } from 'chai';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import httpModule from '../src/modules/common/http/index.js';

const { axiosInstance } = httpModule;

const HEALTH_URL = 'http://localhost/api/v1/health';
const server = setupServer(http.get(HEALTH_URL, () => HttpResponse.json({ status: 'ok' })));

describe('MSW intercepts HTTP requests', () => {
	before(() => server.listen({ onUnhandledRequest: 'error' }));
	afterEach(() => server.resetHandlers());
	after(() => server.close());

	it('returns the mocked response for an axios request', async () => {
		const result = await axiosInstance.get(HEALTH_URL);
		expect(result.wasSuccess).to.equal(true);
		expect(result.response).to.deep.equal({ status: 'ok' });
	});

	it('lets a test override the handler for one case', async () => {
		server.use(http.get(HEALTH_URL, () => HttpResponse.json({ error: 'down' }, { status: 503 })));
		let failure;
		try {
			await axiosInstance.get(HEALTH_URL);
		} catch (error) {
			failure = error;
		}
		expect(failure).to.have.property('wasSuccess', false);
	});

	it('fails a request that has no handler', async () => {
		let failure;
		try {
			await fetch('http://localhost/api/v1/unknown');
		} catch (error) {
			failure = error;
		}
		expect(failure).to.be.instanceOf(Error);
	});
});
