import { expect } from 'chai';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const HEALTH_URL = 'http://localhost/api/v1/health';
const server = setupServer(http.get(HEALTH_URL, () => HttpResponse.json({ status: 'ok' })));

describe('MSW intercepts native fetch', () => {
	before(() => server.listen({ onUnhandledRequest: 'error' }));
	afterEach(() => server.resetHandlers());
	after(() => server.close());

	it('returns the mocked response for a native fetch', async () => {
		const response = await fetch(HEALTH_URL);
		expect(response.status).to.equal(200);
		expect(await response.json()).to.deep.equal({ status: 'ok' });
	});

	it('lets a test override the handler for one case', async () => {
		server.use(http.get(HEALTH_URL, () => HttpResponse.json({ error: 'down' }, { status: 503 })));
		const response = await fetch(HEALTH_URL);
		expect(response.status).to.equal(503);
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
