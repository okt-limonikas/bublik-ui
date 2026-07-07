/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { ReactNode } from 'react';

import { ExprError, ExprGrammar } from '@/shared/utils';

import { BadgeItem } from '../badge-input';

export type FilterMode = 'tokens' | 'builder' | 'expression';

export interface SuggestionGroup {
	label: string;
	/** Badge color class for items of this group, e.g. 'bg-badge-6' */
	badgeClassName?: string;
	/** Full values: 'key=value' pairs or bare meta names */
	items: string[];
}

export interface FilterExpressionInputProps {
	label: string;
	placeholder?: string;
	mode: FilterMode;
	onModeChange: (mode: FilterMode) => void;
	badges: BadgeItem[];
	onBadgesChange: (badges: BadgeItem[]) => void;
	expression: string;
	onExpressionChange: (expression: string) => void;
	suggestions?: SuggestionGroup[];
	grammar?: ExprGrammar;
	/** Hide the builder mode (verdict grammar has no key/op/value shape) */
	hideBuilder?: boolean;
	keyValueDisplayDelimiter?: string;
	keyValueSubmitDelimiter?: string;
	onValidate?: (errors: ExprError[]) => void;
	disabled?: boolean;
	name?: string;
	labelTrailingContent?: ReactNode;
}
