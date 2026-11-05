import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
	url: 'http://localhost/',
	pretendToBeVisual: true,
});
const { window } = dom;

const define = (key, value) =>
	Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });

// Always take these from jsdom (Node 25 and later ship its own localStorage).
for (const key of ['window', 'document', 'localStorage', 'sessionStorage', 'location', 'history']) {
	define(key, window[key]);
}

// jsdom constructors (HTMLElement, MouseEvent, ...). Anything Node already has
// (fetch, Event, AbortController, URL, ...) is left alone so MSW can intercept native fetch.
for (const key of Object.getOwnPropertyNames(window)) {
	if (/^[A-Z]/.test(key) && !(key in globalThis)) {
		define(key, window[key]);
	}
}

for (const key of ['getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) {
	define(key, window[key].bind(window));
}
