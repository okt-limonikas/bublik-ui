/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET Labs Ltd. */
import { ReactNode } from 'react';

import { config } from '@/bublik/config';
import {
	ButtonTw,
	CodeBlock,
	CopyButton,
	Dialog,
	DialogClose,
	DialogDescription,
	DialogPortal,
	DialogTitle,
	Icon,
	ModalContent
} from '@/shared/tailwind-ui';

interface SnippetSectionProps {
	title: string;
	description: string;
	children: ReactNode;
}

const SnippetSection = ({
	title,
	description,
	children
}: SnippetSectionProps) => {
	return (
		<section className="flex flex-col min-w-0 gap-2">
			<div className="flex flex-col gap-0.5">
				<h3 className="text-[0.8125rem] font-semibold text-text-primary">
					{title}
				</h3>
				<p className="text-xs text-text-menu">{description}</p>
			</div>
			{children}
		</section>
	);
};

export interface TokenCreatedDialogProps {
	/**
	 * The token's value. It exists here and nowhere else -- the server keeps
	 * only a hash -- so the dialog is deliberately hard to dismiss by accident.
	 */
	token: string | null;
	onClose: () => void;
}

export const TokenCreatedDialog = ({
	token,
	onClose
}: TokenCreatedDialogProps) => {
	if (!token) return null;

	const origin = `${window.location.origin}${config.rootUrl}`;

	const mcpConfig = JSON.stringify(
		{
			mcpServers: {
				bublik: {
					type: 'http',
					url: `${origin}/mcp`,
					headers: { Authorization: `Bearer ${token}` }
				}
			}
		},
		null,
		2
	);

	const curlExample = `curl -H "Authorization: Bearer ${token}" \\\n  ${origin}/api/v2/auth/profile/info/`;

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			{/*
			 * Portalled because this dialog opens from inside the settings
			 * modal, whose content carries a CSS transform -- that makes it the
			 * containing block for `position: fixed` descendants, so without a
			 * portal this dialog is positioned and clipped inside it.
			 */}
			<DialogPortal>
				<ModalContent
					/* Above the settings modal this opens from. */
					overlayClassName="z-[60]"
					className="w-full sm:max-w-2xl p-6 bg-bg-primary sm:rounded-lg md:shadow min-w-[420px] z-[70] relative overflow-auto max-h-[85vh]"
					/*
					 * Losing an unrecoverable secret to a stray click outside the
					 * dialog is the one mistake here that cannot be undone.
					 */
					onInteractOutside={(e) => e.preventDefault()}
					onEscapeKeyDown={(e) => e.preventDefault()}
				>
					<DialogTitle className="text-xl font-semibold leading-tight text-text-primary">
						Your new access token
					</DialogTitle>

					<div className="flex items-center gap-2 px-3 py-2 mt-4 border rounded-md border-bg-warning/40 bg-bg-fillWarning/50">
						<Icon
							name="TriangleExclamationMark"
							size={18}
							className="text-bg-warning shrink-0"
						/>
						<DialogDescription className="text-xs leading-5 text-text-primary">
							<span className="font-semibold">Copy this token now.</span> It is
							stored only as a hash and won't be shown again.
						</DialogDescription>
					</div>

					<div className="flex flex-col gap-5 mt-5">
						<SnippetSection
							title="Token"
							description="Paste this into your client's configuration."
						>
							<div className="flex items-center gap-3 py-1.5 pl-3 pr-1.5 border rounded border-border-primary bg-bg-body">
								<code
									className="flex-1 min-w-0 font-mono text-xs leading-5 break-all select-all text-text-primary"
									data-testid="access-token-value"
								>
									{token}
								</code>
								<CopyButton value={token} label="Copy token" />
							</div>
						</SnippetSection>
						<SnippetSection
							title="MCP client configuration"
							description="Point Claude Code, Codex or another MCP client at Bublik. Actions the agent takes are attributed to you."
						>
							<CodeBlock
								code={mcpConfig}
								language="json"
								title="json"
								copyLabel="Copy MCP configuration"
								data-testid="access-token-mcp-config"
							/>
						</SnippetSection>
						<SnippetSection
							title="REST API"
							description="The same token works against the API, for CI jobs and scripts."
						>
							<CodeBlock
								code={curlExample}
								language="bash"
								title="bash"
								copyLabel="Copy curl example"
								data-testid="access-token-curl-example"
							/>
						</SnippetSection>
					</div>

					<div className="flex justify-end mt-6">
						<DialogClose asChild>
							<ButtonTw variant="primary" size="md" onClick={onClose}>
								I've saved it
							</ButtonTw>
						</DialogClose>
					</div>
				</ModalContent>
			</DialogPortal>
		</Dialog>
	);
};
