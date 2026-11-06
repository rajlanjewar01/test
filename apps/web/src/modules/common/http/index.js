import axios from 'axios';

const BASE_URL = '/api/v1';

const successHandler = (response) => {
	const { config, data, status, statusText, headers, request } = response;

	return Promise.resolve({
		response: data,
		status,
		statusText,
		config,
		headers,
		request,
		wasSuccess: true,
	});
};

const errorHandler = (error) => {
	if (error.message === 'canceled') {
		return new Promise(() => {});
	}

	const { message } = error.toJSON ? error.toJSON() : error;
	const { status = 500 } = error.response ?? {};

	return Promise.reject({
		wasSuccess: false,
		wasNotFound: status === 404,
		wasBadRequest: status === 400,
		wasForbidden: status === 403,
		response: error.response,
		message,
	});
};

const axiosInstance = axios.create({
	baseURL: BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
	validateStatus: (status) => status >= 200 && status < 400,
});

axiosInstance.interceptors.response.use(successHandler, errorHandler);

export default { axiosInstance };
