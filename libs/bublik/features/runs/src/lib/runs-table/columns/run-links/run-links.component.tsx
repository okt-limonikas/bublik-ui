/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { ButtonTw, Icon } from '@/shared/tailwind-ui';
import { LinkWithProject } from '@/bublik/features/projects';
import { useDefaultLogMode } from '@/bublik/features/user-preferences';

export interface RunLinksProps {
	runId: number;
}

export const RunLinks = ({ runId }: RunLinksProps) => {
	const logMode = useDefaultLogMode('runs');

	return (
		<div className="flex flex-col items-start justify-center gap-1">
			<ButtonTw asChild variant="secondary" size="xss">
				<LinkWithProject
					data-testid="run-log-link"
					to="/log/$runId"
					params={{ runId }}
					search={{ mode: logMode }}
				>
					<Icon name="BoxArrowRight" className="mr-1.5" />
					Log
				</LinkWithProject>
			</ButtonTw>
			<ButtonTw asChild variant="secondary" size="xss">
				<LinkWithProject
					data-testid="run-details-link"
					to="/runs/$runId"
					params={{ runId }}
				>
					<Icon name="BoxArrowRight" className="mr-1.5" />
					Run
				</LinkWithProject>
			</ButtonTw>
		</div>
	);
};
