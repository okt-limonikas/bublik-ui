/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { memo, useMemo } from 'react';

import { cn } from '@/shared/tailwind-ui';

const OK_COLOR = '#65cd84';
const NOK_COLOR = '#f95c78';

type SparklinePoint = {
	/** Whether the run actually had data for this node. */
	present: boolean;
	total: number;
	nok: number;
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

export { Sparkline };
export type { SparklinePoint };
