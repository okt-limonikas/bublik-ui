/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */
import { z } from 'zod';
import { format } from 'date-fns';
import { Monaco } from '@monaco-editor/react';
import JSON5 from 'json5';

import { DEFAULT_URI } from '../config.constants';

const ValidationErrorSchema = z.object({
	status: z.number(),
	data: z.object({
		type: z.string(),
		message: z.record(z.array(z.string()))
	})
});

const ValidJsonStringSchema = z
	.string()
	.refine((val) => isValidJson5(val), { message: 'Invalid JSON' });

function formatTimeV(date: string): string {
	return `${format(new Date(date), 'MMM dd, yyyy')} at ${format(
		new Date(date),
		'HH:mm'
	)}`;
}

function isValidJson5(jsonStr: string): boolean {
	try {
		JSON5.parse(jsonStr);
		return true;
	} catch {
		return false;
	}
}

function getEditorValue(monaco?: Monaco, uri = DEFAULT_URI): string {
	if (!monaco) {
		return '';
	}

	const URI = monaco.Uri.parse(uri);

	if (!URI) {
		return '';
	}

	return monaco.editor.getModel(URI)?.getValue() ?? '';
}

export {
	ValidationErrorSchema,
	formatTimeV,
	isValidJson5,
	getEditorValue,
	ValidJsonStringSchema
};
