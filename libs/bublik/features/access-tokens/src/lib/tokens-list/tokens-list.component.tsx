/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET Labs Ltd. */
import { useState } from 'react';

import { AccessToken } from '@/shared/types';
import { CopyTooltip, Icon, Skeleton, cn } from '@/shared/tailwind-ui';
import { BublikEmptyState, BublikErrorState } from '@/bublik/features/ui-state';

import { AccessTokenStatusBadge } from '../status-badge';
import { RevokeTokenContainer } from '../revoke-token';
import { formatMinute, formatMinuteWithZone } from '../utils/token-dates';

export const TokensListLoading = () => {
	return (
		<div className="flex flex-col gap-1">
			{Array.from({ length: 3 }, () => 0).map((_, idx) => (
				<Skeleton key={idx} className="h-14 rounded-md" />
			))}
		</div>
	);
};

interface TokensListErrorProps {
	error: unknown;
}

export const TokensListError = ({ error = {} }: TokensListErrorProps) => {
	return <BublikErrorState error={error} className="h-64" />;
};

export const TokensListEmpty = () => {
	return (
		<BublikEmptyState
			title="No access tokens"
			description="Create one to let an agent, a CI job or a script call Bublik as you."
			className="h-64"
		/>
	);
};

const byNewest = (a: AccessToken, b: AccessToken) =>
	b.created.localeCompare(a.created);

interface TokensListProps {
	tokens: AccessToken[];
}

/**
 * A user's own tokens, in the settings modal: few enough to show whole, newest
 * first, so there is nothing to sort or page through. Revoked tokens are kept
 * by the server for good, so they are folded away under their own heading
 * rather than piling up above the ones still in use.
 */
export const TokensList = ({ tokens }: TokensListProps) => {
	const [showRevoked, setShowRevoked] = useState(false);

	const sorted = [...tokens].sort(byNewest);
	const current = sorted.filter((token) => token.status !== 'revoked');
	const revoked = sorted.filter((token) => token.status === 'revoked');

	return (
		<div className="flex flex-col gap-3">
			{current.length ? (
				<TokenItems tokens={current} testId="access-tokens-list" />
			) : (
				<p className="text-sm text-text-menu">
					No tokens in use. Create one to let an agent, a CI job or a script
					call Bublik as you.
				</p>
			)}
			{revoked.length ? (
				<div className="flex flex-col gap-2">
					<button
						type="button"
						aria-expanded={showRevoked}
						onClick={() => setShowRevoked((open) => !open)}
						className="flex items-center self-start gap-1 py-0.5 pl-0.5 pr-1.5 -ml-0.5 text-xs font-medium transition-colors rounded text-text-menu hover:bg-primary-wash hover:text-primary"
						data-testid="access-tokens-revoked-toggle"
					>
						<Icon
							name="ArrowShortTop"
							size={16}
							className={cn(
								'transition-transform',
								showRevoked ? 'rotate-180' : 'rotate-90'
							)}
						/>
						Revoked ({revoked.length})
					</button>
					{showRevoked ? (
						<TokenItems tokens={revoked} testId="access-tokens-revoked-list" />
					) : null}
				</div>
			) : null}
		</div>
	);
};

const TokenItems = ({
	tokens,
	testId
}: {
	tokens: AccessToken[];
	testId: string;
}) => {
	return (
		<ul
			className="flex flex-col border divide-y rounded-md border-border-primary divide-border-primary"
			data-testid={testId}
		>
			{tokens.map((token) => (
				<TokensListItem key={token.id} token={token} />
			))}
		</ul>
	);
};

const TokensListItem = ({ token }: { token: AccessToken }) => {
	const lastUsed = formatMinute(token.last_used_at);
	const expires = formatMinuteWithZone(token.expires_at);

	return (
		<li
			className="flex items-center gap-3 px-3 py-2.5"
			data-testid="access-token-item"
		>
			<div className="flex flex-col flex-1 min-w-0 gap-1">
				<div className="flex items-center min-w-0 gap-2">
					<span className="text-sm font-medium break-words text-text-primary">
						{token.name}
					</span>
					<AccessTokenStatusBadge status={token.status} />
				</div>
				<div className="flex flex-wrap items-center text-xs gap-x-3 gap-y-0.5 text-text-menu tabular-nums">
					{/* The handle: the only part of a token that stays visible. */}
					<CopyTooltip copyString={token.prefix}>
						<span className="font-mono">{token.prefix}…</span>
					</CopyTooltip>
					<span>Created {formatMinuteWithZone(token.created)}</span>
					<span>{lastUsed ? `Last used ${lastUsed}` : 'Never used'}</span>
					<span>{expires ? `Expires ${expires}` : 'Never expires'}</span>
					{token.status === 'revoked' && token.revoked_by ? (
						<span>Revoked by {token.revoked_by}</span>
					) : null}
				</div>
			</div>
			{token.status === 'revoked' ? null : (
				<RevokeTokenContainer id={token.id} name={token.name} />
			)}
		</li>
	);
};
