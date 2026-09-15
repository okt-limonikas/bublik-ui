/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	ButtonTw,
	DataTableFacetedFilter,
	Icon,
	Separator,
	Tooltip,
	cn
} from '@/shared/tailwind-ui';

import { COLUMN_ID } from './constants';
import { useDataTableFilters } from './result-table.filters';

export type ResultTableFiltersProps = Omit<
	ReturnType<typeof useDataTableFilters>,
	'filteredData' | 'requirements' | 'requirementsFilter'
> & {
	className?: string;
};

/**
 * The faceted filter row shared by the List and Matrix views of a test's
 * iterations: `filters | Reset`. State comes from
 * `useDataTableFilters`.
 */
export function ResultTableFilters(props: ResultTableFiltersProps) {
	const {
		className,
		parameters,
		verdicts,
		results,
		resultProperties,
		artifacts,
		parametersFilter,
		verdictsFilter,
		resultsFilter,
		resultPropertiesFilter,
		artifactsFilter,
		onClearFilters,
		onFilterChange,
		onVerdictsFilterChange,
		onResultsFilterChange,
		onResultPropertiesFilterChange
	} = props;

	return (
		<div className={cn('flex gap-2 items-center', className)}>
			<DataTableFacetedFilter
				title="Obtained Result"
				size="xss"
				options={results}
				value={resultsFilter}
				onChange={onResultsFilterChange}
				disabled={!results.length}
			/>
			<DataTableFacetedFilter
				title="Result Type"
				size="xss"
				options={resultProperties}
				value={resultPropertiesFilter}
				onChange={onResultPropertiesFilterChange}
				disabled={!resultProperties.length}
			/>
			<DataTableFacetedFilter
				title="Verdicts"
				size="xss"
				options={verdicts}
				value={verdictsFilter}
				onChange={onVerdictsFilterChange}
				disabled={!verdicts.length}
			/>
			<DataTableFacetedFilter
				title="Artifacts"
				size="xss"
				options={artifacts}
				value={artifactsFilter}
				onChange={(values) => onFilterChange(COLUMN_ID.ARTIFACTS, values)}
				disabled={!artifacts.length}
			/>
			<DataTableFacetedFilter
				title="Parameters"
				size="xss"
				options={parameters}
				value={parametersFilter}
				onChange={(values) => onFilterChange(COLUMN_ID.PARAMETERS, values)}
				disabled={!parameters.length}
			/>
			<Separator orientation="vertical" className="h-5" />
			<Tooltip content="Reset filters">
				<ButtonTw variant="secondary" size="xss" onClick={onClearFilters}>
					<Icon name="Bin" size={18} className="mr-1.5" />
					<span>Reset</span>
				</ButtonTw>
			</Tooltip>
		</div>
	);
}
