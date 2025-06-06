/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { MouseEvent } from 'react';
import { Row, Table } from '@tanstack/react-table';

import {
	MergedRun,
	RESULT_PROPERTIES,
	RESULT_TYPE,
	RunData
} from '@/shared/types';
import { Badge, BadgeVariants, Icon } from '@/shared/tailwind-ui';

import { GlobalFilterValue, ColumnId } from '../../types';
import {
	getRootRowId,
	isPackage,
	isTest,
	getAllPackageIdsRecursively
} from '../../utils';
import {
	add,
	doesRowHasMoreThanOneFilter,
	toggleSubtree,
	remove,
	isInFilter,
	createRequestRemover,
	createRequestAdder,
	toggleRowExpanded,
	getRowValues
} from '../../utils';
import { OpenTooltip } from '../open-tooltip';
import { RowState, useRunTableRowState } from '../../../hooks';

export interface TableBadgeModelProps {
	variant: BadgeVariants;
	columnId: ColumnId;
	results: RESULT_TYPE[];
	resultProperties?: RESULT_PROPERTIES[];
	row: Row<RunData | MergedRun>;
	table: Table<RunData | MergedRun>;
	value: number | string;
}

function TableBadgeModel({
	variant,
	columnId,
	results,
	resultProperties = [],
	row,
	table,
	value
}: TableBadgeModelProps) {
	const { rowState, updateRowState, deleteRows, updateRowsState } =
		useRunTableRowState();
	const { id: rowId } = row;
	const rootRowId = getRootRowId(table);
	const { getState, setGlobalFilter, setExpanded } = table;
	const globalFilter: GlobalFilterValue[] = getState().globalFilter;
	const isPackageInFilter = globalFilter.some(isInFilter(rowId, columnId));
	const hasMoreThanOneFilter = doesRowHasMoreThanOneFilter(rowId)(globalFilter);

	const isRoot = rowId === rootRowId;
	const isTestSelected = columnId in (rowState[rowId]?.requests || {});
	const isActive = isTestSelected || isPackageInFilter;

	/**
  |--------------------------------------------------
  | HANDLE RESULT
  |--------------------------------------------------
  */

	const removeRequest = createRequestRemover(columnId);
	const addRequest = createRequestAdder(columnId, {
		results,
		resultProperties
	});

	function openTest() {
		setExpanded(toggleRowExpanded(rowId, true));

		updateRowState({ rowId, requests: addRequest(rowState[rowId]?.requests) });
	}

	function closeTest() {
		const filterCount = Object.keys(rowState[rowId]?.requests || {}).length;
		const isRemovingLastFilter = isTestSelected && filterCount === 1;

		if (isRemovingLastFilter) setExpanded(toggleRowExpanded(rowId, false));

		updateRowState({
			rowId,
			requests: removeRequest(rowState[rowId]?.requests)
		});
	}

	function handleResultClick() {
		if (isTestSelected) {
			closeTest();
		} else {
			openTest();
		}
	}

	const packageIds = getAllPackageIdsRecursively(table, rowId, isPackage);
	const testIds = getAllPackageIdsRecursively(table, rowId, isTest);
	const rowsValues = getRowValues(row);

	/**
  |--------------------------------------------------
  | HANDLE PACKAGE
  |--------------------------------------------------
  */

	function expandPackageSubtree() {
		const nextGlobalFilter = add(rowId, columnId)(globalFilter);

		setExpanded(toggleSubtree(true, [...packageIds, rowId]));

		setGlobalFilter(nextGlobalFilter);
	}

	function collapseSubtree() {
		deleteRows(testIds);

		const toCollapse = !isRoot
			? packageIds
			: packageIds.filter((id) => id !== rowId);

		setExpanded(toggleSubtree(false, toCollapse));
	}

	/**
  |--------------------------------------------------
  | CTRL
  |--------------------------------------------------
  */

	function handleCtrlCollapse(ids: string[]) {
		const newRowState: RowState[] = ids.map((id) => {
			const currentState = rowState[id]?.requests || {};

			return { rowId: id, requests: removeRequest(currentState) };
		});

		const toClose = newRowState
			.filter((row) => Object.keys(row.requests || {}).length === 0)
			.map((row) => row.rowId);

		updateRowsState(newRowState);
		setExpanded(toggleSubtree(false, toClose));
	}

	function handleCtrlExpand() {
		if (!isPackageInFilter) setGlobalFilter(add(rowId, columnId)(globalFilter));

		const filteredIds = testIds.filter((id) => rowsValues[columnId]);

		const newRowState: RowState[] = filteredIds.map((rowId) => {
			const currentState = rowState[rowId]?.requests || {};

			const newState = { rowId, requests: addRequest(currentState) };

			return newState;
		});

		const toOpen = [...packageIds, ...filteredIds, rowId];

		updateRowsState(newRowState);
		setExpanded(toggleSubtree(true, toOpen));
	}

	/**
  |--------------------------------------------------
  | WITHOUT CTRL
  |--------------------------------------------------
  */

	function handleWithoutControl() {
		if (!isPackageInFilter) {
			expandPackageSubtree();
			return;
		}

		if (!hasMoreThanOneFilter) {
			collapseSubtree();
		}

		setGlobalFilter(remove(rowId, columnId)(globalFilter));
	}

	function handlePackageClick(forceCtrl = false) {
		return (e: MouseEvent) => {
			// 1. Just open subtrees
			if (!e.ctrlKey && !forceCtrl) return handleWithoutControl();

			// 2. If rows with corresponding ids are open with results
			const rowsWithValue = testIds.filter((id) => rowsValues[columnId]);

			const isOpenAndInFilter = rowsWithValue.every(
				(rowId) => columnId in (rowState[rowId]?.requests || {})
			);

			if (isOpenAndInFilter) return handleCtrlCollapse(rowsWithValue);

			// 3. Open test rows
			handleCtrlExpand();
		};
	}

	function handleClick(e: MouseEvent) {
		e.preventDefault();

		isTest(row) ? handleResultClick() : handlePackageClick(false)(e);
	}

	if (rowId === rootRowId && value) {
		return (
			<div className="flex items-center gap-1">
				<Badge
					variant={variant}
					isSelected={isActive}
					onClick={handleClick}
					onContextMenu={handleClick}
				>
					{value}
				</Badge>
				<OpenTooltip onClick={handlePackageClick(true)}>
					<Icon
						name="InformationCircleQuestionMark"
						size={16}
						className="text-primary"
						aria-label="Expand results"
					/>
				</OpenTooltip>
			</div>
		);
	}

	if (!value) return <span className="pl-2.5">{0}</span>;

	return (
		<Badge
			variant={variant}
			isSelected={isActive}
			onClick={handleClick}
			onContextMenu={handleClick}
		>
			{value}
		</Badge>
	);
}

export { TableBadgeModel };
