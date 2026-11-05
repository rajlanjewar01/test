import { expect } from 'chai';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const HEALTH_URL = 'http://localhost/api/v1/health';
const server = setupServer(http.get(HEALTH_URL, () => HttpResponse.json({ status: 'ok' })));

describe('E0-05 MSW intercepts native fetch', () => {
	before(() => server.listen({ onUnhandledRequest: 'error' }));
	afterEach(() => server.resetHandlers());
	after(() => server.close());

	it('E0-05 AC3 returns the mocked response for a native fetch', async () => {
		const response = await fetch(HEALTH_URL);
		expect(response.status).to.equal(200);
		expect(await response.json()).to.deep.equal({ status: 'ok' });
	});

	it('E0-05 AC3 lets a test override the handler for one case', async () => {
		server.use(http.get(HEALTH_URL, () => HttpResponse.json({ error: 'down' }, { status: 503 })));
		const response = await fetch(HEALTH_URL);
		expect(response.status).to.equal(503);
	});

	it('E0-05 AC3 fails a request that has no handler', async () => {
		let failure;
		try {
			await fetch('http://localhost/api/v1/unknown');
		} catch (error) {
			failure = error;
		}
		expect(failure).to.be.instanceOf(Error);
	});
});
