/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { forwardRef } from 'react';
import {
	Dialog,
	DialogContent,
	DialogOverlay,
	DialogPortal,
	DialogTrigger,
	dialogOverlayStyles
} from '../dialog';
import {
	DialogContentProps,
	DialogProps,
	DialogTriggerProps
} from '@radix-ui/react-dialog';
import { cn } from '../utils';

export const DrawerRoot = (props: DialogProps) => {
	return <Dialog {...props} />;
};

export const DrawerTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>(
	(props, ref) => {
		return <DialogTrigger {...props} ref={ref} />;
	}
);

/**
 * Rendered in a portal so the overlay and the panel sit above everything,
 * including ancestors that open their own stacking context (`isolate`,
 * `z-*` on sticky headers) and the app sidebar.
 */
export const DrawerContent = forwardRef<HTMLDivElement, DialogContentProps>(
	({ className, children, ...props }, ref) => {
		return (
			<DialogPortal>
				<DialogOverlay className={dialogOverlayStyles()} />
				<DialogContent
					{...props}
					className={cn(
						'fixed top-0 right-0 z-50 h-screen h-svh bg-white rdx-state-open:animate-drawer-slide-in-right rdx-state-closed:animate-drawer-slide-out-right',
						className
					)}
					ref={ref}
				>
					{children}
				</DialogContent>
			</DialogPortal>
		);
	}
);
