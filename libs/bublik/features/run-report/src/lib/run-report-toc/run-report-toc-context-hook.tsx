/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */
import { createContext, useContext } from 'react';

import { TocContextValue } from './run-report-toc.types';

export const TocContext = createContext<TocContextValue | null>(null);

export function useTocContext(): TocContextValue {
	const context = useContext(TocContext);
	if (!context) {
		throw new Error('useTocContext must be used within a TocProvider');
	}
	return context;
}
