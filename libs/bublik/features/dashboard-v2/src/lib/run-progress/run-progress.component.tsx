/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { Skeleton } from '@/shared/tailwind-ui';

import { getStatusAndBasis } from './run-progress.utils';

export interface RunProgressProps {
	data?: boolean[];
	isError: boolean;
	isLoading: boolean;
}

export const RunProgress = (props: RunProgressProps) => {
	const { data, isLoading, isError } = props;

	if (isError) {
		return (
			<div className="flex items-center justify-center">
				<span className="leading-[1.5rem] text-[0.875rem]">
					Something went wrong...
				</span>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="relative flex items-center justify-center gap-1">
				<Skeleton className="basis-full relative rounded-[10px] opacity-70 h-2 overflow-hidden" />
			</div>
		);
	}

	if (data) {
		return (
			<ul className="relative flex items-center justify-center gap-1 flex-wrap">
				{getStatusAndBasis(data).map(({ status, basis }, idx) => (
					<li
						key={idx}
						className={`relative rounded-[10px] h-2 overflow-hidden opacity-70 ${
							status === 'ok' ? 'bg-bg-ok' : 'bg-bg-error'
						}`}
						style={{ flexBasis: `${basis}%` }}
					/>
				))}
			</ul>
		);
	}

	return null;
};
