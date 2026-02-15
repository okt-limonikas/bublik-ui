/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { ComponentPropsWithRef, forwardRef } from 'react';

export interface FormSectionHeaderProps extends ComponentPropsWithRef<'div'> {
	name: string;
	error?: string;
}

export const FormSectionHeader = forwardRef<
	HTMLDivElement,
	FormSectionHeaderProps
>(({ name, error, children, ...props }, ref) => {
	return (
		<div className="absolute inset-x-2 top-0 z-10" {...props}>
			<div
				className="flex -translate-y-1/2 items-center justify-between gap-2"
				ref={ref}
			>
				<legend className="truncate ml-[18px] bg-white text-[0.875rem] font-semibold leading-5 tracking-[0.02em] text-text-primary">
					{name}
				</legend>
				{children ? (
					<div className="flex shrink-0 items-center bg-white pr-3 gap-1">
						{children}
					</div>
				) : null}
			</div>
			{error && (
				<span className="inline-flex pt-1 pl-2 text-[0.75rem] font-medium leading-[1rem] text-text-unexpected">
					{error}
				</span>
			)}
		</div>
	);
});

FormSectionHeader.displayName = 'FormSectionHeader';
