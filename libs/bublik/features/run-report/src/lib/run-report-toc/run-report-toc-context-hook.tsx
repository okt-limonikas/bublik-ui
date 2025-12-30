/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */
// Re-export all context hooks from the main context file
// This file is kept for backward compatibility

export {
	useTocStatic,
	useTocActive,
	useTocExpanded,
	useTocUI,
	useTocScrollSync,
	useIsItemActive,
	useIsItemActiveParent,
	useIsItemExpanded
} from './run-report-toc.context';

// Legacy hook for backward compatibility - combines all contexts
// WARNING: Using this hook will cause re-renders on ANY context change
// Prefer using the specific hooks (useTocStatic, useTocActive, etc.) for better performance
import {
	useTocStatic,
	useTocActive,
	useTocExpanded,
	useTocUI
} from './run-report-toc.context';
import { TocContextValue } from './run-report-toc.types';

/**
 * @deprecated Use specific hooks (useTocStatic, useTocActive, useTocExpanded, useTocUI) instead
 * This hook subscribes to ALL context changes and will cause unnecessary re-renders
 */
export function useTocContext(): TocContextValue {
	const { contents, scrollToItem } = useTocStatic();
	const { activeId, activeParentIds } = useTocActive();
	const { expandedIds, toggleExpanded } = useTocExpanded();
	const { isVisible, toggleVisibility, displayMode, setDisplayMode } =
		useTocUI();

	return {
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
}
