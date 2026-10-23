/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { useEffect, useId, useState } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { format } from 'date-fns';

import { cn } from '../utils';
import { Icon } from '../icon';
import { Tooltip } from '../tooltip';

const RING_RADIUS = 11;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface ReloadCountdown {
	remainingMs: number;
	/** Share of the interval that has passed, from 0 to 1 */
	progress: number;
}

interface UseReloadCountdownParams {
	enabled: boolean;
	updatedAt?: number;
	intervalMs: number;
}

/**
 * Counts down to the next poll. It restarts from the last fetch, or from the
 * moment auto reload was turned on when that came later.
 */
function useReloadCountdown(params: UseReloadCountdownParams): ReloadCountdown {
	const { enabled, updatedAt, intervalMs } = params;
	const [now, setNow] = useState(() => Date.now());
	const [enabledAt, setEnabledAt] = useState<number>();

	useEffect(() => {
		if (!enabled) {
			setEnabledAt(undefined);
			return;
		}

		const startedAt = Date.now();

		setEnabledAt(startedAt);
		setNow(startedAt);

		const intervalId = window.setInterval(() => setNow(Date.now()), 250);

		return () => window.clearInterval(intervalId);
	}, [enabled]);

	if (!enabled) return { remainingMs: intervalMs, progress: 0 };

	const startedAt = Math.max(updatedAt ?? 0, enabledAt ?? 0);

	if (!startedAt) return { remainingMs: intervalMs, progress: 0 };

	const elapsedMs = Math.max(0, now - startedAt);

	return {
		remainingMs: Math.max(0, intervalMs - elapsedMs),
		progress: Math.min(1, elapsedMs / intervalMs)
	};
}

function formatRemaining(remainingMs: number): string {
	const totalSeconds = Math.ceil(remainingMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;

	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface AutoReloadControlProps {
	/** Whether auto reload is switched on */
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	onRefreshClick: () => void;
	intervalMs: number;
	isFetching: boolean;
	/** When the shown data was last fetched */
	updatedAt?: number;
	/** Accessible name of the switch */
	switchLabel?: string;
	/** Accessible name of the refresh button */
	refreshLabel?: string;
	/** Reason auto reload is unavailable; disables the switch when set */
	unavailableReason?: string;
	className?: string;
}

function AutoReloadControl(props: AutoReloadControlProps) {
	const {
		checked,
		onCheckedChange,
		onRefreshClick,
		intervalMs,
		isFetching,
		updatedAt,
		switchLabel = 'Auto reload',
		refreshLabel = 'Refresh',
		unavailableReason,
		className
	} = props;
	const switchId = useId();
	const isAvailable = !unavailableReason;
	const isEnabled = isAvailable && checked;
	const countdown = useReloadCountdown({
		enabled: isEnabled,
		updatedAt,
		intervalMs
	});

	const status = isFetching
		? 'Reloading…'
		: !isAvailable
		? unavailableReason
		: isEnabled
		? `Next reload in ${formatRemaining(countdown.remainingMs)}`
		: 'Auto reload off';
	const strokeDashoffset =
		RING_CIRCUMFERENCE * (1 - (isEnabled ? countdown.progress : 0));

	return (
		<div
			className={cn(
				'flex items-stretch rounded-lg border border-border-input bg-bg-primary text-text-primary',
				className
			)}
		>
			<Tooltip content={refreshLabel}>
				<button
					type="button"
					aria-label={refreshLabel}
					onClick={onRefreshClick}
					className="group grid shrink-0 place-items-center rounded-l-lg px-1.5 transition-colors hover:bg-primary-wash"
				>
					<span className="relative grid size-7 place-items-center">
						<svg
							className="absolute inset-0 size-7 -rotate-90"
							viewBox="0 0 28 28"
							aria-hidden="true"
						>
							<circle
								cx="14"
								cy="14"
								r={RING_RADIUS}
								fill="none"
								stroke="hsl(var(--colors-border-primary))"
								strokeWidth="2"
							/>
							<circle
								cx="14"
								cy="14"
								r={RING_RADIUS}
								fill="none"
								stroke="currentColor"
								strokeLinecap="round"
								strokeWidth="2"
								strokeDasharray={RING_CIRCUMFERENCE}
								strokeDashoffset={strokeDashoffset}
								className="text-primary transition-[stroke-dashoffset] duration-300 ease-linear"
							/>
						</svg>
						<Icon
							name="Refresh"
							size={16}
							className={cn('text-primary', isFetching && 'animate-spin')}
						/>
					</span>
				</button>
			</Tooltip>
			<div className="flex min-w-[8.75rem] flex-col justify-center border-x border-border-input px-3 tabular-nums">
				<span className="whitespace-nowrap text-[0.75rem] font-semibold leading-4">
					{updatedAt
						? `Updated ${format(updatedAt, 'HH:mm:ss')}`
						: 'Not loaded yet'}
				</span>
				<span className="whitespace-nowrap text-[0.6875rem] leading-[0.875rem] text-text-menu">
					{status}
				</span>
			</div>
			<Tooltip content={unavailableReason ?? ''} disabled={isAvailable}>
				<label
					htmlFor={switchId}
					className={cn(
						'flex items-center gap-2 rounded-r-lg px-3 text-[0.875rem] font-medium leading-[1.5rem] transition-colors select-none',
						isAvailable
							? 'cursor-pointer hover:bg-primary-wash'
							: 'cursor-not-allowed text-text-menu'
					)}
				>
					<SwitchPrimitive.Root
						id={switchId}
						aria-label={switchLabel}
						checked={isEnabled}
						disabled={!isAvailable}
						onCheckedChange={onCheckedChange}
						className={cn(
							'group relative h-4 w-[26px] shrink-0 rounded-full',
							'transition-colors duration-200 ease-in-out',
							'rdx-state-checked:bg-primary rdx-state-unchecked:bg-border-primary',
							'disabled:cursor-not-allowed disabled:opacity-60'
						)}
					>
						<SwitchPrimitive.Thumb
							className={cn(
								'block size-3 rounded-full bg-primary',
								'transition-all translate-x-0.5 will-change-transform',
								'rdx-state-checked:translate-x-3 rdx-state-checked:bg-white'
							)}
						/>
					</SwitchPrimitive.Root>
					Auto
				</label>
			</Tooltip>
		</div>
	);
}

export { AutoReloadControl };
export type { AutoReloadControlProps };
