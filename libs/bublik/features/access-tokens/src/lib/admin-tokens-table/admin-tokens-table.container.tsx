/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET Labs Ltd. */
import { useAdminGetAccessTokensQuery } from '@/services/bublik-api';
import { useAuth } from '@/bublik/features/auth';
import { BublikEmptyState } from '@/bublik/features/ui-state';

import {
	TokensTable,
	TokensTableEmpty,
	TokensTableError,
	TokensTableLoading
} from '../tokens-table/tokens-table.component';

export const AdminTokensTableContainer = () => {
	const { isAdmin } = useAuth();
	/*
	 * Cosmetic: @auth_required(as_admin=True) on the endpoint is the real
	 * boundary. Skipping the request keeps a non-admin from triggering a 403
	 * and an error state they can do nothing about.
	 */
	const { data, isLoading, error } = useAdminGetAccessTokensQuery(undefined, {
		skip: !isAdmin
	});

	if (!isAdmin) {
		return (
			<BublikEmptyState
				title="Administrators only"
				description="Access tokens across all users are visible to administrators."
				className="h-[calc(100vh-256px)]"
			/>
		);
	}

	if (error) return <TokensTableError error={error} />;
	if (isLoading) return <TokensTableLoading />;
	if (!data?.length) return <TokensTableEmpty />;

	return <TokensTable tokens={data} withOwner />;
};
