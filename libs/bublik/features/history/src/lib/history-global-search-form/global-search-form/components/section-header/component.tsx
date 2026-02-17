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
		<div className="mb-4" {...props}>
			<div className="flex items-center justify-between gap-2 pl-2" ref={ref}>
				<span className="truncate text-[0.8125rem] font-semibold uppercase leading-5 tracking-[0.06em] text-text-secondary">
					{name}
				</span>
				{children ? (
					<div className="flex shrink-0 items-center gap-1 pr-[5px]">
						{children}
					</div>
				) : null}
			</div>
			{error && (
				<span className="inline-flex pt-1 text-[0.75rem] font-medium leading-[1rem] text-text-unexpected">
					{error}
				</span>
			)}
		</div>
	);
});

FormSectionHeader.displayName = 'FormSectionHeader';
