/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { analyticsEventNames, trackEvent } from '@/bublik/features/analytics';
import { ButtonTw, Icon } from '@/shared/tailwind-ui';
import { LinkWithProject } from '@/bublik/features/projects';
import { useDefaultLogMode } from '@/bublik/features/user-preferences';

import { useLinkTarget } from '../../link-target';

export interface LinkToLogProps {
	runId: string;
	resultId: string;
}

export const LinkToLog = ({ runId, resultId }: LinkToLogProps) => {
	const logMode = useDefaultLogMode();
	// `routes.log({ runId, focusId, mode })`: the result focused, in the
	// user's default log layout.
	const to = useLinkTarget({
		to: '/log/$runId',
		params: { runId },
		search: { focusId: Number(resultId), mode: logMode }
	});

	return (
		<ButtonTw asChild variant="secondary" size="xss">
			<LinkWithProject
				to={to}
				onClick={() => {
					trackEvent(analyticsEventNames.measurementsLinkToLogClick, {
						source: 'measurements_header'
					});
				}}
			>
				<Icon name="BoxArrowRight" className="mr-1.5" />
				Log
			</LinkWithProject>
		</ButtonTw>
	);
};
