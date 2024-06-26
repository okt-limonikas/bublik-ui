/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */
export interface ReportRoot {
	version: 'v1';
	title: string;
	run_source_link: string;
	run_stats_link: string;
	content: Block[];
}

type Block = BranchBlock | RevisionBlock | TestBlock;

type BranchItem = { name: string; value: string };

export type BranchBlock = {
	type: 'branch-block';
	id: string;
	label: string;
	content: BranchItem[];
};

type RevItem = {
	name: string;
	value: string;
	url?: string;
};

export type RevisionBlock = {
	type: 'rev-block';
	id: string;
	label: string;
	content: RevItem[];
};

export type TestBlock = {
	type: 'test-block';
	id: string;
	label: string;
	enable_table_view: boolean;
	enable_chart_view: boolean;
	common_args: Record<string, string | number>;
	content: RecordEntityBlock[];
};

export type RecordEntityBlock = {
	type: 'record-entity';
	id: string;
	label: string;
	warnings?: string[];
	args_vals: Record<string, string | number>;
	sequence_group_arg: string;
	axis_x_key: string;
	axis_x_label: string;
	axis_y_label: string;
	formatters: Record<string, string>;
	dataset_table: Array<Array<string | number>>;
	dataset_chart: Array<Array<string | number>>;
};
