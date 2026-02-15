/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { ReactNode } from 'react';

export type BadgeQueryMode = 'simple' | 'builder' | 'raw';

export type BadgeQueryExpressionType =
	| 'tag'
	| 'label'
	| 'branch'
	| 'revision'
	| 'test_argument'
	| 'verdict';

export interface BadgeQueryOption {
	value: string;
	label?: string;
	keywords?: string[];
	badgeClassName?: string;
}

export interface BadgeQuerySection {
	id: string;
	label: string;
	badgeClassName?: string;
	options: BadgeQueryOption[];
}

export interface BadgeQueryBadge {
	id: string;
	value: string;
	label?: string;
	sectionId?: string;
	badgeClassName?: string;
	isCustom?: boolean;
}

export interface BadgeQueryValue {
	mode: BadgeQueryMode;
	badges: BadgeQueryBadge[];
	expression: string;
}

export interface BadgeQueryInputProps {
	label?: string;
	name?: string;
	placeholder?: string;
	disabled?: boolean;
	icon?: ReactNode;
	trailingContent?: ReactNode;
	error?: string;
	sections?: BadgeQuerySection[];
	value?: BadgeQueryValue;
	defaultValue?: BadgeQueryValue;
	onValueChange?: (value: BadgeQueryValue) => void;
	onBlur?: () => void;
	allowCustomValues?: boolean;
	customValueValidator?: (value: string) => boolean;
	expressionType?: BadgeQueryExpressionType;
	showModeToggle?: boolean;
}

export type BadgeQueryBinaryOperator = '&' | '|';

export interface BadgeQueryRule {
	id: string;
	value: string;
	negated: boolean;
}

export interface BadgeQueryBuilderState {
	operator: BadgeQueryBinaryOperator;
	rules: BadgeQueryRule[];
}
