/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryParam, JsonParam, withDefault } from 'use-query-params';
import {
	ExpandedState,
	SortingState,
	Updater,
	VisibilityState
} from '@tanstack/react-table';

import { useLocalStorage, useMount } from '@/shared/hooks';
import { useGetRunDetailsQuery } from '@/services/bublik-api';
import { formatTimeToDot } from '@/shared/utils';

import { RowStateContextType, RunRowState } from '../hooks';
import { DEFAULT_COLUMN_VISIBILITY } from './constants';

const GlobalFilterParam = withDefault(JsonParam, []);
const RowStateParam = withDefault(JsonParam, {});
const SortingParam = withDefault(JsonParam, []);

export function getRowId(
	original: RunData | MergedRun,
	_idx: number,
	parent: Row<RunData | MergedRun> | undefined
) {
	if ('result_ids' in original) {
		return parent
			? `${parent.id}_${original.result_ids.join(':')}_${original.exec_seqno}`
			: `${original.result_ids.join(':')}_${original.exec_seqno}`;
	}

	const baseId = `${original.result_id}_${original.exec_seqno}`;
	return parent ? `${parent.id}_${baseId}` : baseId;
}

const LOCAL_STORAGE_COLUMN_VISIBILITY_KEY = 'run-column-visibility';

function useColumnVisibility() {
	function getDefaultColumnVisibility(): VisibilityState {
		try {
			const columnVisibility = localStorage.getItem(
				LOCAL_STORAGE_COLUMN_VISIBILITY_KEY
			);

			if (!columnVisibility) return DEFAULT_COLUMN_VISIBILITY;

			return JSON.parse(columnVisibility);
		} catch (_) {
			return DEFAULT_COLUMN_VISIBILITY;
		}
	}

	const [localColumnVisibility, setLocalColumnVisibility] =
		useLocalStorage<VisibilityState>(
			LOCAL_STORAGE_COLUMN_VISIBILITY_KEY,
			getDefaultColumnVisibility()
		);

	const [queryColumnVisibility, setQueryColumnVisibility] =
		useQueryParam<VisibilityState>('visibility', JsonParam);

	useMount(() => {
		if (!Object.keys(queryColumnVisibility ?? {}).length) {
			setQueryColumnVisibility(localColumnVisibility, 'replaceIn');
		}
	});

	const columnVisibility = queryColumnVisibility ?? localColumnVisibility;

	const setColumnVisibility = (
		state: Updater<VisibilityState> | VisibilityState
	): void => {
		const newState =
			typeof state === 'function' ? state(columnVisibility) : state;

		setQueryColumnVisibility(newState, 'replace');
		setLocalColumnVisibility(newState);
	};

	return {
		columnVisibility,
		setColumnVisibility
	};
}

export const useRunTableQueryState = () => {
export function migrateExpandedState(
	expanded: Record<string, boolean> | true,
	allRows: Record<string, Row<RunData | MergedRun>>
): Record<string, boolean> | boolean {
	const newExpanded: Record<string, boolean> = {};

	if (typeof expanded === 'boolean') {
		return expanded;
	}

	Object.keys(expanded).forEach((key) => {
		const row = allRows[key];

		if (!row) return;

		const newRowId = getRowId(row.original, row.index, row.getParentRow());

		const rowExpanded: boolean = expanded[key];

		newExpanded[newRowId] = rowExpanded;
	});

	return newExpanded;
}

export function shouldMigrateExpandedState(expanded: ExpandedState): boolean {
	return Object.keys(expanded).some((key) => key.includes('.'));
}
export function migrateExpandedStateUrl(
	oldExpanded: ExpandedState,
	rows: Record<string, Row<RunData | MergedRun>>
) {
	const newExpanded = migrateExpandedState(oldExpanded, rows);
	const currentUrl = new URL(window.location.href);
	try {
		const expandedJson = JSON.stringify(newExpanded);
		currentUrl.searchParams.set('expanded', expandedJson);
	} catch (error) {
		console.error('Failed to stringify expanded state:', error, newExpanded);
	}
}

	const locationState = useLocation().state as {
		openUnexpected?: boolean;
		openUnexpectedResults?: boolean;
	};

	const [expanded, setExpanded] = useQueryParam<ExpandedState>(
		'expanded',
		withDefault(
			JsonParam,
			data && data.length > 0 ? { [getRowId(data[0], 0, undefined)]: true } : {}
		)
	);

	const [sorting, setSorting] = useQueryParam<SortingState>(
		'sorting',
		JsonParam
	);

	const [globalFilter, setGlobalFilter] = useQueryParam<string[]>(
		'globalFilter',
		GlobalFilterParam
	);

	const [rowState, setRowState] = useQueryParam<RunRowState>(
		'rowState',
		RowStateParam
	);
	const rowStateContext = useMemo<RowStateContextType>(
		() => [rowState, setRowState],
		[rowState, setRowState]
	);

	const { setColumnVisibility, columnVisibility } = useColumnVisibility();

	return {
		locationState,
		expanded,
		setExpanded,
		sorting,
		setSorting,
		globalFilter,
		setGlobalFilter,
		rowState,
		setRowState,
		columnVisibility,
		setColumnVisibility,
		rowStateContext
	};
};

export type useRunPageNameConfig = {
	runId: string | string[];
};

export const useRunPageName = ({ runId }: useRunPageNameConfig) => {
	const { data: details } = useGetRunDetailsQuery(
		Array.isArray(runId) ? runId[0] : runId
	);

	useEffect(() => {
		if (Array.isArray(runId)) {
			document.title = `${runId.join(' | ')} - Runs - Multiple - Bublik`;

			return;
		}

		if (!details) {
			document.title = 'Run - Bublik';
			return;
		}

		const { main_package: name, start } = details;
		const formattedTime = formatTimeToDot(start);

		document.title = `${name} | ${formattedTime} | ${runId} | Run - Bublik`;
	}, [details, runId]);
};
