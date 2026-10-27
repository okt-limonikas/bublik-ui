/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarDate, getLocalTimeZone } from '@internationalized/date';

import {
	ButtonTw,
	cn,
	Icon,
	Popover,
	PopoverContent,
	PopoverTrigger,
	RangeCalendar
} from '@/shared/tailwind-ui';

export type DateRangeValue = { startDate: Date; endDate: Date } | null;

interface RangeChipProps {
	value: DateRangeValue;
	onChange: (value: DateRangeValue) => void;
	/** Names the button for screen readers, e.g. "Dates of row 2" */
	label: string;
}

const toCalendarDate = (date: Date) =>
	new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());

function formatRange({ startDate, endDate }: NonNullable<DateRangeValue>) {
	const sameYear = startDate.getFullYear() === endDate.getFullYear();
	return `${format(startDate, sameYear ? 'MMM dd' : 'MMM dd, yyyy')} – ${format(
		endDate,
		'MMM dd, yyyy'
	)}`;
}

/** A row's date range, as a button that opens a calendar */
function RangeChip({ value, onChange, label }: RangeChipProps) {
	const [open, setOpen] = useState(false);
	const text = value ? formatRange(value) : 'Any date';

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-label={`${label}: ${text}`}
					className={cn(
						'flex items-center gap-2 w-full h-10 px-3 rounded border text-[0.8125rem] text-left transition-colors',
						'focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-text-field',
						value
							? 'border-primary/40 bg-primary-wash text-primary'
							: 'border-border-input bg-bg-primary text-text-menu hover:border-primary'
					)}
				>
					<Icon name="Calendar" size={16} className="shrink-0" />
					<span className="truncate">{text}</span>
				</button>
			</PopoverTrigger>
			<PopoverContent
				portal
				align="end"
				sideOffset={8}
				className="z-[60] flex flex-col gap-4 p-4 rounded-lg bg-bg-elevated shadow-popover"
			>
				<RangeCalendar
					aria-label="Run dates"
					mode="default"
					value={
						value
							? {
									start: toCalendarDate(value.startDate),
									end: toCalendarDate(value.endDate)
							  }
							: null
					}
					onChange={(range) => {
						onChange({
							startDate: range.start.toDate(getLocalTimeZone()),
							endDate: range.end.toDate(getLocalTimeZone())
						});
						setOpen(false);
					}}
				/>
				<div className="flex items-center justify-between gap-4 pt-3 border-t border-border-primary">
					<span className="text-xs text-text-menu">
						For a folder of many runs: only those started in this period
					</span>
					<ButtonTw
						type="button"
						size="xs"
						variant="secondary"
						onClick={() => {
							onChange(null);
							setOpen(false);
						}}
					>
						Any date
					</ButtonTw>
				</div>
			</PopoverContent>
		</Popover>
	);
}

export { RangeChip };
