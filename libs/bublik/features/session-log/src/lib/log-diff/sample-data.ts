/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */

/**
 * Sample main log data for demonstration
 */
export const SAMPLE_MAIN_LOG = {
	version: 'v1' as const,
	root: [
		{
			type: 'te-log' as const,
			content: [
				{
					type: 'te-log-meta' as const,
					entity_model: {
						id: '123',
						name: 'sample_test',
						entity: 'Test' as const,
						result: 'PASSED' as const,
						extended_properties: {
							tin: '100',
							hash: 'abc123'
						}
					},
					meta: {
						start: '10:00:00.000',
						end: '10:01:00.000',
						duration: '0:1:0.000',
						objective: 'Sample test for log diff demonstration'
					}
				},
				{
					type: 'te-log-table' as const,
					data: [
						{
							line_number: 1,
							level: 'RING' as const,
							entity_name: 'sample_test',
							user_name: 'Step',
							timestamp: {
								timestamp: 1704067200.0, // 10:00:00
								formatted: '10:00:00.000'
							},
							log_content: [
								{
									type: 'te-log-table-content-text' as const,
									content: 'Test initialization'
								}
							],
							children: [
								{
									line_number: 2,
									level: 'INFO' as const,
									entity_name: 'sample_test',
									user_name: 'Self',
									timestamp: {
										timestamp: 1704067200.1,
										formatted: '10:00:00.100'
									},
									log_content: [
										{
											type: 'te-log-table-content-text' as const,
											content: 'Initializing test environment'
										}
									]
								},
								{
									line_number: 3,
									level: 'RING' as const,
									entity_name: 'sample_test',
									user_name: 'RPC',
									timestamp: {
										timestamp: 1704067200.2,
										formatted: '10:00:00.200'
									},
									log_content: [
										{
											type: 'te-log-table-content-text' as const,
											content: 'RPC server started'
										}
									]
								}
							]
						},
						{
							line_number: 4,
							level: 'RING' as const,
							entity_name: 'sample_test',
							user_name: 'Step',
							timestamp: {
								timestamp: 1704067210.0, // 10:00:10
								formatted: '10:00:10.000'
							},
							log_content: [
								{
									type: 'te-log-table-content-text' as const,
									content: 'Running test case'
								}
							],
							children: [
								{
									line_number: 5,
									level: 'RING' as const,
									entity_name: 'sample_test',
									user_name: 'TAPI RPC',
									timestamp: {
										timestamp: 1704067210.1,
										formatted: '10:00:10.100'
									},
									log_content: [
										{
											type: 'te-log-table-content-text' as const,
											content: 'Executing socket(PF_INET, SOCK_STREAM, 0)'
										}
									]
								},
								{
									line_number: 6,
									level: 'RING' as const,
									entity_name: 'sample_test',
									user_name: 'TAPI RPC',
									timestamp: {
										timestamp: 1704067215.0,
										formatted: '10:00:15.000'
									},
									log_content: [
										{
											type: 'te-log-table-content-text' as const,
											content: 'Executing bind(6, 192.168.1.1:8080)'
										}
									]
								},
								{
									line_number: 7,
									level: 'RING' as const,
									entity_name: 'sample_test',
									user_name: 'TAPI RPC',
									timestamp: {
										timestamp: 1704067220.0,
										formatted: '10:00:20.000'
									},
									log_content: [
										{
											type: 'te-log-table-content-text' as const,
											content: 'Executing listen(6, 10)'
										}
									]
								}
							]
						},
						{
							line_number: 8,
							level: 'RING' as const,
							entity_name: 'sample_test',
							user_name: 'Step',
							timestamp: {
								timestamp: 1704067230.0, // 10:00:30
								formatted: '10:00:30.000'
							},
							log_content: [
								{
									type: 'te-log-table-content-text' as const,
									content: 'Verifying results'
								}
							],
							children: [
								{
									line_number: 9,
									level: 'RING' as const,
									entity_name: 'sample_test',
									user_name: 'Self',
									timestamp: {
										timestamp: 1704067230.1,
										formatted: '10:00:30.100'
									},
									log_content: [
										{
											type: 'te-log-table-content-text' as const,
											content: 'All assertions passed'
										}
									]
								}
							]
						},
						{
							line_number: 10,
							level: 'RING' as const,
							entity_name: 'sample_test',
							user_name: 'Step',
							timestamp: {
								timestamp: 1704067240.0, // 10:00:40
								formatted: '10:00:40.000'
							},
							log_content: [
								{
									type: 'te-log-table-content-text' as const,
									content: 'Test cleanup'
								}
							],
							children: [
								{
									line_number: 11,
									level: 'RING' as const,
									entity_name: 'Tester',
									user_name: 'Run',
									timestamp: {
										timestamp: 1704067240.5,
										formatted: '10:00:40.500'
									},
									log_content: [
										{
											type: 'te-log-table-content-text' as const,
											content: 'Test result: PASSED'
										}
									]
								}
							]
						}
					]
				}
			]
		}
	]
};

/**
 * Sample attachment log data for demonstration
 * Contains DEBUG messages that would be merged based on timestamps
 */
export const SAMPLE_ATTACHMENT_LOG = {
	version: 'v1' as const,
	root: [
		{
			type: 'te-log' as const,
			content: [
				{
					type: 'te-log-table' as const,
					data: [
						{
							line_number: 1,
							level: 'RING' as const,
							entity_name: 'debug_agent',
							user_name: 'Debug',
							timestamp: {
								timestamp: 1704067200.05, // Between 10:00:00.000 and 10:00:00.100
								formatted: '10:00:00.050'
							},
							log_content: [
								{
									type: 'te-log-table-content-text' as const,
									content: '[DEBUG] Memory allocation: 1024 bytes'
								}
							]
						},
						{
							line_number: 2,
							level: 'RING' as const,
							entity_name: 'debug_agent',
							user_name: 'Debug',
							timestamp: {
								timestamp: 1704067200.15, // Between 10:00:00.100 and 10:00:00.200
								formatted: '10:00:00.150'
							},
							log_content: [
								{
									type: 'te-log-table-content-text' as const,
									content: '[DEBUG] Config loaded successfully'
								}
							]
						},
						{
							line_number: 3,
							level: 'WARN' as const,
							entity_name: 'debug_agent',
							user_name: 'Debug',
							timestamp: {
								timestamp: 1704067212.0, // In Step 4 range (10:00:10 - 10:00:30)
								formatted: '10:00:12.000'
							},
							log_content: [
								{
									type: 'te-log-table-content-text' as const,
									content: '[WARN] Connection timeout approaching'
								}
							]
						},
						{
							line_number: 4,
							level: 'RING' as const,
							entity_name: 'debug_agent',
							user_name: 'Debug',
							timestamp: {
								timestamp: 1704067218.0, // In Step 4 range
								formatted: '10:00:18.000'
							},
							log_content: [
								{
									type: 'te-log-table-content-text' as const,
									content: '[DEBUG] Packet received: 512 bytes'
								}
							]
						},
						{
							line_number: 5,
							level: 'ERROR' as const,
							entity_name: 'debug_agent',
							user_name: 'Debug',
							timestamp: {
								timestamp: 1704067225.0, // In Step 4 range
								formatted: '10:00:25.000'
							},
							log_content: [
								{
									type: 'te-log-table-content-text' as const,
									content: '[ERROR] Temporary network glitch detected'
								}
							]
						},
						{
							line_number: 6,
							level: 'RING' as const,
							entity_name: 'debug_agent',
							user_name: 'Debug',
							timestamp: {
								timestamp: 1704067235.0, // In Step 8 range (10:00:30 - 10:00:40)
								formatted: '10:00:35.000'
							},
							log_content: [
								{
									type: 'te-log-table-content-text' as const,
									content: '[DEBUG] Verification complete'
								}
							]
						}
					]
				}
			]
		}
	]
};

/**
 * Get sample main log as JSON string
 */
export function getSampleMainLogJson(): string {
	return JSON.stringify(SAMPLE_MAIN_LOG, null, 2);
}

/**
 * Get sample attachment log as JSON string
 */
export function getSampleAttachmentLogJson(): string {
	return JSON.stringify(SAMPLE_ATTACHMENT_LOG, null, 2);
}
