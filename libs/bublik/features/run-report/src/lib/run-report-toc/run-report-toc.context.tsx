/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */
import {
	ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	createContext,
	useContext,
	useSyncExternalStore
} from 'react';

import { useLocalStorage } from '@/shared/hooks';

import { TableOfContentsItem, TocDisplayMode } from './run-report-toc.types';
import { findParentIds, useFlattenedTocIds } from './run-report-toc.hooks';

// ============================================================================
// ACTIVE STATE STORE - Uses useSyncExternalStore to avoid re-renders
// ============================================================================

type ActiveStateListener = () => void;

interface ActiveState {
	activeId: string | null;
	activeParentIds: string[];
}

function createActiveStateStore() {
	let state: ActiveState = { activeId: null, activeParentIds: [] };
	const listeners = new Set<ActiveStateListener>();

	return {
		getState: () => state,
		setState: (newState: ActiveState) => {
			// Only notify if state actually changed
			if (
				state.activeId !== newState.activeId ||
				state.activeParentIds !== newState.activeParentIds
			) {
				state = newState;
				listeners.forEach((listener) => listener());
			}
		},
		subscribe: (listener: ActiveStateListener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		}
	};
}

// ============================================================================
// CONTEXTS
// ============================================================================

// 1. Static context - rarely changes (contents, scrollToItem)
interface TocStaticContextValue {
	contents: TableOfContentsItem[];
	scrollToItem: (id: string) => void;
}

const TocStaticContext = createContext<TocStaticContextValue | null>(null);

// 2. Active state store context - provides the store reference (stable)
const TocActiveStoreContext = createContext<ReturnType<
	typeof createActiveStateStore
> | null>(null);

// 3. Expanded state context - changes when user expands/collapses items
interface TocExpandedContextValue {
	expandedIds: Set<string>;
	toggleExpanded: (id: string) => void;
}

const TocExpandedContext = createContext<TocExpandedContextValue | null>(null);

// 4. UI state context - visibility and display mode
interface TocUIContextValue {
	isVisible: boolean;
	toggleVisibility: () => void;
	displayMode: TocDisplayMode;
	setDisplayMode: (mode: TocDisplayMode) => void;
}

const TocUIContext = createContext<TocUIContextValue | null>(null);

// 5. Scroll sync context - for scrolling TOC panel to active item
interface TocScrollSyncContextValue {
	registerItemRef: (id: string, element: HTMLDivElement | null) => void;
}

const TocScrollSyncContext = createContext<TocScrollSyncContextValue | null>(
	null
);

// ============================================================================
// HOOKS - Selective subscriptions to minimize re-renders
// ============================================================================

export function useTocStatic(): TocStaticContextValue {
	const context = useContext(TocStaticContext);
	if (!context) {
		throw new Error('useTocStatic must be used within a TocProvider');
	}
	return context;
}

// Active state hook using useSyncExternalStore - only components using this hook re-render
export function useTocActive(): ActiveState {
	const store = useContext(TocActiveStoreContext);
	if (!store) {
		throw new Error('useTocActive must be used within a TocProvider');
	}
	return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export function useTocExpanded(): TocExpandedContextValue {
	const context = useContext(TocExpandedContext);
	if (!context) {
		throw new Error('useTocExpanded must be used within a TocProvider');
	}
	return context;
}

export function useTocUI(): TocUIContextValue {
	const context = useContext(TocUIContext);
	if (!context) {
		throw new Error('useTocUI must be used within a TocProvider');
	}
	return context;
}

export function useTocScrollSync(): TocScrollSyncContextValue {
	const context = useContext(TocScrollSyncContext);
	if (!context) {
		throw new Error('useTocScrollSync must be used within a TocProvider');
	}
	return context;
}

// Optimized hook to check if a specific item is active (avoids full context subscription)
export function useIsItemActive(itemId: string): boolean {
	const { activeId } = useTocActive();
	return activeId === itemId;
}

// Optimized hook to check if a specific item is an active parent
export function useIsItemActiveParent(itemId: string): {
	isParent: boolean;
	level: number;
} {
	const { activeParentIds } = useTocActive();
	const parentIndex = activeParentIds.indexOf(itemId);
	const isParent = parentIndex !== -1;
	const level = isParent ? activeParentIds.length - 1 - parentIndex : -1;
	return { isParent, level };
}

// Optimized hook to check if a specific item is expanded
export function useIsItemExpanded(itemId: string): boolean {
	const { expandedIds } = useTocExpanded();
	return expandedIds.has(itemId);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

// ============================================================================
// SCROLL SPY - Runs outside of React state to avoid re-renders
// ============================================================================

function useScrollSpyWithStore(
	itemIds: string[],
	store: ReturnType<typeof createActiveStateStore>,
	contents: TableOfContentsItem[]
) {
	const rafId = useRef<number | null>(null);
	const lastActiveId = useRef<string | null>(null);

	useEffect(() => {
		const pageContainer = document.getElementById('page-container');
		if (!pageContainer || itemIds.length === 0) return;

		// Cache element references to avoid repeated DOM queries
		const elementsCache = new Map<string, HTMLElement>();

		const updateCache = () => {
			elementsCache.clear();
			for (const id of itemIds) {
				const element = document.getElementById(encodeURIComponent(id));
				if (element) {
					elementsCache.set(id, element);
				}
			}
		};

		// Initial cache population
		updateCache();

		const findActiveId = () => {
			const containerRect = pageContainer.getBoundingClientRect();
			const thresholdY = containerRect.top + 120;

			let currentActiveId: string | null = null;
			let closestDistance = Infinity;

			for (const id of itemIds) {
				const element = elementsCache.get(id);
				if (!element) continue;

				const rect = element.getBoundingClientRect();
				const elementTop = rect.top;

				if (elementTop <= thresholdY) {
					const distance = thresholdY - elementTop;
					if (distance < closestDistance) {
						closestDistance = distance;
						currentActiveId = id;
					}
				}
			}

			if (!currentActiveId) {
				for (const id of itemIds) {
					const element = elementsCache.get(id);
					if (!element) continue;

					const rect = element.getBoundingClientRect();
					if (
						rect.top >= containerRect.top &&
						rect.top <= containerRect.bottom
					) {
						currentActiveId = id;
						break;
					}
				}
			}

			// Only update store if the active ID actually changed
			if (
				currentActiveId !== null &&
				currentActiveId !== lastActiveId.current
			) {
				lastActiveId.current = currentActiveId;
				const activeParentIds = findParentIds(contents, currentActiveId);
				store.setState({ activeId: currentActiveId, activeParentIds });
			}
		};

		const handleScroll = () => {
			if (rafId.current) {
				cancelAnimationFrame(rafId.current);
			}
			rafId.current = requestAnimationFrame(findActiveId);
		};

		// Initial check
		findActiveId();

		pageContainer.addEventListener('scroll', handleScroll, { passive: true });

		// Refresh cache when DOM might have changed
		const resizeObserver = new ResizeObserver(() => {
			updateCache();
		});
		resizeObserver.observe(pageContainer);

		return () => {
			pageContainer.removeEventListener('scroll', handleScroll);
			resizeObserver.disconnect();
			if (rafId.current) {
				cancelAnimationFrame(rafId.current);
			}
		};
	}, [itemIds, store, contents]);
}

// ============================================================================
// PROVIDER
// ============================================================================

interface TocProviderProps {
	children: ReactNode;
	contents: TableOfContentsItem[];
}

export function TocProvider({ children, contents }: TocProviderProps) {
	// Create stable store reference
	const activeStoreRef = useRef<ReturnType<typeof createActiveStateStore>>();
	if (!activeStoreRef.current) {
		activeStoreRef.current = createActiveStateStore();
	}
	const activeStore = activeStoreRef.current;

	// UI state (persisted) - these don't change frequently
	const [isVisible, setIsVisible] = useLocalStorage(
		'run-report-toc-visible',
		false
	);
	const [displayMode, setDisplayModeState] = useLocalStorage<TocDisplayMode>(
		'run-report-toc-mode',
		'floating'
	);

	// Expanded state
	const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
		getDefaultExpandedIds(contents)
	);

	// Run scroll spy - updates store directly without causing re-renders
	const itemIds = useFlattenedTocIds(contents);
	useScrollSpyWithStore(itemIds, activeStore, contents);

	// Refs for scroll sync (panel scrolls to active item)
	const itemRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

	// Auto-expand parents of active item - subscribe to store changes
	useEffect(() => {
		const unsubscribe = activeStore.subscribe(() => {
			const { activeParentIds } = activeStore.getState();
			if (activeParentIds.length > 0) {
				setExpandedIds((prev) => {
					const needsUpdate = activeParentIds.some((id) => !prev.has(id));
					if (!needsUpdate) return prev;

					const next = new Set(prev);
					activeParentIds.forEach((id) => next.add(id));
					return next;
				});
			}
		});
		return () => {
			unsubscribe();
		};
	}, [activeStore]);

	// Scroll TOC panel to active item
	useEffect(() => {
		if (!isVisible) return;

		const unsubscribe = activeStore.subscribe(() => {
			const { activeId } = activeStore.getState();
			if (!activeId) return;

			const activeElement = itemRefsMap.current.get(activeId);
			if (activeElement) {
				requestAnimationFrame(() => {
					activeElement.scrollIntoView({
						behavior: 'smooth',
						block: 'nearest'
					});
				});
			}
		});
		return () => {
			unsubscribe();
		};
	}, [activeStore, isVisible]);

	// Memoized callbacks
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

	const registerItemRef = useCallback(
		(id: string, element: HTMLDivElement | null) => {
			if (element) {
				itemRefsMap.current.set(id, element);
			} else {
				itemRefsMap.current.delete(id);
			}
		},
		[]
	);

	// Memoized context values to prevent unnecessary re-renders
	const staticValue = useMemo<TocStaticContextValue>(
		() => ({ contents, scrollToItem }),
		[contents]
	);

	const expandedValue = useMemo<TocExpandedContextValue>(
		() => ({ expandedIds, toggleExpanded }),
		[expandedIds, toggleExpanded]
	);

	const uiValue = useMemo<TocUIContextValue>(
		() => ({ isVisible, toggleVisibility, displayMode, setDisplayMode }),
		[isVisible, toggleVisibility, displayMode, setDisplayMode]
	);

	const scrollSyncValue = useMemo<TocScrollSyncContextValue>(
		() => ({ registerItemRef }),
		[registerItemRef]
	);

	return (
		<TocStaticContext.Provider value={staticValue}>
			<TocUIContext.Provider value={uiValue}>
				<TocExpandedContext.Provider value={expandedValue}>
					<TocActiveStoreContext.Provider value={activeStore}>
						<TocScrollSyncContext.Provider value={scrollSyncValue}>
							{children}
						</TocScrollSyncContext.Provider>
					</TocActiveStoreContext.Provider>
				</TocExpandedContext.Provider>
			</TocUIContext.Provider>
		</TocStaticContext.Provider>
	);
}
