/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { ComponentPropsWithRef } from 'react';

import { Icon, cn } from '@/shared/tailwind-ui';

export interface ExpressionToggleButtonProps
	extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
	label: string;
	isOpen: boolean;
}

export const ExpressionToggleButton = ({
	label,
	isOpen,
	className,
	type,
	...props
}: ExpressionToggleButtonProps) => {
	const text = isOpen ? `Hide ${label}` : `Show ${label}`;

	return (
		<button
			{...props}
			type={type ?? 'button'}
			className={cn(
				'inline-flex items-center gap-1.5 self-start text-text-secondary transition-colors hover:text-text-primary',
				className
			)}
			aria-expanded={isOpen}
		>
			<span className="text-[0.75rem] font-medium leading-[1rem]">{text}</span>
			<Icon
				name="ArrowShortTop"
				size={16}
				className={cn('transition-transform', !isOpen && 'rotate-180')}
			/>
		</button>
	);
};
