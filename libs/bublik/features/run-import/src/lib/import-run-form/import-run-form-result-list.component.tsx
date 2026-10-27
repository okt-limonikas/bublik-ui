/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { format } from 'date-fns';
import { RocketIcon } from '@radix-ui/react-icons';

import { ImportRunsJobResponse } from '@/shared/types';
import { ButtonTw, Icon } from '@/shared/tailwind-ui';

import { useImportLog } from '../import-events-table';
import { StatusBadge } from '../import-events-table/import-event-table.component';

interface RunImportResultProps {
	results: ImportRunsJobResponse[];
	timestamp?: Date;
}

function RunImportResult({
	results,
	timestamp = new Date()
}: RunImportResultProps) {
	const { toggle } = useImportLog();

	const allTasks = results.flatMap((job) =>
		job.job_tasks_data.map((task) => ({
			...task,
			jobId: job.job_id
		}))
	);

	return (
		<div>
			<h3 className="text-[0.8125rem] font-semibold text-text-secondary mb-2.5">
				Imports{' '}
				<span className="font-normal text-text-menu">
					· each one&apos;s log and Celery task
				</span>
			</h3>
			<ul className="border rounded-md [&>*:not(:last-child)]:border-b [&>*]:border-border-primary">
				{allTasks.map((task, i) => {
					const url = task.run_source_url ? new URL(task.run_source_url) : null;
					const cleanUrl = url ? url.origin + url.pathname : '';
					const hasTask = Boolean(task.celery_task_id);

					return (
						<li
							key={i}
							className="space-y-2 p-4"
							data-testid="import-result-task"
							data-job-id={task.jobId}
							data-run-source-url={task.run_source_url ?? ''}
						>
							<div className="flex items-center justify-between gap-2">
								<div className="flex items-center gap-2">
									<StatusBadge status={hasTask ? 'SUCCESS' : 'FAILURE'} />
									<div className="flex items-center gap-2 text-xs text-gray-500">
										<span>Job #{task.jobId}</span>
									</div>
								</div>
								<span className="text-xs text-gray-500">
									{format(
										new Date(
											timestamp.getTime() -
												timestamp.getTimezoneOffset() * 60000
										),
										'hh:mm a'
									)}
								</span>
							</div>
							{cleanUrl ? (
								<a
									href={cleanUrl}
									target="_blank"
									className="rounded-md bg-primary-wash p-2 text-sm font-mono block hover:underline"
									rel="noreferrer"
								>
									{cleanUrl}
								</a>
							) : null}
							<div className="flex gap-2">
								<ButtonTw
									variant="outline-secondary"
									onClick={
										task.celery_task_id
											? toggle(task.celery_task_id, true)
											: undefined
									}
									className="flex-1"
								>
									<Icon name="Paper" size={20} className="mr-1.5" />
									<span>Log</span>
								</ButtonTw>
								<ButtonTw
									variant="outline-secondary"
									className="flex-1"
									asChild
								>
									<a
										href={task.flower ?? undefined}
										target="_blank"
										rel="noreferrer"
									>
										<RocketIcon className="size-4 mr-1.5" />
										<span>Task</span>
									</a>
								</ButtonTw>
							</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
}

export { RunImportResult, type RunImportResultProps };
