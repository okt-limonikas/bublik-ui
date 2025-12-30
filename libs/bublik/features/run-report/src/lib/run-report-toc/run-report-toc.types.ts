/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */

export interface TableOfContentsItem {
	type: 'test-block' | 'arg-val-block' | 'measurement-block' | 'record-block';
	id: string;
	label: string;
	children?: TableOfContentsItem[];
}

export interface TocContextValue {
	contents: TableOfContentsItem[];
	activeId: string | null;
	activeParentIds: string[];
	expandedIds: Set<string>;
	toggleExpanded: (id: string) => void;
	isVisible: boolean;
	toggleVisibility: () => void;
	scrollToItem: (id: string) => void;
}
