function createReferencesConfig(logsBaseUrl: string): string {
	return JSON.stringify(
		{
			REVISIONS: {
				TE_REV: {
					uri: 'https://github.com/ts-factory/test-environment',
					name: 'Test Environment'
				}
			},
			LOGS_BASES: [
				{
					uri: [logsBaseUrl],
					name: 'Local Logs Base'
				}
			]
		},
		null,
		2
	);
}

export { createReferencesConfig };
