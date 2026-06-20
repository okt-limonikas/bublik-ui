/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { memo, useMemo, useState } from 'react';

import { LinkWithProject } from '@/bublik/features/projects';
import { routes } from '@/router';
import { Icon, cn } from '@/shared/tailwind-ui';

const OK_COLOR = '#65cd84';
const NOK_COLOR = '#f95c78';

type SparklinePoint = {
	/** Whether the run actually had data for this node. */
	present: boolean;
	total: number;
	nok: number;
	/** Unexpected (all) and abnormal split out for the enlarged hover chart. */
	unexpected: number;
	abnormal: number;
	runId: number;
	/** node.result_id for the "open in run" link; null when the run lacks this node. */
	resultId: number | null;
	/** Run start timestamp, shown in the hover label. */
	runStart: string;
};

interface SparklineProps {
	/** Points ordered oldest -> newest (left -> right). */
	points: SparklinePoint[];
	width?: number;
	height?: number;
	className?: string;
}

/**
 * Tiny dependency-free SVG trend chart sized for a virtualized table cell.
 * Plots the node total as a line and overlays unexpected/abnormal (NOK) as a
 * filled area, so a row's health trend across runs reads at a glance without the
 * cost of a full charting library per cell.
 */
function SparklineImpl(props: SparklineProps) {
	const { points, width = 72, height = 22, className } = props;

	const geometry = useMemo(() => {
		const present = points.filter((point) => point.present);

		if (present.length === 0) return null;

		const maxTotal = Math.max(1, ...points.map((point) => point.total));
		const stepX =
			points.length > 1 ? width / (points.length - 1) : 0;

		function toX(index: number): number {
			return points.length > 1 ? index * stepX : width / 2;
		}

		function toY(value: number): number {
			const ratio = value / maxTotal;

			return height - ratio * (height - 2) - 1;
		}

		const coords = points.map((point, index) => ({
			x: toX(index),
			totalY: toY(point.total),
			nokY: toY(point.nok),
			present: point.present,
			nok: point.nok
		}));

		const totalLine = coords
			.map((coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x} ${coord.totalY}`)
			.join(' ');

		const nokArea =
			`M ${coords[0].x} ${height} ` +
			coords.map((coord) => `L ${coord.x} ${coord.nokY}`).join(' ') +
			` L ${coords[coords.length - 1].x} ${height} Z`;

		// Index 0 is the newest run (leftmost); mark it so the eye lands on the
		// latest result first.
		const latest = coords[0];

		return { coords, totalLine, nokArea, latest };
	}, [points, width, height]);

	if (!geometry) {
		return (
			<span className={cn('text-[0.625rem] text-text-secondary', className)}>
				—
			</span>
		);
	}

	const { totalLine, nokArea, latest } = geometry;

	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			className={cn('overflow-visible', className)}
			role="img"
			aria-label="Result trend across runs"
		>
			<path d={nokArea} fill={NOK_COLOR} fillOpacity={0.18} stroke="none" />
			<path
				d={totalLine}
				fill="none"
				stroke={OK_COLOR}
				strokeWidth={1.5}
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
			<circle
				cx={latest.x}
				cy={latest.totalY}
				r={1.75}
				fill={latest.nok > 0 ? NOK_COLOR : OK_COLOR}
			/>
		</svg>
	);
}

const Sparkline = memo(SparklineImpl);

function formatRunDate(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) return value;

	return date.toLocaleString();
}

interface SparklineHoverChartProps {
	points: SparklinePoint[];
	/** Jump the matrix to the clicked point's run (index aligns with the run columns). */
	onPointClick: (index: number) => void;
}

const CHART_WIDTH = 360;
const CHART_HEIGHT = 132;
const CHART_PAD_X = 10;
const CHART_PAD_Y = 10;

/**
 * Enlarged, interactive version of the row sparkline, shown inside a hover card.
 * Hovering a run shows its total/unexpected/abnormal counts; clicking jumps the
 * matrix to that run's cell, and the header carries an "open in run" link so the
 * test can be opened directly at a spike.
 */
function SparklineHoverChart({ points, onPointClick }: SparklineHoverChartProps) {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

	const plotWidth = CHART_WIDTH - CHART_PAD_X * 2;
	const plotHeight = CHART_HEIGHT - CHART_PAD_Y * 2;

	const geometry = useMemo(() => {
		if (points.every((point) => !point.present)) return null;

		const maxTotal = Math.max(1, ...points.map((point) => point.total));
		const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;

		function toX(index: number): number {
			return CHART_PAD_X + (points.length > 1 ? index * stepX : plotWidth / 2);
		}

		function toY(value: number): number {
			return CHART_PAD_Y + plotHeight - (value / maxTotal) * plotHeight;
		}

		const coords = points.map((point, index) => ({
			x: toX(index),
			totalY: toY(point.total),
			nokY: toY(point.nok)
		}));

		const totalLine = coords
			.map((coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x} ${coord.totalY}`)
			.join(' ');

		const baseline = CHART_PAD_Y + plotHeight;
		const nokArea =
			`M ${coords[0].x} ${baseline} ` +
			coords.map((coord) => `L ${coord.x} ${coord.nokY}`).join(' ') +
			` L ${coords[coords.length - 1].x} ${baseline} Z`;

		const bandWidth = plotWidth / Math.max(1, points.length);

		return { coords, totalLine, nokArea, bandWidth };
	}, [points, plotWidth, plotHeight]);

	const active = hoveredIndex !== null ? points[hoveredIndex] : null;
	const activeCoord =
		geometry && hoveredIndex !== null ? geometry.coords[hoveredIndex] : null;

	return (
		<div className="w-[360px] rounded-md border border-border-primary bg-white p-2 shadow-popover">
			<div className="mb-1.5 flex min-h-[2.25rem] items-start justify-between gap-2 text-[0.6875rem] leading-tight">
				{active ? (
					<>
						<div className="flex min-w-0 flex-col">
							<span className="font-semibold text-text-primary">
								#{active.runId} · {formatRunDate(active.runStart)}
							</span>
							<span className="text-text-secondary">
								total {active.total} ·{' '}
								<span className="text-text-unexpected">
									unexpected {active.unexpected}
								</span>{' '}
								· abnormal {active.abnormal}
							</span>
						</div>
						{active.resultId !== null ? (
							<LinkWithProject
								to={routes.run({
									runId: active.runId,
									targetIterationId: active.resultId
								})}
								className="inline-flex shrink-0 items-center gap-1 rounded bg-primary-wash px-1.5 py-1 font-medium text-primary hover:bg-primary hover:text-white"
							>
								<Icon name="BoxArrowRight" size={12} />
								Open
							</LinkWithProject>
						) : null}
					</>
				) : (
					<span className="text-text-secondary">
						Hover a run for its counts · click to jump to that cell
					</span>
				)}
			</div>
			{geometry ? (
				<svg
					width={CHART_WIDTH}
					height={CHART_HEIGHT}
					viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
					className="overflow-visible"
					onMouseLeave={() => setHoveredIndex(null)}
				>
					<path
						d={geometry.nokArea}
						fill={NOK_COLOR}
						fillOpacity={0.18}
						stroke="none"
					/>
					<path
						d={geometry.totalLine}
						fill="none"
						stroke={OK_COLOR}
						strokeWidth={1.5}
						strokeLinejoin="round"
						strokeLinecap="round"
					/>
					{activeCoord ? (
						<>
							<line
								x1={activeCoord.x}
								y1={CHART_PAD_Y}
								x2={activeCoord.x}
								y2={CHART_PAD_Y + plotHeight}
								stroke="currentColor"
								className="text-border-primary"
								strokeWidth={1}
							/>
							<circle cx={activeCoord.x} cy={activeCoord.nokY} r={2.5} fill={NOK_COLOR} />
							<circle cx={activeCoord.x} cy={activeCoord.totalY} r={2.5} fill={OK_COLOR} />
						</>
					) : null}
					{points.map((point, index) => (
						<rect
							key={point.runId}
							x={geometry.coords[index].x - geometry.bandWidth / 2}
							y={0}
							width={geometry.bandWidth}
							height={CHART_HEIGHT}
							fill="transparent"
							className="cursor-pointer"
							onMouseEnter={() => setHoveredIndex(index)}
							onClick={() => onPointClick(index)}
						/>
					))}
				</svg>
			) : (
				<div className="grid h-[132px] place-items-center text-xs text-text-secondary">
					No trend data
				</div>
			)}
		</div>
	);
}

export { Sparkline, SparklineHoverChart };
export type { SparklinePoint };
