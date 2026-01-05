/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { AttachmentLogInput } from './log-diff.types';

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
 * Sample attachment log 1: Debug agent messages (purple)
 */
export const SAMPLE_ATTACHMENT_LOG_1 = {
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
								timestamp: 1704067200.05,
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
								timestamp: 1704067200.15,
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
								timestamp: 1704067212.0,
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
								timestamp: 1704067235.0,
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
 * Sample attachment log 2: Network monitor messages (amber)
 */
export const SAMPLE_ATTACHMENT_LOG_2 = {
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
							entity_name: 'net_monitor',
							user_name: 'Network',
							timestamp: {
								timestamp: 1704067210.05,
								formatted: '10:00:10.050'
							},
							log_content: [
								{
									type: 'te-log-table-content-text' as const,
									content: '[NET] Packet received: 64 bytes from 192.168.1.2'
								}
							]
						},
						{
							line_number: 2,
							level: 'RING' as const,
							entity_name: 'net_monitor',
							user_name: 'Network',
							timestamp: {
								timestamp: 1704067216.0,
								formatted: '10:00:16.000'
							},
							log_content: [
								{
									type: 'te-log-table-content-text' as const,
									content: '[NET] TCP handshake completed'
								}
							]
						},
						{
							line_number: 3,
							level: 'ERROR' as const,
							entity_name: 'net_monitor',
							user_name: 'Network',
							timestamp: {
								timestamp: 1704067222.0,
								formatted: '10:00:22.000'
							},
							log_content: [
								{
									type: 'te-log-table-content-text' as const,
									content: '[NET] Packet retransmission detected'
								}
							]
						},
						{
							line_number: 4,
							level: 'RING' as const,
							entity_name: 'net_monitor',
							user_name: 'Network',
							timestamp: {
								timestamp: 1704067232.0,
								formatted: '10:00:32.000'
							},
							log_content: [
								{
									type: 'te-log-table-content-text' as const,
									content: '[NET] Connection stable, 0 errors'
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
 * Sample attachment log 3: System metrics (teal)
 */
export const SAMPLE_ATTACHMENT_LOG_3 = {
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
							entity_name: 'sys_metrics',
							user_name: 'Metrics',
							timestamp: {
								timestamp: 1704067200.08,
								formatted: '10:00:00.080'
							},
							log_content: [
								{
									type: 'te-log-table-content-text' as const,
									content: '[SYS] CPU: 12%, Memory: 45%, Disk I/O: 5MB/s'
								}
							]
						},
						{
							line_number: 2,
							level: 'RING' as const,
							entity_name: 'sys_metrics',
							user_name: 'Metrics',
							timestamp: {
								timestamp: 1704067214.0,
								formatted: '10:00:14.000'
							},
							log_content: [
								{
									type: 'te-log-table-content-text' as const,
									content: '[SYS] CPU: 35%, Memory: 52%, Disk I/O: 12MB/s'
								}
							]
						},
						{
							line_number: 3,
							level: 'WARN' as const,
							entity_name: 'sys_metrics',
							user_name: 'Metrics',
							timestamp: {
								timestamp: 1704067224.0,
								formatted: '10:00:24.000'
							},
							log_content: [
								{
									type: 'te-log-table-content-text' as const,
									content: '[SYS] CPU: 78%, Memory: 68%, Disk I/O: 45MB/s (high load)'
								}
							]
						},
						{
							line_number: 4,
							level: 'RING' as const,
							entity_name: 'sys_metrics',
							user_name: 'Metrics',
							timestamp: {
								timestamp: 1704067238.0,
								formatted: '10:00:38.000'
							},
							log_content: [
								{
									type: 'te-log-table-content-text' as const,
									content: '[SYS] CPU: 15%, Memory: 46%, Disk I/O: 3MB/s'
								}
							]
						},
						{
							line_number: 5,
							level: 'RING' as const,
							entity_name: 'sys_metrics',
							user_name: 'Metrics',
							timestamp: {
								timestamp: 1704067242.0,
								formatted: '10:00:42.000'
							},
							log_content: [
								{
									type: 'te-log-table-content-text' as const,
									content: '[SYS] Final stats - Avg CPU: 35%, Peak Memory: 68%'
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
 * Get sample attachment logs as array of AttachmentLogInput
 */
export function getSampleAttachmentLogs(): AttachmentLogInput[] {
	return [
		{
			id: 'debug',
			name: 'Debug Agent',
			json: JSON.stringify(SAMPLE_ATTACHMENT_LOG_1, null, 2),
			error: null
		},
		{
			id: 'network',
			name: 'Network Monitor',
			json: JSON.stringify(SAMPLE_ATTACHMENT_LOG_2, null, 2),
			error: null
		},
		{
			id: 'metrics',
			name: 'System Metrics',
			json: JSON.stringify(SAMPLE_ATTACHMENT_LOG_3, null, 2),
			error: null
		}
	];
}

/**
 * Get a single sample attachment log JSON (backward compatibility)
 */
export function getSampleAttachmentLogJson(): string {
	return JSON.stringify(SAMPLE_ATTACHMENT_LOG_1, null, 2);
}
