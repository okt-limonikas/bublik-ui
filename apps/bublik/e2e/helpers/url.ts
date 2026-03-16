function getLogsBaseUrl(): string {
	const baseUrl = process.env['BASE_URL'] || 'http://localhost:4400/v2/';
	const url = new URL(baseUrl);
	url.pathname = '/logs/';
	url.search = '';
	url.hash = '';
	return url.toString();
}

export { getLogsBaseUrl };
