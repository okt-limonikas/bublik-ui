/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { LogTableData, RootBlockSchema } from '@/shared/types';

import { MergedLogEntry, StepRange } from './log-diff.types';

/**
 * Deep clone a log entry and its children
 */
function cloneLogEntry<T extends LogTableData>(entry: T): T {
	return {
		...entry,
		log_content: [...entry.log_content],
		children: entry.children?.map((child) => cloneLogEntry(child))
	};
}

/**
 * Find all Step entries in the main log (user_name === "Step")
 * Returns them with their timestamp ranges for matching
 */
export function findStepRanges(mainLog: LogTableData[]): StepRange[] {
	const steps: StepRange[] = [];

	mainLog.forEach((entry, index) => {
		if (entry.user_name === 'Step') {
			steps.push({
				entry,
				index,
				startTime: entry.timestamp.timestamp,
				endTime: Infinity // Will be updated below
			});
		}
	});

	// Set end times based on next step's start time
	for (let i = 0; i < steps.length - 1; i++) {
		steps[i].endTime = steps[i + 1].startTime;
	}

	return steps;
}

/**
 * Find the Step that an attachment entry belongs to based on timestamp
 */
export function findMatchingStep(
	timestamp: number,
	stepRanges: StepRange[]
): StepRange | null {
	// Find the step whose range contains this timestamp
	for (const step of stepRanges) {
		if (timestamp >= step.startTime && timestamp < step.endTime) {
			return step;
		}
	}

	// If timestamp is before first step, return first step
	if (stepRanges.length > 0 && timestamp < stepRanges[0].startTime) {
		return stepRanges[0];
	}

	// If timestamp is after all steps, return last step
	if (stepRanges.length > 0) {
		return stepRanges[stepRanges.length - 1];
	}

	return null;
}

/**
 * Merge attachment log entries into the main log structure
 *
 * Algorithm:
 * 1. Find all Steps in main log (user_name === "Step")
 * 2. Build timestamp ranges for each Step
 * 3. For each level-0 entry in attachment log, find matching Step by timestamp
 * 4. Insert as child of that Step with composite line number
 */
export function mergeLogData(
	mainLog: LogTableData[],
	attachmentLog: LogTableData[],
	attachmentSource = 'attachment'
): MergedLogEntry[] {
	if (!attachmentLog.length) {
		return mainLog.map((entry) => cloneLogEntry(entry) as MergedLogEntry);
	}

	// Deep clone main log to avoid mutations
	const mergedLog: MergedLogEntry[] = mainLog.map(
		(entry) => cloneLogEntry(entry) as MergedLogEntry
	);

	// Find all step ranges
	const stepRanges = findStepRanges(mainLog);

	if (stepRanges.length === 0) {
		// No steps found, append attachment entries at root level
		const attachmentEntries = attachmentLog.map((entry, idx) =>
			createAttachmentEntry(entry, idx + 1, 'root', attachmentSource)
		);
		return [...mergedLog, ...attachmentEntries];
	}

	// Group attachment entries by their matching step
	const entriesByStep = new Map<number, MergedLogEntry[]>();

	attachmentLog.forEach((entry, idx) => {
		const matchingStep = findMatchingStep(
			entry.timestamp.timestamp,
			stepRanges
		);

		if (matchingStep) {
			const stepLineNumber = matchingStep.entry.line_number;
			if (!entriesByStep.has(stepLineNumber)) {
				entriesByStep.set(stepLineNumber, []);
			}
			entriesByStep.get(stepLineNumber)!.push(
				createAttachmentEntry(
					entry,
					idx + 1,
					stepLineNumber.toString(),
					attachmentSource
				)
			);
		}
	});

	// Insert attachment entries as children of their matching steps
	function insertIntoChildren(entries: MergedLogEntry[]): void {
		entries.forEach((entry) => {
			const stepLineNumber = entry.compositeLineNumber?.split('.')[0];
			if (!stepLineNumber) return;

			const stepEntry = mergedLog.find(
				(e) =>
					e.line_number === Number(stepLineNumber) && e.user_name === 'Step'
			);

			if (stepEntry) {
				if (!stepEntry.children) {
					stepEntry.children = [];
				}
				// Insert at the appropriate position based on timestamp
				insertByTimestamp(stepEntry.children, entry);
			}
		});
	}

	// Insert all grouped entries
	entriesByStep.forEach((entries) => {
		insertIntoChildren(entries);
	});

	return mergedLog;
}

/**
 * Create an attachment entry with merge metadata
 */
function createAttachmentEntry(
	entry: LogTableData,
	attachmentLineNumber: number,
	stepLineNumber: string,
	attachmentSource: string
): MergedLogEntry {
	return {
		...cloneLogEntry(entry),
		isFromAttachment: true,
		originalLineNumber: entry.line_number,
		compositeLineNumber: `${stepLineNumber}.${attachmentLineNumber}`,
		attachmentSource
	};
}

/**
 * Insert an entry into a children array maintaining timestamp order
 */
function insertByTimestamp(
	children: MergedLogEntry[],
	entry: MergedLogEntry
): void {
	const insertIndex = children.findIndex(
		(child) => child.timestamp.timestamp > entry.timestamp.timestamp
	);

	if (insertIndex === -1) {
		children.push(entry);
	} else {
		children.splice(insertIndex, 0, entry);
	}
}

/**
 * Parse and validate JSON log data
 */
export function parseLogJson(json: string): {
	data: LogTableData[] | null;
	error: string | null;
} {
	try {
		const parsed = JSON.parse(json);
		const result = RootBlockSchema.safeParse(parsed);

		if (!result.success) {
			return {
				data: null,
				error: `Invalid log format: ${result.error.message}`
			};
		}

		// Extract te-log-table data from the root block
		const logPage = result.data.root[0];
		if (logPage?.type !== 'te-log') {
			return { data: null, error: 'Expected te-log type in root' };
		}

		const logTable = logPage.content.find(
			(block) => block.type === 'te-log-table'
		);
		if (!logTable || logTable.type !== 'te-log-table') {
			return { data: null, error: 'No te-log-table found in content' };
		}

		return { data: logTable.data, error: null };
	} catch (e) {
		return {
			data: null,
			error: `JSON parse error: ${e instanceof Error ? e.message : 'Unknown error'}`
		};
	}
}

/**
 * Get row color for merged entries (extends getRowColor from log-table.utils)
 */
export function getMergedRowColor(row: MergedLogEntry): string {
	if (row.isFromAttachment) {
		return 'bg-purple-100/70 hover:bg-purple-200/70 border-l-4 border-purple-400';
	}

	// Fall back to standard row colors
	const BLUE_HIGHLIGHT = ['TAPI Jumps'];
	const GREEN_HIGHLIGHT = ['StepPush', 'StepPop', 'Artifact', 'Verdict'];
	const PRIORITY_LEVELS_HIGHLIGHT = ['ERROR', 'WARN'];

	const getColorByLevel = (level: LogTableData['level']) => {
		switch (level) {
			case 'ERROR':
				return 'bg-red-200/80 hover:bg-red-300/70';
			case 'WARN':
				return 'bg-orange-200/60 hover:bg-orange-300/70';
			case 'INFO':
				return 'bg-blue-200/60 hover:bg-blue-200';
			case 'VERB':
				return 'bg-indigo-200/80 hover:bg-indigo-300';
			case 'PACKET':
				return 'bg-gray-200 hover:bg-gray-300/80';
			default:
				return 'hover:bg-gray-50';
		}
	};

	const isErrorLevel = (level: string) =>
		PRIORITY_LEVELS_HIGHLIGHT.includes(level);

	if (PRIORITY_LEVELS_HIGHLIGHT.includes(row.level)) {
		return getColorByLevel(row.level);
	}

	if (BLUE_HIGHLIGHT.includes(row.user_name) && !isErrorLevel(row.level)) {
		return 'bg-blue-200/60 hover:bg-blue-200';
	}

	if (
		GREEN_HIGHLIGHT.includes(row.user_name) &&
		row.level !== 'MI' &&
		!isErrorLevel(row.level)
	) {
		return 'bg-green-200/70 hover:bg-green-300';
	}

	return getColorByLevel(row.level);
}
