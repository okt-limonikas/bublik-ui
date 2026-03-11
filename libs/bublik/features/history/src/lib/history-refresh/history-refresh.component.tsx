/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { FC } from 'react';
import { motion, useAnimation } from 'framer-motion';

import { ButtonTw, Icon } from '@/shared/tailwind-ui';

interface RefreshButtonProps {
	onRefreshClick?: () => void;
	hasPendingChanges?: boolean;
}

export const HistoryRefresh: FC<RefreshButtonProps> = ({
	onRefreshClick,
	hasPendingChanges = false
}) => {
	const controls = useAnimation();

	const handleClick = async () => {
		onRefreshClick?.();

		await controls.start({
			rotate: [0, 360],
			transition: {
				duration: 0.4,
				stiffness: 500,
				damping: 90,
				type: 'spring'
			}
		});
	};

	return (
		<ButtonTw
			variant={hasPendingChanges ? 'primary' : 'outline'}
			size="md"
			rounded="lg"
			onClick={handleClick}
		>
			<motion.div animate={controls} className="mr-2">
				<Icon name="Refresh" />
			</motion.div>
			Submit
		</ButtonTw>
	);
};
