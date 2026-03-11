/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { ReactNode, useEffect, useRef, useState } from 'react';
import { type LinkProps } from 'react-router-dom';

import {
	Dialog,
	DialogPortal,
	Icon,
	ModalContent,
	Tooltip,
	cn,
	cva,
	useSidebar
} from '@/shared/tailwind-ui';
import { LinkWithProject } from '@/bublik/features/projects';

import { MatchPattern, useAccordionLink, useNavLink } from './nav-link.hooks';

export type SidebarItem = NavLinkProps;

type NavLinkCommon = {
	label: string;
	icon: ReactNode;
	subitems?: AccordionLinkProps[];
	whenMatched?: boolean;
	dialogContent?: ReactNode;
};

export type NavLinkInternal = Pick<LinkProps, 'to'> &
	NavLinkCommon & {
		pattern?: MatchPattern | MatchPattern[];
	};

export type NavLinkExternal = NavLinkCommon & {
	href: string;
};

export type NavLinkProps = NavLinkInternal | NavLinkExternal;
export type AccordionLinkProps = NavLinkInternal | NavLinkExternal;

const menuItemStyles = cva({
	base: [
		'group/nav-item relative flex w-full items-center overflow-hidden rounded-xl border transition-all duration-200 ease-out',
		'focus-within:shadow-[0_0_0_3px_rgba(98,126,251,0.12)]'
	],
	variants: {
		isActive: {
			true: 'border-[rgba(98,126,251,0.18)] bg-primary-wash text-primary shadow-[0_10px_24px_rgba(98,126,251,0.12)]',
			false:
				'border-transparent bg-transparent text-text-secondary hover:border-[rgba(148,163,184,0.14)] hover:bg-primary-wash hover:text-text-primary'
		},
		isSidebarOpen: {
			true: 'min-h-[46px]',
			false: 'min-h-[46px] justify-center'
		},
		isSubmenuOpen: {
			true: 'border-border-primary bg-primary-wash text-text-primary',
			false: ''
		}
	},
	compoundVariants: [
		{
			isActive: false,
			isSubmenuOpen: true,
			className: 'border-border-primary bg-primary-wash text-text-primary'
		}
	]
});

const menuLinkStyles = cva({
	base: [
		'flex min-w-0 flex-1 items-center gap-3 rounded-[inherit] py-3 text-left outline-none transition-colors',
		'focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white'
	],
	variants: {
		isSidebarOpen: {
			true: 'pl-3 pr-2',
			false: 'justify-center px-0'
		}
	}
});

const iconFrameStyles = cva({
	base: 'grid size-10 shrink-0 place-items-center rounded-xl transition-all duration-200',
	variants: {
		isActive: {
			true: 'bg-white text-primary shadow-[0_4px_16px_rgba(98,126,251,0.18)]',
			false: 'text-text-menu group-hover/nav-item:text-primary'
		},
		isSubmenuOpen: {
			true: 'bg-white/90 text-primary',
			false: ''
		}
	},
	compoundVariants: [
		{
			isActive: false,
			isSubmenuOpen: true,
			className: 'bg-white/80 text-primary'
		}
	]
});

const actionButtonStyles =
	'grid size-8 shrink-0 place-items-center rounded-lg text-text-menu transition-all duration-200 hover:bg-white hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20';

const submenuContainerStyles = cva({
	base: 'grid transition-[grid-template-rows,opacity,margin] duration-200 ease-out',
	variants: {
		isOpen: {
			true: 'mt-2 grid-rows-[1fr] opacity-100',
			false: 'mt-0 grid-rows-[0fr] opacity-70'
		}
	}
});

const submenuItemStyles = cva({
	base: [
		'group/sub-item relative flex w-full items-center overflow-hidden rounded-xl border transition-all duration-200 ease-out',
		'focus-within:shadow-[0_0_0_3px_rgba(98,126,251,0.10)]'
	],
	variants: {
		isActive: {
			true: 'border-[rgba(98,126,251,0.16)] bg-white text-primary shadow-[0_8px_18px_rgba(98,126,251,0.08)]',
			false:
				'border-transparent text-text-secondary hover:bg-white hover:text-text-primary'
		}
	}
});

const submenuLinkStyles =
	'flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const submenuIconStyles = cva({
	base: 'grid size-8 shrink-0 place-items-center rounded-lg transition-colors duration-200',
	variants: {
		isActive: {
			true: 'bg-primary-wash text-primary',
			false: 'text-text-menu group-hover/sub-item:text-primary'
		}
	}
});

const submenuLabelStyles =
	'truncate text-[0.875rem] font-medium leading-6 tracking-[-0.01em]';

const isExternalLink = (
	props: NavLinkProps | AccordionLinkProps
): props is NavLinkExternal => {
	return 'href' in props;
};

function FallbackDialog() {
	return (
		<div className="rounded-xl bg-white p-6">
			<h2 className="mb-2 text-lg font-semibold text-text-primary">
				Not Available
			</h2>
			<p className="text-sm text-text-secondary">
				This section is not available yet.
			</p>
		</div>
	);
}

function NavigationDialog({
	content,
	open,
	onOpenChange
}: {
	content?: ReactNode;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPortal>
				<ModalContent>{content || <FallbackDialog />}</ModalContent>
			</DialogPortal>
		</Dialog>
	);
}

function MenuItemLabel({
	label,
	isActive,
	isSidebarOpen
}: {
	label: string;
	isActive: boolean;
	isSidebarOpen: boolean;
}) {
	if (!isSidebarOpen) return null;

	return (
		<div className="min-w-0 flex-1">
			<span
				className={cn(
					'block truncate text-[0.95rem] font-medium tracking-[-0.01em]',
					isActive ? 'text-primary' : 'text-inherit'
				)}
			>
				{label}
			</span>
		</div>
	);
}

export const NavLink = (props: NavLinkProps) => {
	const { label, icon, subitems = [], whenMatched, dialogContent } = props;
	const { isSidebarOpen } = useSidebar();
	const { isActive, to } = useNavLink(
		isExternalLink(props) ? undefined : props
	);
	const hasSubitems = subitems.length > 0;
	const [isOpen, setIsOpen] = useState<boolean | null>(isActive);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const isSubmenuOpen = Boolean(isOpen && hasSubitems);
	const matchedOneTime = useRef(false);

	useEffect(() => {
		if (isActive) {
			setIsOpen(true);
			matchedOneTime.current = true;
		}
	}, [isActive, isSidebarOpen]);

	useEffect(() => {
		if (!isSidebarOpen && !isActive) {
			setIsOpen(false);
		}
	}, [isActive, isSidebarOpen]);

	const shouldShowDialog = whenMatched && !isActive && !matchedOneTime.current;

	const handleClick = (event: React.MouseEvent) => {
		if (shouldShowDialog) {
			event.preventDefault();
			setIsDialogOpen(true);
		}
	};

	const linkContent = (
		<>
			<div
				className={iconFrameStyles({
					isActive,
					isSubmenuOpen
				})}
			>
				{icon}
			</div>
			<MenuItemLabel
				isActive={isActive}
				isSidebarOpen={isSidebarOpen}
				label={label}
			/>
		</>
	);

	const actionLink = isExternalLink(props) ? (
		<a
			href={props.href}
			className={menuLinkStyles({ isSidebarOpen })}
			onClick={handleClick}
			rel="noopener noreferrer"
			target="_blank"
		>
			{linkContent}
		</a>
	) : (
		<LinkWithProject
			aria-current={isActive ? 'page' : undefined}
			className={menuLinkStyles({ isSidebarOpen })}
			onClick={handleClick}
			to={to}
		>
			{linkContent}
		</LinkWithProject>
	);

	return (
		<>
			<div className="flex flex-col">
				<Tooltip
					content={label}
					delayDuration={400}
					disabled={isSidebarOpen}
					side="right"
					sideOffset={14}
				>
					<div
						className={menuItemStyles({
							isActive,
							isSidebarOpen,
							isSubmenuOpen
						})}
					>
						{isActive && isSidebarOpen ? (
							<div className="absolute left-1.5 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-primary" />
						) : null}
						{actionLink}
						{dialogContent && isSidebarOpen ? (
							<button
								aria-label={`Open help for ${label}`}
								className={cn(
									actionButtonStyles,
									'mr-1 opacity-0 group-hover/nav-item:opacity-100 group-focus-within/nav-item:opacity-100'
								)}
								onClick={() => setIsDialogOpen(true)}
								type="button"
							>
								<Icon name="InformationCircleQuestionMark" size={18} />
							</button>
						) : null}
						{hasSubitems && isSidebarOpen ? (
							<button
								aria-expanded={isSubmenuOpen}
								aria-label={`Toggle ${label} submenu`}
								className={cn(
									actionButtonStyles,
									'mr-2',
									isSubmenuOpen ? 'text-primary' : 'text-text-menu'
								)}
								onClick={() => setIsOpen((value) => !value)}
								type="button"
							>
								<Icon
									name="ArrowShortTop"
									className={cn(
										'transition-transform duration-200',
										isSubmenuOpen ? 'rotate-180' : 'rotate-90'
									)}
								/>
							</button>
						) : null}
					</div>
				</Tooltip>

				{hasSubitems && isSidebarOpen ? (
					<div className={submenuContainerStyles({ isOpen: isSubmenuOpen })}>
						<div className="overflow-hidden">
							<ul className="ml-5 flex flex-col gap-1.5 border-l border-border-primary pl-3">
								{subitems.map((item) => (
									<AccordionLink key={item.label} {...item} />
								))}
							</ul>
						</div>
					</div>
				) : null}
			</div>

			<NavigationDialog
				content={dialogContent}
				onOpenChange={setIsDialogOpen}
				open={isDialogOpen}
			/>
		</>
	);
};

const AccordionLink = (props: AccordionLinkProps) => {
	const { label, icon, whenMatched, dialogContent } = props;
	const { isSidebarOpen } = useSidebar();
	const { to, isActive, isPathMatch } = useAccordionLink(
		isExternalLink(props) ? undefined : props
	);
	const matchedOneTime = useRef(false);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	useEffect(() => {
		if (isActive) matchedOneTime.current = true;
	}, [isActive, isSidebarOpen]);

	const shouldShowDialog =
		whenMatched && !isActive && !matchedOneTime.current && !isPathMatch;

	const handleClick = (event: React.MouseEvent) => {
		if (shouldShowDialog) {
			event.preventDefault();
			setIsDialogOpen(true);
		}
	};

	const content = (
		<>
			<div className={submenuIconStyles({ isActive })}>{icon}</div>
			<span
				className={cn(
					submenuLabelStyles,
					isActive ? 'text-primary' : 'text-inherit'
				)}
			>
				{label}
			</span>
		</>
	);

	const itemLink = isExternalLink(props) ? (
		<a
			href={props.href}
			className={submenuLinkStyles}
			onClick={handleClick}
			rel="noopener noreferrer"
			target="_blank"
		>
			{content}
		</a>
	) : (
		<LinkWithProject
			aria-current={isActive ? 'page' : undefined}
			className={submenuLinkStyles}
			onClick={handleClick}
			to={to}
		>
			{content}
		</LinkWithProject>
	);

	return (
		<>
			<li>
				<div className={submenuItemStyles({ isActive })}>
					{isActive ? (
						<div className="absolute left-1.5 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary" />
					) : null}
					{itemLink}
					{dialogContent ? (
						<button
							aria-label={`Open help for ${label}`}
							className={cn(
								actionButtonStyles,
								'mr-1.5 opacity-0 group-hover/sub-item:opacity-100 group-focus-within/sub-item:opacity-100'
							)}
							onClick={() => setIsDialogOpen(true)}
							type="button"
						>
							<Icon name="InformationCircleQuestionMark" size={16} />
						</button>
					) : null}
				</div>
			</li>

			<NavigationDialog
				content={dialogContent}
				onOpenChange={setIsDialogOpen}
				open={isDialogOpen}
			/>
		</>
	);
};

export { isExternalLink };
