/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { config } from '@/bublik/config';
import { ImportEventResponse } from '@/shared/types';
import {
	ButtonTw,
	DialogDescription,
	DialogTitle,
	Icon
} from '@/shared/tailwind-ui';

import { statusBadgeStyles } from '../import-events-table/import-event-table.columns';
import { useImportLog } from '../import-events-table';
import { format } from 'date-fns';
import { RocketIcon } from '@radix-ui/react-icons';

function StatusIcon({ status }: { status: 'success' | 'fail' }) {
	switch (status) {
		case 'success':
			return (
				<Icon
					name="InformationCircleCheckmark"
					className="h-4 w-4 text-text-expected mr-1"
				/>
			);
		case 'fail':
			return (
				<Icon
					name="InformationCircleCrossMark"
					className="h-4 w-4 text-text-unexpected mr-1"
				/>
			);
	}
}

const StatusBadge = ({ status }: { status: 'success' | 'fail' }) => {
	return (
		<span
			className={statusBadgeStyles({
				expected: status === 'success',
				unexpected: status === 'fail'
			})}
		>
			<StatusIcon status={status} />
			{status === 'success' ? 'STARTED' : 'FAILED'}
		</span>
	);
};

interface RunImportResultProps {
	results: ImportEventResponse[];
}

function RunImportResult(props: RunImportResultProps) {
	const { toggle } = useImportLog();

	return (
		<div>
			<DialogTitle className="text-lg font-semibold leading-none tracking-tight">
				Import Runs
			</DialogTitle>

			<DialogDescription className="mt-1.5 text-base text-gray-500">
				Scheduled runs will be imported in the background
			</DialogDescription>
			<p className="mt-1.5 mb-6 text-sm text-gray-500">
				You can check the logs and flower tasks
			</p>
			<h3 className="text-sm font-medium text-text-primary mb-2">Imports</h3>
			<ul className="border rounded-md [&>*:not(:last-child)]:border-b [&>*]:border-border-primary">
				{props.results.map((result, i) => (
					<li key={i} className="space-y-2 p-4">
						<div className="flex items-center justify-between gap-2">
							<StatusBadge status={result.taskId ? 'success' : 'fail'} />
							<span className="text-xs text-gray-500">
								{format(new Date(), 'hh:mm a')}
							</span>
						</div>
						<a
							href={result.url ?? undefined}
							target="_blank"
							className="rounded-md bg-primary-wash p-2 text-sm font-mono block hover:underline"
							rel="noreferrer"
						>
							{result.url}
						</a>
						<div className="flex gap-2">
							<ButtonTw
								variant="outline-secondary"
								onClick={
									result.taskId ? toggle(result.taskId, true) : undefined
								}
								className="flex-1"
							>
								<Icon name="Paper" size={20} className="mr-1.5" />
								<span>Log</span>
							</ButtonTw>
							<ButtonTw variant="outline-secondary" className="flex-1" asChild>
								<a
									href={`${config.oldBaseUrl}/flower/task/${result.taskId}`}
									target="_blank"
									rel="noreferrer"
								>
									<RocketIcon className="size-4 mr-1.5" />
									<span>Task</span>
								</a>
							</ButtonTw>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}

export { RunImportResult, type RunImportResultProps };
