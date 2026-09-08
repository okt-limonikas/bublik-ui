/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import type {
	ColumnFiltersState,
	OnChangeFn,
	PaginationState,
	SortingState
} from '@tanstack/react-table';

export interface ClassificationTableStateConfig<F extends string> {
	filterKeys: readonly F[];
	searchColumnId: string;
	defaultPageSize?: number;
	defaultSorting?: SortingState;
	/**
	 * Column id -> the field name DRF's `OrderingFilter` knows it by, for the
	 * columns whose two names differ. A column absent from the map orders by its
	 * own id; a column mapped to `null` cannot be ordered server-side at all and
	 * sends no `ordering` (the table still sorts the page it holds).
	 */
	orderingByColumnId?: Record<string, string | null>;
}

export interface ClassificationQueryArgs {
	page: number;
	pageSize: number;
	search?: string;
	ordering?: string;
	filters: Record<string, string[]>;
}

export interface ClassificationTableState {
	pagination: PaginationState;
	onPaginationChange: OnChangeFn<PaginationState>;
	columnFilters: ColumnFiltersState;
	onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
	sorting: SortingState;
	onSortingChange: OnChangeFn<SortingState>;
	search: string;
	setSearch: (value: string) => void;
	hasFilters: boolean;
	resetFilters: () => void;
	clampPage: (pageCount: number) => void;
	queryArgs: ClassificationQueryArgs;
}
