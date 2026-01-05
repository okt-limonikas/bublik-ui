/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { LogTableData } from '@/shared/types';

/**
 * Extended log entry with merge metadata
 */
export interface MergedLogEntry extends LogTableData {
	/** Indicates if this entry came from the attachment log */
	isFromAttachment?: boolean;
	/** Original line number from source log */
	originalLineNumber?: number;
	/** Composite line number for attachment entries (e.g., "42.1") */
	compositeLineNumber?: string;
	/** Source identifier for the attachment log */
	attachmentSource?: string;
	/** Extended children with merge metadata */
	children?: MergedLogEntry[];
}

/**
 * Step range for timestamp matching
 */
export interface StepRange {
	/** The Step entry from the main log */
	entry: LogTableData;
	/** Index in the main log array */
	index: number;
	/** Start timestamp (inclusive) */
	startTime: number;
	/** End timestamp (exclusive, Infinity for last step) */
	endTime: number;
}

/**
 * View mode for the log diff page
 */
export type LogDiffViewMode = 'side-by-side' | 'merged';

/**
 * State for the log diff page
 */
export interface LogDiffState {
	mainLogJson: string;
	attachmentLogJson: string;
	viewMode: LogDiffViewMode;
	error: string | null;
}

/**
 * Parsed log data for rendering
 */
export interface ParsedLogData {
	mainLog: LogTableData[] | null;
	attachmentLog: LogTableData[] | null;
	mergedLog: MergedLogEntry[] | null;
}
