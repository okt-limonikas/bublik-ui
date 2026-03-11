/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

import { cn } from '../utils';
import { Icon } from '../icon';

const Breadcrumb = React.forwardRef<
	HTMLElement,
	React.ComponentPropsWithoutRef<'nav'>
>(({ className, 'aria-label': ariaLabel = 'Breadcrumb', ...props }, ref) => (
	<nav aria-label={ariaLabel} className={cn(className)} ref={ref} {...props} />
));
Breadcrumb.displayName = 'Breadcrumb';

const BreadcrumbList = React.forwardRef<
	HTMLOListElement,
	React.ComponentPropsWithoutRef<'ol'>
>(({ className, ...props }, ref) => (
	<ol
		className={cn(
			'flex flex-wrap items-center gap-1.5 text-sm text-text-menu sm:gap-2.5',
			className
		)}
		ref={ref}
		{...props}
	/>
));
BreadcrumbList.displayName = 'BreadcrumbList';

const BreadcrumbItem = React.forwardRef<
	HTMLLIElement,
	React.ComponentPropsWithoutRef<'li'>
>(({ className, ...props }, ref) => (
	<li
		className={cn('inline-flex items-center gap-1.5 sm:gap-2.5', className)}
		ref={ref}
		{...props}
	/>
));
BreadcrumbItem.displayName = 'BreadcrumbItem';

const BreadcrumbLink = React.forwardRef<
	HTMLAnchorElement,
	React.ComponentPropsWithoutRef<'a'> & {
		asChild?: boolean;
	}
>(({ asChild = false, className, ...props }, ref) => {
	const Component = asChild ? Slot : 'a';

	return (
		<Component
			className={cn(
				'rounded-md px-1 py-0.5 transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
				className
			)}
			ref={ref}
			{...props}
		/>
	);
});
BreadcrumbLink.displayName = 'BreadcrumbLink';

const BreadcrumbPage = React.forwardRef<
	HTMLSpanElement,
	React.ComponentPropsWithoutRef<'span'>
>(({ className, ...props }, ref) => (
	<span
		aria-current="page"
		className={cn(
			'max-w-[18rem] truncate rounded-md px-1 py-0.5 font-medium text-text-primary',
			className
		)}
		ref={ref}
		{...props}
	/>
));
BreadcrumbPage.displayName = 'BreadcrumbPage';

const BreadcrumbSeparator = ({
	children,
	className,
	...props
}: React.ComponentPropsWithoutRef<'li'>) => (
	<li
		aria-hidden="true"
		className={cn('text-text-menu/70', className)}
		role="presentation"
		{...props}
	>
		{children ?? <Icon className="h-4 w-4 rotate-90" name="ArrowShortTop" />}
	</li>
);
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

const BreadcrumbEllipsis = ({
	className,
	...props
}: React.ComponentPropsWithoutRef<'span'>) => (
	<span
		aria-hidden="true"
		className={cn('flex h-9 w-9 items-center justify-center', className)}
		role="presentation"
		{...props}
	>
		<span className="text-base leading-none">...</span>
		<span className="sr-only">More</span>
	</span>
);
BreadcrumbEllipsis.displayName = 'BreadcrumbElipsis';

export {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator
};
