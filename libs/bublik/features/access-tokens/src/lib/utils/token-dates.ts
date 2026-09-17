/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET Labs Ltd. */
import { format } from 'date-fns';

/** Timestamps are shown to the minute, which is all the API records. */
const MINUTE_FORMAT = 'yyyy.MM.dd / HH:mm';

export const formatMinute = (value: string | null) =>
	value ? format(new Date(value), MINUTE_FORMAT) : null;

/**
 * The same, with the viewer's offset from GMT — "2026.11.27 / 05:11 GMT +3" —
 * for the dates a token's lifetime is judged by.
 */
export const formatMinuteWithZone = (value: string | null) => {
	if (!value) return null;

	const date = new Date(value);
	const zone = format(date, 'O').replace(/^GMT(?=[+-])/, 'GMT ');

	return `${format(date, MINUTE_FORMAT)} ${zone}`;
};
