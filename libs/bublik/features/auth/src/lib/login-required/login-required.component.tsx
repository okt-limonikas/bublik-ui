/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { ReactNode } from 'react';

import { requestLogin, useMeQuery } from '@/services/bublik-api';
import { cn, Tooltip } from '@/shared/tailwind-ui';

interface LoginRequiredProps {
	/** Tooltip shown while signed out, e.g. "Log in to add notes". */
	message: string;
	children: ReactNode;
	className?: string;
}

/**
 * Renders `children` as is for a logged-in user. Otherwise shows them disabled
 * with a tooltip explaining why, and clicking opens the login dialog.
 *
 * While the session is still being checked the action stays enabled: if the
 * request is then rejected the base query asks for login anyway.
 */
function LoginRequired({ message, children, className }: LoginRequiredProps) {
	const { data: user, isLoading } = useMeQuery();

	if (user || isLoading) return children;

	return (
		<Tooltip content={message}>
			<span
				role="button"
				tabIndex={0}
				aria-disabled
				aria-label={message}
				data-testid="login-required"
				className={cn('inline-flex cursor-pointer', className)}
				onClick={() => void requestLogin()}
				onKeyDown={(e) => {
					if (e.key !== 'Enter' && e.key !== ' ') return;
					e.preventDefault();
					void requestLogin();
				}}
			>
				<span
					className="inline-flex pointer-events-none opacity-50"
					// Keep the wrapped action out of focus order and clicks
					{...{ inert: '' }}
				>
					{children}
				</span>
			</span>
		</Tooltip>
	);
}

export { LoginRequired };
export type { LoginRequiredProps };
