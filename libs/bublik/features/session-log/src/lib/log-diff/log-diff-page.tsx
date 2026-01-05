/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useCallback, useMemo, useState } from 'react';

import { ButtonTw, cn, TextArea, Icon } from '@/shared/tailwind-ui';

import {
	LogDiffViewMode,
	MergedLogEntry,
	AttachmentLogInput,
	ParsedAttachmentLog,
	AlignedRow
} from './log-diff.types';
import {
	mergeMultipleLogData,
	parseLogJson,
	getMergedRowColor,
	getAttachmentBadgeColor,
	createAlignedRows,
	ATTACHMENT_COLORS
} from './log-diff.utils';
import { getSampleMainLogJson, getSampleAttachmentLogs } from './sample-data';

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
 * Single attachment input component
 */
interface AttachmentInputProps {
	attachment: AttachmentLogInput;
	index: number;
	onUpdate: (id: string, updates: Partial<AttachmentLogInput>) => void;
	onRemove: (id: string) => void;
	canRemove: boolean;
}

function AttachmentInput({
	attachment,
	index,
	onUpdate,
	onRemove,
	canRemove
}: AttachmentInputProps) {
	const colorIndex = index % ATTACHMENT_COLORS.length;
	const borderColor = [
		'border-l-purple-400',
		'border-l-amber-400',
		'border-l-teal-400',
		'border-l-pink-400',
		'border-l-cyan-400'
	][colorIndex];

	return (
		<div className={cn('border-l-4 pl-3', borderColor)}>
			<div className="flex items-center gap-2 mb-2">
				<input
					type="text"
					value={attachment.name}
					onChange={(e) => onUpdate(attachment.id, { name: e.target.value })}
					className="flex-1 px-2 py-1 text-sm border rounded border-border-primary"
					placeholder="Attachment name"
				/>
				{canRemove && (
					<ButtonTw
						variant="ghost"
						size="xs"
						onClick={() => onRemove(attachment.id)}
						className="text-red-500 hover:text-red-700"
					>
						<Icon name="InformationCircleExclamationMark" className="w-4 h-4" />
					</ButtonTw>
				)}
			</div>
			<TextArea
				label=""
				name={`attachment-${attachment.id}`}
				value={attachment.json}
				onChange={(e) => onUpdate(attachment.id, { json: e.target.value })}
				rows={6}
				className="font-mono text-xs"
				error={attachment.error ?? undefined}
			/>
		</div>
	);
}

/**
 * Data input component for multiple attachment logs
 */
interface DataInputProps {
	mainLogJson: string;
	attachments: AttachmentLogInput[];
	onMainLogChange: (json: string) => void;
	onAttachmentsChange: (attachments: AttachmentLogInput[]) => void;
	onLoadSampleData: () => void;
	mainLogError: string | null;
}

function DataInput({
	mainLogJson,
	attachments,
	onMainLogChange,
	onAttachmentsChange,
	onLoadSampleData,
	mainLogError
}: DataInputProps) {
	const handleUpdateAttachment = useCallback(
		(id: string, updates: Partial<AttachmentLogInput>) => {
			onAttachmentsChange(
				attachments.map((a) => (a.id === id ? { ...a, ...updates } : a))
			);
		},
		[attachments, onAttachmentsChange]
	);

	const handleRemoveAttachment = useCallback(
		(id: string) => {
			onAttachmentsChange(attachments.filter((a) => a.id !== id));
		},
		[attachments, onAttachmentsChange]
	);

	const handleAddAttachment = useCallback(() => {
		const newId = `attachment-${Date.now()}`;
		onAttachmentsChange([
			...attachments,
			{
				id: newId,
				name: `Attachment ${attachments.length + 1}`,
				json: '',
				error: null
			}
		]);
	}, [attachments, onAttachmentsChange]);

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				{/* Main Log */}
				<div>
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

				{/* Attachment Logs */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<label className="text-sm font-medium text-text-primary">
							Attachment Logs ({attachments.length})
						</label>
						<ButtonTw variant="secondary" size="xs" onClick={handleAddAttachment}>
							+ Add Attachment
						</ButtonTw>
					</div>
					<div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
						{attachments.map((attachment, index) => (
							<AttachmentInput
								key={attachment.id}
								attachment={attachment}
								index={index}
								onUpdate={handleUpdateAttachment}
								onRemove={handleRemoveAttachment}
								canRemove={attachments.length > 1}
							/>
						))}
					</div>
				</div>
			</div>

			<div className="flex gap-2">
				<ButtonTw variant="secondary" size="sm" onClick={onLoadSampleData}>
					Load Sample Data (3 attachments)
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
						<span
							className={cn(
								'px-1.5 py-0.5 text-[10px] font-semibold rounded',
								getAttachmentBadgeColor(entry.attachmentIndex ?? 0)
							)}
						>
							{entry.attachmentSource?.substring(0, 3).toUpperCase() || 'ATT'}
						</span>
					)}
				</td>
			</tr>
			{entry.children?.map((child, idx) => (
				<LogRow key={`${child.line_number}-${idx}`} entry={child} depth={depth + 1} />
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
						{data.map((entry, idx) => (
							<LogRow key={`${entry.line_number}-${idx}`} entry={entry} />
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
 * Aligned cell for side-by-side view
 */
interface AlignedCellProps {
	entry: MergedLogEntry | null;
	isMainLog?: boolean;
	attachmentIndex?: number;
}

function AlignedCell({ entry, isMainLog, attachmentIndex }: AlignedCellProps) {
	if (!entry) {
		return (
			<div className="px-2 py-1 text-xs text-gray-300 bg-gray-50 border-b border-gray-100 min-h-[28px]">
				—
			</div>
		);
	}

	const rowColor = isMainLog
		? getMergedRowColor(entry)
		: getMergedRowColor({ ...entry, isFromAttachment: true, attachmentIndex });

	return (
		<div
			className={cn(
				'px-2 py-1 text-xs border-b border-gray-200 min-h-[28px]',
				rowColor
			)}
		>
			<div className="flex items-center gap-2">
				<span className="font-mono text-gray-500">
					{entry.compositeLineNumber ?? entry.line_number}
				</span>
				<span className="font-medium">{entry.level}</span>
				<span className="text-gray-500">{entry.timestamp.formatted}</span>
				<span className="flex-1 truncate">
					{entry.log_content[0]?.type === 'te-log-table-content-text'
						? (entry.log_content[0] as { content: string }).content
						: '...'}
				</span>
			</div>
		</div>
	);
}

/**
 * Aligned side-by-side view with placeholders
 */
interface AlignedSideBySideViewProps {
	alignedRows: AlignedRow[];
	attachmentNames: string[];
}

function AlignedSideBySideView({
	alignedRows,
	attachmentNames
}: AlignedSideBySideViewProps) {
	const columnCount = 1 + attachmentNames.length; // main + attachments

	return (
		<div className="flex flex-col h-full overflow-hidden border rounded-lg border-border-primary">
			{/* Header */}
			<div
				className="grid border-b border-border-primary bg-gray-50"
				style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
			>
				<div className="px-3 py-2 font-medium border-r border-border-primary">
					Main Log
				</div>
				{attachmentNames.map((name, idx) => {
					const colorIndex = idx % ATTACHMENT_COLORS.length;
					const borderClass = [
						'border-l-purple-400',
						'border-l-amber-400',
						'border-l-teal-400',
						'border-l-pink-400',
						'border-l-cyan-400'
					][colorIndex];
					return (
						<div
							key={idx}
							className={cn(
								'px-3 py-2 font-medium border-l-4',
								borderClass,
								idx < attachmentNames.length - 1 && 'border-r border-border-primary'
							)}
						>
							{name}
						</div>
					);
				})}
			</div>

			{/* Aligned rows */}
			<div className="flex-1 overflow-auto">
				<div
					className="grid"
					style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
				>
					{alignedRows.map((row, rowIdx) => (
						<>
							{/* Main log cell */}
							<div key={`main-${rowIdx}`} className="border-r border-gray-200">
								<AlignedCell entry={row.mainEntry} isMainLog />
							</div>
							{/* Attachment cells */}
							{row.attachmentEntries.map((entry, attIdx) => (
								<div
									key={`att-${rowIdx}-${attIdx}`}
									className={cn(
										attIdx < row.attachmentEntries.length - 1 &&
											'border-r border-gray-200'
									)}
								>
									<AlignedCell entry={entry} attachmentIndex={attIdx} />
								</div>
							))}
						</>
					))}
				</div>
			</div>
		</div>
	);
}

/**
 * Main Log Diff Page component
 */
export function LogDiffPage() {
	const [mainLogJson, setMainLogJson] = useState('');
	const [attachments, setAttachments] = useState<AttachmentLogInput[]>([
		{ id: 'default', name: 'Attachment 1', json: '', error: null }
	]);
	const [viewMode, setViewMode] = useState<LogDiffViewMode>('merged');
	const [showInput, setShowInput] = useState(true);

	// Parse main log
	const parsedMainLog = useMemo(() => {
		if (!mainLogJson) return { data: null, error: null };
		return parseLogJson(mainLogJson);
	}, [mainLogJson]);

	// Parse attachment logs
	const parsedAttachments: ParsedAttachmentLog[] = useMemo(() => {
		return attachments.map((attachment) => {
			if (!attachment.json) {
				return { id: attachment.id, name: attachment.name, data: null, error: null };
			}
			const result = parseLogJson(attachment.json);
			return {
				id: attachment.id,
				name: attachment.name,
				data: result.data,
				error: result.error
			};
		});
	}, [attachments]);

	// Update attachments with errors
	const attachmentsWithErrors = useMemo(() => {
		return attachments.map((attachment) => {
			const parsed = parsedAttachments.find((p) => p.id === attachment.id);
			return { ...attachment, error: parsed?.error ?? null };
		});
	}, [attachments, parsedAttachments]);

	// Merge logs
	const mergedLog = useMemo(() => {
		if (!parsedMainLog.data) return null;
		return mergeMultipleLogData(parsedMainLog.data, parsedAttachments);
	}, [parsedMainLog.data, parsedAttachments]);

	// Create aligned rows for side-by-side view
	const alignedRows = useMemo(() => {
		if (!parsedMainLog.data) return [];
		return createAlignedRows(parsedMainLog.data, parsedAttachments);
	}, [parsedMainLog.data, parsedAttachments]);

	const handleLoadSampleData = useCallback(() => {
		setMainLogJson(getSampleMainLogJson());
		setAttachments(getSampleAttachmentLogs());
	}, []);

	const hasValidData = parsedMainLog.data !== null;
	const attachmentNames = attachments.map((a) => a.name);

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
						attachments={attachmentsWithErrors}
						onMainLogChange={setMainLogJson}
						onAttachmentsChange={setAttachments}
						onLoadSampleData={handleLoadSampleData}
						mainLogError={parsedMainLog.error}
					/>
				</div>
			)}

			{/* Log View Section */}
			{hasValidData ? (
				<div className="flex-1 min-h-0">
					{viewMode === 'merged' && mergedLog ? (
						<MergedView mergedData={mergedLog} />
					) : viewMode === 'side-by-side' ? (
						<AlignedSideBySideView
							alignedRows={alignedRows}
							attachmentNames={attachmentNames}
						/>
					) : null}
				</div>
			) : (
				<div className="flex items-center justify-center flex-1 text-gray-500">
					<div className="text-center">
						<p className="mb-2">
							Paste JSON log data above or click "Load Sample Data" to see a demo
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
