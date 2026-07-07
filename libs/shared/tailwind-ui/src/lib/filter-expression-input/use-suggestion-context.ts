/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { getKeyValueParts } from '@/shared/utils';

import { SuggestionGroup } from './filter-expression-input.types';

/**
 * Ident charset of the backend expression grammar plus '=' and '!' so a
 * key=value pair under the caret is treated as a single word.
 */
const WORD_CHAR = /[A-Za-z0-9._\-/%+:=!]/;

export interface SuggestionContext {
	stage: 'key' | 'value';
	/** Present in the value stage: the key before '=' */
	key?: string;
	/** The text being completed (key prefix or value prefix) */
	query: string;
	/** Range of the input text an accepted suggestion should replace */
	replaceSpan: { start: number; end: number };
}

export interface SuggestionEntry {
	/** 'key' entries insert 'key=' and keep the popover open for the value stage */
	kind: 'pair' | 'key';
	insertText: string;
	display: string;
	valueCount?: number;
}

export interface FilteredSuggestionGroup {
	label: string;
	badgeClassName?: string;
	entries: SuggestionEntry[];
}

export function getSuggestionContext(
	text: string,
	caret: number
): SuggestionContext {
	let start = caret;
	while (start > 0 && WORD_CHAR.test(text[start - 1])) start--;

	const word = text.slice(start, caret);
	const eqIndex = word.indexOf('=');

	if (eqIndex === -1) {
		return {
			stage: 'key',
			query: word,
			replaceSpan: { start, end: caret }
		};
	}

	// strip a trailing '!' so 'a!=' narrows values of 'a', not 'a!'
	const key = word.slice(0, eqIndex).replace(/!$/, '');
	const query = word.slice(word.lastIndexOf('=') + 1);

	return {
		stage: 'value',
		key,
		query,
		replaceSpan: { start, end: caret }
	};
}

const MAX_ENTRIES_PER_GROUP = 30;

const matches = (candidate: string, query: string) =>
	candidate.toLowerCase().includes(query.toLowerCase());

const rankEntries = (entries: SuggestionEntry[], query: string) => {
	if (!query) return entries;

	const lowered = query.toLowerCase();

	return [...entries].sort((left, right) => {
		const leftPrefix = left.display.toLowerCase().startsWith(lowered) ? 0 : 1;
		const rightPrefix = right.display.toLowerCase().startsWith(lowered) ? 0 : 1;

		return leftPrefix - rightPrefix;
	});
};

export function filterSuggestions(
	groups: SuggestionGroup[],
	context: SuggestionContext,
	excluded: Set<string> = new Set()
): FilteredSuggestionGroup[] {
	const result: FilteredSuggestionGroup[] = [];

	for (const group of groups) {
		let entries: SuggestionEntry[] = [];

		if (context.stage === 'value') {
			for (const item of group.items) {
				const [key, value] = getKeyValueParts(item, '=');

				if (key !== context.key || value === undefined) continue;
				if (excluded.has(item)) continue;
				if (context.query && !matches(value, context.query)) continue;

				entries.push({ kind: 'pair', insertText: item, display: value });
			}
		} else {
			const valueCounts = new Map<string, number>();

			for (const item of group.items) {
				const [key, value] = getKeyValueParts(item, '=');

				if (value === undefined) continue;
				valueCounts.set(key, (valueCounts.get(key) ?? 0) + 1);
			}

			const seenKeys = new Set<string>();

			for (const item of group.items) {
				const [key, value] = getKeyValueParts(item, '=');

				if (context.query && !matches(item, context.query)) continue;

				if (value === undefined) {
					if (!excluded.has(item)) {
						entries.push({ kind: 'pair', insertText: item, display: item });
					}
					continue;
				}

				const count = valueCounts.get(key) ?? 0;

				if (count > 1) {
					if (!seenKeys.has(key)) {
						seenKeys.add(key);
						entries.push({
							kind: 'key',
							insertText: `${key}=`,
							display: key,
							valueCount: count
						});
					}
					continue;
				}

				if (!excluded.has(item)) {
					entries.push({ kind: 'pair', insertText: item, display: item });
				}
			}
		}

		entries = rankEntries(entries, context.query).slice(
			0,
			MAX_ENTRIES_PER_GROUP
		);

		if (entries.length) {
			result.push({
				label: group.label,
				badgeClassName: group.badgeClassName,
				entries
			});
		}
	}

	return result;
}
