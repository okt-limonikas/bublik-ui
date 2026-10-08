/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { createFileRoute } from '@tanstack/react-router';

import { AdminTokensPage } from '../../../../pages/admin-tokens';

export const Route = createFileRoute('/_app/admin/_admin/tokens')({
	component: AdminTokensPage
});
