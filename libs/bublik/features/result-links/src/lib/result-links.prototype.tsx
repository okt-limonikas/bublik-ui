/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */

/**
 * PROTOTYPE — throwaway, do not merge.
 *
 * Question: a result can carry several issues. How should the Actions column
 * let you jump to history of results that carry the same issue?
 *
 * Variants on the existing run page, switchable via `?variant=`:
 *   current — the column as it is today (baseline)
 *   A       — submenu per issue inside the existing History split button
 *   B       — a separate "Issues" action: issue list beside its history links
 *
 * The issue scope is the history page's existing `?issue=<id>` filter laid on
 * top of the links the History button already builds.
 */
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
	HistoryMode,
	IssueCategory,
	ResultIssueRef,
	RunDataResults
} from '@/shared/types';
import { getHistorySearch, HistorySearch } from '@/shared/utils';
import { useGetRunDetailsQuery } from '@/services/bublik-api';
import {
	Badge,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	Icon,
	Separator,
	SplitButton,
	cn
} from '@/shared/tailwind-ui';
import { LinkWithProject } from '@/bublik/features/projects';
import { HistoryLinkContainer } from '@/bublik/features/history-link';
import {
	CATEGORY_ORDER,
	CLASSIFICATION_BADGE_CLASS,
	CategoryBadge,
	categoryMeta,
	formatBugKey
} from '@/bublik/features/result-classification';

/* -------------------------------------------------------------------------- */
/* Variant state                                                              */
/* -------------------------------------------------------------------------- */

const VARIANTS = [
	{ key: 'current', name: 'Today (baseline)' },
	{ key: 'A', name: 'Submenu in History' },
	{ key: 'B', name: 'Issues popover' }
] as const;

type VariantKey = (typeof VARIANTS)[number]['key'];

function usePrototypeVariant(): VariantKey {
	const [searchParams] = useSearchParams();
	const raw = searchParams.get('variant');
	const found = VARIANTS.find((v) => v.key === raw);

	return found?.key ?? 'A';
}

/* -------------------------------------------------------------------------- */
/* Data                                                                       */
/* -------------------------------------------------------------------------- */

type LinkProps = HistorySearch[keyof HistorySearch];

interface IssueGroup {
	issue: ResultIssueRef;
	categories: IssueCategory[];
}

/** A result carries one stamp per matching rule, so issues repeat. */
function groupByIssue(stamps: readonly ResultIssueRef[]): IssueGroup[] {
	const byId = new Map<number, IssueGroup>();

	for (const stamp of stamps) {
		const group = byId.get(stamp.issue_id);

		if (!group) {
			byId.set(stamp.issue_id, { issue: stamp, categories: [stamp.category] });
			continue;
		}

		if (!group.categories.includes(stamp.category)) {
			group.categories.push(stamp.category);
		}
	}

	return Array.from(byId.values());
}

function withIssue(link: LinkProps, issueId: number): LinkProps {
	const to = link.to as { pathname: string; search: string };
	const search = new URLSearchParams(to.search);
	search.set('issue', String(issueId));

	return { ...link, to: { ...to, search: search.toString() } };
}

function useIssueHistory(
	runId: number,
	result: RunDataResults,
	historyMode: HistoryMode,
	path?: string
) {
	const { data: details } = useGetRunDetailsQuery(runId);
	const groups = useMemo(
		() => groupByIssue(result.issues ?? []),
		[result.issues]
	);
	const search = useMemo(
		() =>
			details ? getHistorySearch(details, result, historyMode, path) : null,
		[details, result, historyMode, path]
	);

	return {
		groups,
		direct: search?.direct ?? null,
		prefilled: search?.prefilled ?? null
	};
}

function issueLabel(issue: ResultIssueRef) {
	return formatBugKey(issue.bug_key ?? null) ?? `#${issue.issue_id}`;
}

/* -------------------------------------------------------------------------- */
/* Shared bits                                                                */
/* -------------------------------------------------------------------------- */

function IssueKey({ issue }: { issue: ResultIssueRef }) {
	return (
		<span
			className={cn(
				'font-mono font-semibold shrink-0',
				issue.issue_state === 'closed' && 'line-through text-text-menu'
			)}
		>
			{issueLabel(issue)}
		</span>
	);
}

function CategoryBadges({ categories }: { categories: IssueCategory[] }) {
	return (
		<span className="flex items-center gap-1 shrink-0">
			{categories.map((category) => (
				<CategoryBadge key={category} category={category} />
			))}
		</span>
	);
}

/* -------------------------------------------------------------------------- */
/* Variant A — submenu per issue inside the History split button              */
/* -------------------------------------------------------------------------- */

const DIRECT_ITEMS = [
	['testName', 'Test Path'],
	['testNameAndVerdicts', 'Test Path + Verdicts'],
	['testNameAndParameters', 'Test Path + Parameters'],
	[
		'testNameAndParametersAndImportantTags',
		'Test Path + Parameters + Important Tags (Default)'
	],
	['testNameAndParametersAndAllTags', 'Test Path + Parameters + All Tags']
] as const;

const PREFILLED_ITEMS = [
	['testNameAndVerdicts', 'Test Path + Verdicts'],
	['testNameAndParametersAndVerdicts', 'Test Path + Parameters + Verdicts'],
	[
		'testNameAndParametersAndImportantTags',
		'Test Path + Parameters + Important Tags'
	]
] as const;

/** Mirrors the plain items, with the issue as one more filter. */
function withIssueLabel(label: string) {
	return `${label.replace(' (Default)', '')} + Issue`;
}

/** The History menu's options, each narrowed to one issue. */
function IssueHistorySubContent({
	issueId,
	direct,
	prefilled,
	alignOffset
}: {
	issueId: number;
	direct: HistorySearch;
	prefilled: HistorySearch;
	alignOffset?: number;
}) {
	return (
		<DropdownMenuSubContent
			alignOffset={alignOffset}
			sideOffset={6}
			className="z-[101] min-w-[260px]"
		>
			<SplitButton.Label>Open Direct Search</SplitButton.Label>
			<SplitButton.Separator className="my-1" />
			{DIRECT_ITEMS.map(([key, label]) => (
				<SplitButton.Item key={key} asChild>
					<LinkWithProject {...withIssue(direct[key], issueId)}>
						<Icon name="BoxArrowRight" size={20} className="text-primary" />
						<span>{withIssueLabel(label)}</span>
					</LinkWithProject>
				</SplitButton.Item>
			))}
			<SplitButton.Separator className="my-1" />
			<SplitButton.Label>Open Prefilled Form</SplitButton.Label>
			<SplitButton.Separator className="my-1" />
			{PREFILLED_ITEMS.map(([key, label]) => (
				<SplitButton.Item key={key} asChild>
					<LinkWithProject {...withIssue(prefilled[key], issueId)}>
						<Icon name="BoxArrowRight" size={20} className="text-primary" />
						<span>{withIssueLabel(label)}</span>
					</LinkWithProject>
				</SplitButton.Item>
			))}
		</DropdownMenuSubContent>
	);
}

interface VariantProps {
	runId: number;
	result: RunDataResults;
	historyMode: HistoryMode;
	path?: string;
}

function VariantA({ runId, result, historyMode, path }: VariantProps) {
	const { groups, direct, prefilled } = useIssueHistory(
		runId,
		result,
		historyMode,
		path
	);

	if (!direct || !prefilled) {
		return (
			<HistoryLinkContainer
				runId={runId}
				result={result}
				userPreferredHistoryMode={historyMode}
				path={path}
			/>
		);
	}

	return (
		<SplitButton.Root variant="secondary" size="xss">
			<SplitButton.Button asChild>
				<LinkWithProject {...direct.testNameAndParametersAndImportantTags}>
					<Icon
						name="BoxArrowRight"
						size={20}
						className="grid place-items-center mr-1"
					/>
					<span>History</span>
				</LinkWithProject>
			</SplitButton.Button>
			<SplitButton.Separator orientation="vertical" className="h-5" />
			<SplitButton.Trigger>
				<Icon name="ArrowShortTop" size={18} className="rotate-180" />
			</SplitButton.Trigger>
			<SplitButton.Content align="start">
				{groups.length ? (
					<>
						<SplitButton.Label>Open Search By Issue</SplitButton.Label>
						<SplitButton.Separator className="my-1" />
						{groups.map(({ issue, categories }) => (
							<DropdownMenuSub key={issue.issue_id}>
								<DropdownMenuSubTrigger className="text-xs gap-2 max-w-[360px] [&>svg:last-child]:size-5 [&>svg:last-child]:shrink-0">
									<Icon
										name="IssueIcon"
										size={20}
										className="text-primary shrink-0"
									/>
									<IssueKey issue={issue} />
									<span className="truncate text-text-menu">
										{issue.issue_title}
									</span>
									<CategoryBadges categories={categories} />
								</DropdownMenuSubTrigger>
								<DropdownMenuPortal>
									<IssueHistorySubContent
										issueId={issue.issue_id}
										direct={direct}
										prefilled={prefilled}
									/>
								</DropdownMenuPortal>
							</DropdownMenuSub>
						))}
						<SplitButton.Separator className="my-1" />
					</>
				) : null}
				<SplitButton.Label>Open Direct Search</SplitButton.Label>
				<SplitButton.Separator className="my-1" />
				{DIRECT_ITEMS.map(([key, label]) => (
					<SplitButton.Item key={key} asChild>
						<LinkWithProject {...direct[key]}>
							<Icon name="BoxArrowRight" size={20} className="text-primary" />
							<span>{label}</span>
						</LinkWithProject>
					</SplitButton.Item>
				))}
				<SplitButton.Separator className="my-1" />
				<SplitButton.Label>Open Prefilled Form</SplitButton.Label>
				<SplitButton.Separator className="my-1" />
				{PREFILLED_ITEMS.map(([key, label]) => (
					<SplitButton.Item key={key} asChild>
						<LinkWithProject {...prefilled[key]}>
							<Icon name="BoxArrowRight" size={20} className="text-primary" />
							<span>{label}</span>
						</LinkWithProject>
					</SplitButton.Item>
				))}
			</SplitButton.Content>
		</SplitButton.Root>
	);
}

/** The stamp badges without their tooltips, for rows that are menu items. */
function IssueStampBadges({
	issue,
	categories
}: {
	issue: ResultIssueRef;
	categories: IssueCategory[];
}) {
	const closed = issue.issue_state === 'closed';

	return (
		<div className="flex items-center gap-1.5">
			<Badge className="text-[0.6875rem] leading-[1.125rem] gap-1.5 bg-badge-0 normal-case tracking-normal font-mono max-w-[7rem]">
				<span
					className={cn(
						'min-w-0 truncate',
						closed && 'line-through opacity-60'
					)}
				>
					{issueLabel(issue)}
				</span>
				{issue.bug_url ? (
					<>
						<Separator orientation="vertical" className="h-3" />
						<a
							href={issue.bug_url}
							target="_blank"
							rel="noreferrer"
							className="grid place-items-center hover:text-primary"
							onClick={(event) => event.stopPropagation()}
						>
							<Icon name="ExternalLink" size={14} />
						</a>
					</>
				) : null}
			</Badge>
			<Separator orientation="vertical" className="h-3.5 bg-border-primary" />
			<div className="flex items-center gap-1">
				{CATEGORY_ORDER.filter((c) => categories.includes(c)).map(
					(category) => {
						const meta = categoryMeta(category);

						return (
							<Badge
								key={category}
								variant={meta.variant}
								className={CLASSIFICATION_BADGE_CLASS}
							>
								{meta.label}
							</Badge>
						);
					}
				)}
			</div>
		</div>
	);
}

/**
 * Opens the history options level with the menu's own heading rather than
 * beside the hovered row, so both headings read on one line.
 */
function TopAlignedIssueSub({
	issue,
	categories,
	direct,
	prefilled
}: {
	issue: ResultIssueRef;
	categories: IssueCategory[];
	direct: HistorySearch;
	prefilled: HistorySearch;
}) {
	const triggerRef = useRef<HTMLDivElement>(null);
	const [alignOffset, setAlignOffset] = useState(0);

	function measure() {
		setAlignOffset(-(triggerRef.current?.offsetTop ?? 0));
	}

	return (
		<DropdownMenuSub onOpenChange={(open) => open && measure()}>
			<DropdownMenuSubTrigger
				ref={triggerRef}
				onPointerEnter={measure}
				onFocus={measure}
				className="text-xs gap-2 items-start [&>svg:last-child]:size-5 [&>svg:last-child]:shrink-0"
			>
				<div className="flex flex-col gap-1 min-w-0">
					<IssueStampBadges issue={issue} categories={categories} />
					<span className="text-text-menu line-clamp-2">
						{issue.issue_title}
					</span>
				</div>
			</DropdownMenuSubTrigger>
			<DropdownMenuPortal>
				<IssueHistorySubContent
					issueId={issue.issue_id}
					direct={direct}
					prefilled={prefilled}
					alignOffset={alignOffset}
				/>
			</DropdownMenuPortal>
		</DropdownMenuSub>
	);
}

/* -------------------------------------------------------------------------- */
/* Variant B — separate "Issues" menu: issues, history options on hover       */
/* -------------------------------------------------------------------------- */

function VariantB({ runId, result, historyMode, path }: VariantProps) {
	const { groups, direct, prefilled } = useIssueHistory(
		runId,
		result,
		historyMode,
		path
	);
	return (
		<div className="flex flex-col items-start gap-3">
			<HistoryLinkContainer
				runId={runId}
				result={result}
				userPreferredHistoryMode={historyMode}
				path={path}
			/>
			{groups.length && direct && prefilled ? (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button className="flex items-center gap-1 pl-1.5 rdx-state-open:underline">
							<Icon
								name="IssueIcon"
								size={20}
								className="grid place-items-center"
							/>
							<span>Issues</span>
							<span className="rounded bg-primary-wash px-1 leading-4">
								{groups.length}
							</span>
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						sideOffset={8}
						className="z-[100] min-w-[220px] max-w-[360px]"
					>
						<SplitButton.Label>Open Search By Issue</SplitButton.Label>
						<SplitButton.Separator className="my-1" />
						{groups.map(({ issue, categories }) => (
							<TopAlignedIssueSub
								key={issue.issue_id}
								issue={issue}
								categories={categories}
								direct={direct}
								prefilled={prefilled}
							/>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			) : null}
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* Slot + switcher                                                            */
/* -------------------------------------------------------------------------- */

/** Returns the History cell for the current variant, or null for baseline. */
function useHistorySlotPrototype(props: VariantProps): ReactNode {
	const variant = usePrototypeVariant();

	if (variant === 'A') return <VariantA {...props} />;
	if (variant === 'B') return <VariantB {...props} />;

	return null;
}

function PrototypeSwitcher() {
	const [, setSearchParams] = useSearchParams();
	const current = usePrototypeVariant();
	const index = VARIANTS.findIndex((v) => v.key === current);

	function go(delta: number) {
		const next = VARIANTS[(index + delta + VARIANTS.length) % VARIANTS.length];
		setSearchParams(
			(prev) => {
				const params = new URLSearchParams(prev);
				params.set('variant', next.key);
				return params;
			},
			{ replace: true }
		);
	}

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			const target = event.target as HTMLElement | null;
			if (
				target?.closest(
					'input, textarea, [contenteditable="true"], [role="menu"]'
				)
			) {
				return;
			}
			if (event.key === 'ArrowLeft') go(-1);
			if (event.key === 'ArrowRight') go(1);
		}

		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	});

	const variant = VARIANTS[index];

	return (
		<div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-1 rounded-full bg-gray-900 text-white shadow-2xl px-2 py-1.5 text-sm select-none">
			<button className="px-2 hover:text-yellow-300" onClick={() => go(-1)}>
				←
			</button>
			<span className="px-2 font-mono">
				PROTOTYPE {variant.key} ({variant.name})
			</span>
			<button className="px-2 hover:text-yellow-300" onClick={() => go(1)}>
				→
			</button>
		</div>
	);
}

export { useHistorySlotPrototype, PrototypeSwitcher };
