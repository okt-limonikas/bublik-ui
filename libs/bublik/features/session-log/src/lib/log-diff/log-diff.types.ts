/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { LogTableData } from '@/shared/types';

/**
 * Extended log entry with merge metadata
 */
export interface MergedLogEntry extends LogTableData {
	/** Indicates if this entry came from an attachment log */
	isFromAttachment?: boolean;
	/** Original line number from source log */
	originalLineNumber?: number;
	/** Composite line number for attachment entries (e.g., "42.1") */
	compositeLineNumber?: string;
	/** Source identifier for the attachment log (e.g., "attachment-1", "attachment-2") */
	attachmentSource?: string;
	/** Index of the attachment source (for coloring) */
	attachmentIndex?: number;
	/** Extended children with merge metadata */
	children?: MergedLogEntry[];
	/** Indicates this is a placeholder row for alignment in side-by-side view */
	isPlaceholder?: boolean;
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
 * Attachment log input
 */
export interface AttachmentLogInput {
	id: string;
	name: string;
	json: string;
	error: string | null;
}

/**
 * Parsed attachment log
 */
export interface ParsedAttachmentLog {
	id: string;
	name: string;
	data: LogTableData[] | null;
	error: string | null;
}

/**
 * Aligned row for side-by-side view
 * NOTE: Each cell can have multiple entries if they share the same timestamp
 */
export interface AlignedRow {
	timestamp: number;
	mainEntries: MergedLogEntry[];
	attachmentEntries: MergedLogEntry[][];
}
