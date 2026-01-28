/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { z } from 'zod';

export const UserPreferencesSchema = z
	.object({
		history: z
			.object({
				defaultMode: z
					.enum(['linear', 'aggregation', 'measurements'])
					.default('linear')
			})
			.default({ defaultMode: 'linear' }),
		log: z
			.object({
				preferLegacyLog: z.boolean().default(false),
				defaultExpandLevel: z.number().min(0).max(5).default(1)
			})
			.default({ preferLegacyLog: false, defaultExpandLevel: 1 })
	})
	.default({
		history: { defaultMode: 'linear' },
		log: { preferLegacyLog: false, defaultExpandLevel: 1 }
	})
	.catch({
		history: { defaultMode: 'linear' },
		log: { preferLegacyLog: false, defaultExpandLevel: 1 }
	});

export const USER_PREFERENCES_DEFAULTS = UserPreferencesSchema.parse({});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
