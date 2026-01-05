/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useCallback, useMemo, useState } from 'react';

import { LogTableData } from '@/shared/types';
import { ButtonTw, cn, TextArea } from '@/shared/tailwind-ui';

import { LogDiffViewMode, MergedLogEntry } from './log-diff.types';
import { mergeLogData, parseLogJson, getMergedRowColor } from './log-diff.utils';
import { getSampleMainLogJson, getSampleAttachmentLogJson } from './sample-data';

/**
 * View mode toggle component
 */
interface ViewToggleProps {
	viewMode: LogDiffViewMode;
	onViewModeChange: (mode: LogDiffViewMode) => void;
}

function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
	return (
		<div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
			<ButtonTw
				variant={viewMode === 'side-by-side' ? 'primary' : 'ghost'}
				size="sm"
				onClick={() => onViewModeChange('side-by-side')}
			>
				Side-by-Side
			</ButtonTw>
			<ButtonTw
				variant={viewMode === 'merged' ? 'primary' : 'ghost'}
				size="sm"
				onClick={() => onViewModeChange('merged')}
			>
				Merged
			</ButtonTw>
		</div>
	);
}

/**
 * Data input component for JSON logs
 */
interface DataInputProps {
	mainLogJson: string;
	attachmentLogJson: string;
	onMainLogChange: (json: string) => void;
	onAttachmentLogChange: (json: string) => void;
	onLoadSampleData: () => void;
	mainLogError: string | null;
	attachmentLogError: string | null;
}

function DataInput({
	mainLogJson,
	attachmentLogJson,
	onMainLogChange,
	onAttachmentLogChange,
	onLoadSampleData,
	mainLogError,
	attachmentLogError
}: DataInputProps) {
	return (
		<div className="grid grid-cols-2 gap-4">
			<div className="space-y-2">
				<TextArea
					label="Main Log (JSON)"
					name="mainLog"
					value={mainLogJson}
					onChange={(e) => onMainLogChange(e.target.value)}
					rows={10}
					className="font-mono text-xs"
					error={mainLogError ?? undefined}
				/>
			</div>
			<div className="space-y-2">
				<TextArea
					label="Attachment Log (JSON)"
					name="attachmentLog"
					value={attachmentLogJson}
					onChange={(e) => onAttachmentLogChange(e.target.value)}
					rows={10}
					className="font-mono text-xs"
					error={attachmentLogError ?? undefined}
				/>
			</div>
			<div className="col-span-2">
				<ButtonTw variant="secondary" size="sm" onClick={onLoadSampleData}>
					Load Sample Data
				</ButtonTw>
			</div>
		</div>
	);
}

/**
 * Simple log entry row component
 */
interface LogRowProps {
	entry: MergedLogEntry;
	depth?: number;
}

function LogRow({ entry, depth = 0 }: LogRowProps) {
	const rowColor = getMergedRowColor(entry);
	const paddingLeft = depth * 24;

	return (
		<>
			<tr className={cn('border-b border-gray-200', rowColor)}>
				<td
					className="px-2 py-1 font-mono text-xs text-gray-500 whitespace-nowrap"
					style={{ paddingLeft: paddingLeft + 8 }}
				>
					{entry.compositeLineNumber ?? entry.line_number}
				</td>
				<td className="px-2 py-1 text-xs font-medium whitespace-nowrap">
					{entry.level}
				</td>
				<td className="px-2 py-1 text-xs whitespace-nowrap">
					{entry.timestamp.formatted}
				</td>
				<td className="px-2 py-1 text-xs whitespace-nowrap">
					{entry.entity_name}
				</td>
				<td className="px-2 py-1 text-xs whitespace-nowrap">
					{entry.user_name}
				</td>
				<td className="px-2 py-1 text-xs">
					{entry.log_content.map((content, idx) => (
						<span key={idx} className="whitespace-pre-wrap">
							{content.type === 'te-log-table-content-text'
								? content.content
								: content.type === 'te-log-table-content-file'
									? content.content
									: `[${content.type}]`}
						</span>
					))}
				</td>
				<td className="px-2 py-1 text-xs">
					{entry.isFromAttachment && (
						<span className="px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 bg-purple-200 rounded">
							ATT
						</span>
					)}
				</td>
			</tr>
			{entry.children?.map((child) => (
				<LogRow key={child.line_number} entry={child} depth={depth + 1} />
			))}
		</>
	);
}

/**
 * Simple log table component
 */
interface LogTableProps {
	data: MergedLogEntry[];
	title?: string;
}

function LogTable({ data, title }: LogTableProps) {
	return (
		<div className="flex flex-col h-full overflow-hidden border rounded-lg border-border-primary">
			{title && (
				<div className="px-3 py-2 font-medium bg-gray-50 border-b border-border-primary">
					{title}
				</div>
			)}
			<div className="flex-1 overflow-auto">
				<table className="w-full text-left">
					<thead className="sticky top-0 bg-white border-b border-gray-300">
						<tr>
							<th className="px-2 py-2 text-xs font-semibold text-gray-600">
								Line
							</th>
							<th className="px-2 py-2 text-xs font-semibold text-gray-600">
								Level
							</th>
							<th className="px-2 py-2 text-xs font-semibold text-gray-600">
								Time
							</th>
							<th className="px-2 py-2 text-xs font-semibold text-gray-600">
								Entity
							</th>
							<th className="px-2 py-2 text-xs font-semibold text-gray-600">
								User
							</th>
							<th className="px-2 py-2 text-xs font-semibold text-gray-600">
								Content
							</th>
							<th className="px-2 py-2 text-xs font-semibold text-gray-600">
								Source
							</th>
						</tr>
					</thead>
					<tbody>
						{data.map((entry) => (
							<LogRow key={entry.line_number} entry={entry} />
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

/**
 * Merged view component
 */
interface MergedViewProps {
	mergedData: MergedLogEntry[];
}

function MergedView({ mergedData }: MergedViewProps) {
	return (
		<div className="h-full">
			<LogTable data={mergedData} title="Merged Log" />
		</div>
	);
}

/**
 * Side-by-side view component
 */
interface SideBySideViewProps {
	mainLog: LogTableData[];
	attachmentLog: LogTableData[];
}

function SideBySideView({ mainLog, attachmentLog }: SideBySideViewProps) {
	return (
		<div className="grid h-full grid-cols-2 gap-4">
			<LogTable data={mainLog as MergedLogEntry[]} title="Main Log" />
			<LogTable
				data={attachmentLog as MergedLogEntry[]}
				title="Attachment Log"
			/>
		</div>
	);
}

/**
 * Main Log Diff Page component
 */
export function LogDiffPage() {
	const [mainLogJson, setMainLogJson] = useState('');
	const [attachmentLogJson, setAttachmentLogJson] = useState('');
	const [viewMode, setViewMode] = useState<LogDiffViewMode>('merged');
	const [showInput, setShowInput] = useState(true);

	// Parse logs
	const parsedMainLog = useMemo(() => {
		if (!mainLogJson) return { data: null, error: null };
		return parseLogJson(mainLogJson);
	}, [mainLogJson]);

	const parsedAttachmentLog = useMemo(() => {
		if (!attachmentLogJson) return { data: null, error: null };
		return parseLogJson(attachmentLogJson);
	}, [attachmentLogJson]);

	// Merge logs
	const mergedLog = useMemo(() => {
		if (!parsedMainLog.data) return null;
		return mergeLogData(
			parsedMainLog.data,
			parsedAttachmentLog.data ?? [],
			'attachment'
		);
	}, [parsedMainLog.data, parsedAttachmentLog.data]);

	const handleLoadSampleData = useCallback(() => {
		setMainLogJson(getSampleMainLogJson());
		setAttachmentLogJson(getSampleAttachmentLogJson());
	}, []);

	const hasValidData = parsedMainLog.data !== null;

	return (
		<div className="flex flex-col h-full gap-4 p-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-semibold text-text-primary">
					Log Diff / Merge
				</h1>
				<div className="flex items-center gap-4">
					<ButtonTw
						variant="outline"
						size="sm"
						onClick={() => setShowInput(!showInput)}
					>
						{showInput ? 'Hide Input' : 'Show Input'}
					</ButtonTw>
					{hasValidData && (
						<ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
					)}
				</div>
			</div>

			{/* Data Input Section */}
			{showInput && (
				<div className="p-4 border rounded-lg border-border-primary bg-gray-50">
					<DataInput
						mainLogJson={mainLogJson}
						attachmentLogJson={attachmentLogJson}
						onMainLogChange={setMainLogJson}
						onAttachmentLogChange={setAttachmentLogJson}
						onLoadSampleData={handleLoadSampleData}
						mainLogError={parsedMainLog.error}
						attachmentLogError={parsedAttachmentLog.error}
					/>
				</div>
			)}

			{/* Log View Section */}
			{hasValidData ? (
				<div className="flex-1 min-h-0">
					{viewMode === 'merged' && mergedLog ? (
						<MergedView mergedData={mergedLog} />
					) : viewMode === 'side-by-side' && parsedMainLog.data ? (
						<SideBySideView
							mainLog={parsedMainLog.data}
							attachmentLog={parsedAttachmentLog.data ?? []}
						/>
					) : null}
				</div>
			) : (
				<div className="flex items-center justify-center flex-1 text-gray-500">
					<div className="text-center">
						<p className="mb-2">
							Paste JSON log data above or click "Load Sample Data" to see a
							demo
						</p>
						<p className="text-sm text-gray-400">
							Expected format: Root block with te-log containing te-log-table
						</p>
					</div>
				</div>
			)}
		</div>
	);
}

export default LogDiffPage;
