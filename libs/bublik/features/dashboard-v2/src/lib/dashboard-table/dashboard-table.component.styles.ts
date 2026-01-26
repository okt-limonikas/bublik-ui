/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { cva } from '@/shared/tailwind-ui';

export const gridContainerStyles = cva({
	base: 'grid w-full'
});

export const headerCellStyles = cva({
	base: 'text-[0.6875rem] font-semibold text-left truncate min-w-0 h-8.5 bg-white'
});

export const bodyCellStyles = cva({
	base: 'text-[0.75rem] font-medium leading-[1.125rem] truncate min-w-0 h-8.5 px-2 border border-transparent hover:border-primary transition-colors rounded-md bg-white'
});

export const bodyCellErrorStyles = cva({
	base: 'text-[0.75rem] font-medium leading-[1.125rem] truncate min-w-0 h-8.5 px-2 border border-transparent hover:border-primary transition-colors rounded-md bg-bg-fillError'
});

export const bodyRowStyles = cva({
	base: 'contents',
	variants: {
		isExpanded: { true: '', false: '' }
	}
});

export const bodyRowWrapperStyles = cva({
	base: 'contents',
	variants: { isExpanded: { true: '' } }
});
