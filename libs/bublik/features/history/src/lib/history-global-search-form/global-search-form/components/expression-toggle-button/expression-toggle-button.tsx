/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { MouseEventHandler } from 'react';

import { cn } from '@/shared/tailwind-ui';

import { IconButton } from '../icon-button';

export interface ExpressionToggleButtonProps {
	label: string;
	isOpen: boolean;
	onClick: MouseEventHandler<HTMLButtonElement>;
	className?: string;
}

export const ExpressionToggleButton = ({
	label,
	isOpen,
	onClick,
	className
}: ExpressionToggleButtonProps) => {
	const helpMessage = isOpen ? `Hide ${label}` : `Show ${label}`;

	return (
		<IconButton
			name="ArrowShortTop"
			size={16}
			helpMessage={helpMessage}
			onClick={onClick}
			className={cn('transition-transform', !isOpen && 'rotate-180', className)}
		/>
	);
};
