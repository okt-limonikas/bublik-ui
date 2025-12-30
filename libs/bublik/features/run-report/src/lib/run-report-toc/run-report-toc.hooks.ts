/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */
import { useMemo } from 'react';

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

/**
 * Find all parent IDs for a given target ID in the TOC tree
 * Returns array from root to immediate parent (not including target)
 */
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
