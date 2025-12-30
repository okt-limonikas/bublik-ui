/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */
import { useEffect, useMemo, useRef, useState } from 'react';

import { TableOfContentsItem } from './run-report-toc.types';

export function useFlattenedTocIds(contents: TableOfContentsItem[]): string[] {
	return useMemo(() => {
		const ids: string[] = [];

		function traverse(items: TableOfContentsItem[]) {
			items.forEach((item) => {
				if (item.label) {
					ids.push(item.id);
				}
				if (item.children) {
					traverse(item.children);
				}
			});
		}

		traverse(contents);
		return ids;
	}, [contents]);
}

export function useScrollSpy(itemIds: string[]): string | null {
	const [activeId, setActiveId] = useState<string | null>(null);
	const rafId = useRef<number | null>(null);

	useEffect(() => {
		const pageContainer = document.getElementById('page-container');
		if (!pageContainer || itemIds.length === 0) return;

		const findActiveId = () => {
			const containerRect = pageContainer.getBoundingClientRect();

			// Threshold line is 120px from top of container (accounting for sticky headers)
			const thresholdY = containerRect.top + 120;

			let currentActiveId: string | null = null;
			let closestDistance = Infinity;

			for (const id of itemIds) {
				const element = document.getElementById(encodeURIComponent(id));
				if (!element) continue;

				const rect = element.getBoundingClientRect();
				const elementTop = rect.top;

				// Element is above or at threshold - it's a candidate
				if (elementTop <= thresholdY) {
					const distance = thresholdY - elementTop;
					if (distance < closestDistance) {
						closestDistance = distance;
						currentActiveId = id;
					}
				}
			}

			// If no element is above threshold, pick the first visible one
			if (!currentActiveId) {
				for (const id of itemIds) {
					const element = document.getElementById(encodeURIComponent(id));
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

			if (currentActiveId !== null) {
				setActiveId(currentActiveId);
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

		return () => {
			pageContainer.removeEventListener('scroll', handleScroll);
			if (rafId.current) {
				cancelAnimationFrame(rafId.current);
			}
		};
	}, [itemIds]);

	return activeId;
}

export function findParentIds(
	contents: TableOfContentsItem[],
	targetId: string,
	parentPath: string[] = []
): string[] {
	for (const item of contents) {
		if (item.id === targetId) {
			return parentPath;
		}
		if (item.children) {
			const result = findParentIds(item.children, targetId, [
				...parentPath,
				item.id
			]);
			if (result.length > 0 || item.children.some((c) => c.id === targetId)) {
				return result.length > 0 ? result : [...parentPath, item.id];
			}
		}
	}
	return [];
}
