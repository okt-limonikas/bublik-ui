/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET Labs Ltd. */
import { useGetAccessTokensQuery } from '@/services/bublik-api';

import {
	TokensList,
	TokensListEmpty,
	TokensListError,
	TokensListLoading
} from './tokens-list.component';

export const TokensListContainer = () => {
	const { data, isLoading, error } = useGetAccessTokensQuery();

	if (error) return <TokensListError error={error} />;
	if (isLoading) return <TokensListLoading />;
	if (!data?.length) return <TokensListEmpty />;

	return <TokensList tokens={data} />;
};
