/* c8 ignore next 4 */
export interface AppInfo {
	name: string;
	apiPrefix: string;
}

export function getAppInfo(prefix = '/api/v1'): AppInfo {
	return { name: 'bigdaddy-api', apiPrefix: prefix };
}
