/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { useLocalStorage } from '@/shared/hooks';

import {
	TableOfContentsItem,
	TocContextValue,
	TocDisplayMode
} from './run-report-toc.types';
import {
	findParentIds,
	useFlattenedTocIds,
	useScrollSpy
} from './run-report-toc.hooks';
import { TocContext } from './run-report-toc-context-hook';

function scrollToItem(id: string) {
	const elem = document.getElementById(encodeURIComponent(id));
	const scroller = document.getElementById('page-container');
	const offset = Number(elem?.dataset.offset || 0);

	if (!scroller || !elem) {
		return;
	}

	const elemRect = elem.getBoundingClientRect();
	const scrollerRect = scroller.getBoundingClientRect();

	const relativeTop = elemRect.top - scrollerRect.top;
	const targetScroll = scroller.scrollTop + relativeTop - offset;

	scroller.scrollTo({ top: targetScroll, behavior: 'smooth' });
}

function getDefaultExpandedIds(contents: TableOfContentsItem[]): Set<string> {
	const ids = new Set<string>();

	function traverse(items: TableOfContentsItem[]) {
		items.forEach((item) => {
			if (item.type === 'test-block' || item.type === 'arg-val-block') {
				ids.add(item.id);
			}
			if (item.children) {
				traverse(item.children);
			}
		});
	}

	traverse(contents);
	return ids;
}

interface TocProviderProps {
	children: ReactNode;
	contents: TableOfContentsItem[];
}

export function TocProvider({ children, contents }: TocProviderProps) {
	const [isVisible, setIsVisible] = useLocalStorage(
		'run-report-toc-visible',
		false
	);
	const [displayMode, setDisplayModeState] = useLocalStorage<TocDisplayMode>(
		'run-report-toc-mode',
		'floating'
	);
	const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
		getDefaultExpandedIds(contents)
	);

	const itemIds = useFlattenedTocIds(contents);
	const activeId = useScrollSpy(itemIds);

	// Track parent IDs of the active item for hierarchical highlighting
	const activeParentIds = useMemo(() => {
		if (!activeId) return [];
		return findParentIds(contents, activeId);
	}, [activeId, contents]);

	const toggleExpanded = useCallback((id: string) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const toggleVisibility = useCallback(() => {
		setIsVisible((prev) => !prev);
	}, [setIsVisible]);

	const setDisplayMode = useCallback(
		(mode: TocDisplayMode) => {
			setDisplayModeState(mode);
		},
		[setDisplayModeState]
	);

	useEffect(() => {
		if (activeId) {
			const parentIds = findParentIds(contents, activeId);
			if (parentIds.length > 0) {
				setExpandedIds((prev) => {
					const next = new Set(prev);
					parentIds.forEach((id) => next.add(id));
					return next;
				});
			}
		}
	}, [activeId, contents]);

	const value: TocContextValue = {
		contents,
		activeId,
		activeParentIds,
		expandedIds,
		toggleExpanded,
		isVisible,
		toggleVisibility,
		displayMode,
		setDisplayMode,
		scrollToItem
	};

	return <TocContext.Provider value={value}>{children}</TocContext.Provider>;
}
