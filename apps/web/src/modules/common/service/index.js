import http from '../http/index.js';

const { axiosInstance } = http;

export function dispatch(definition, params = {}, body, options = {}) {
	const { pathConfig, headers = {}, verb = 'GET' } = definition;
	let path = pathConfig.path;

	for (const [key, value] of Object.entries(params)) {
		path = path.replace(`:${key}`, encodeURIComponent(value));
	}

	const { abortController, ...restOptions } = options;

	const config = {
		url: path,
		method: verb,
		headers,
		...restOptions,
	};

	if (body !== undefined) {
		config.data = body;
	}

	if (abortController) {
		config.signal = abortController.signal;
	}

	return axiosInstance.request(config);
}

export default {
	dispatch,
};
