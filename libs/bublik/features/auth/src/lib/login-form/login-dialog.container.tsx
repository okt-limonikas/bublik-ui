/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { useRef, useSyncExternalStore } from 'react';
import { useDispatch } from 'react-redux';
import { AnyAction } from '@reduxjs/toolkit';

import { LoginFormInputs } from '@/shared/types';
import {
	bublikAPI,
	isLoginPromptOpen,
	resolveLogin,
	subscribeLoginPrompt,
	useLoginMutation
} from '@/services/bublik-api';
import { setErrorsOnForm } from '@/shared/utils';
import {
	cn,
	Dialog,
	DialogContent,
	DialogDescription,
	dialogContentStyles,
	DialogOverlay,
	dialogOverlayStyles,
	DialogPortal,
	DialogTitle,
	toast
} from '@/shared/tailwind-ui';

import { LoginForm, LoginFormHandle } from './login-form.component';

/**
 * Asks for credentials when a request was rejected as "Not Authenticated".
 * On success the rejected requests are retried by the base query, so the user
 * stays on the page they were on.
 */
export function LoginDialogContainer() {
	const open = useSyncExternalStore(subscribeLoginPrompt, isLoginPromptOpen);
	const dispatch = useDispatch();
	const [login] = useLoginMutation();
	const formRef = useRef<LoginFormHandle>(null);

	const handleSubmit = async (form: LoginFormInputs) => {
		if (!formRef.current) return;
		const formHandle = formRef.current;

		try {
			const { user } = await login(form).unwrap();

			dispatch(
				bublikAPI.util.upsertQueryData('me', undefined, {
					...user
				}) as unknown as AnyAction
			);

			resolveLogin(true);
		} catch (e: unknown) {
			toast.error('Failed to login!');
			setErrorsOnForm(e, { handle: formHandle });
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) resolveLogin(false);
			}}
		>
			<DialogPortal>
				<DialogOverlay className={dialogOverlayStyles()} />
				<DialogContent
					data-testid="login-dialog"
					className={cn(
						'w-[92vw] max-w-[420px] z-50 bg-white rounded-xl p-8 shadow-2xl',
						dialogContentStyles()
					)}
				>
					<DialogTitle className="text-xl font-semibold text-text-primary">
						Sign in to continue
					</DialogTitle>
					<DialogDescription className="mt-1 mb-6 text-sm text-text-menu">
						Your session has expired or you are not logged in.
					</DialogDescription>
					<LoginForm
						ref={formRef}
						bare
						onSubmit={handleSubmit}
						onForgotPasswordClick={() => resolveLogin(false)}
					/>
				</DialogContent>
			</DialogPortal>
		</Dialog>
	);
}
