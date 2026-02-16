/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PopoverClose, PopoverPortal } from '@radix-ui/react-popover';
import { useForm } from 'react-hook-form';

import { bublikAPI } from '@/services/bublik-api';
import {
	ButtonTw,
	cn,
	Icon,
	MarkdownEditorField,
	MarkdownPreview,
	Popover,
	PopoverContent,
	PopoverTrigger,
	toast,
	Tooltip
} from '@/shared/tailwind-ui';

const RunCommentFormSchema = z.object({
	comment: z.string()
});

interface RunCommentFormContainerProps {
	runId: number;
	defaultValues: z.infer<typeof RunCommentFormSchema>;
}

function RunCommentFormContainer(props: RunCommentFormContainerProps) {
	const { runId, defaultValues } = props;
	const originalComment = defaultValues.comment;
	const originalCommentTrimmed = originalComment.trim();
	const form = useForm<z.infer<typeof RunCommentFormSchema>>({
		defaultValues: { comment: originalComment },
		resolver: zodResolver(RunCommentFormSchema)
	});
	const [updateRunComment] = bublikAPI.useUpdateRunCommentMutation();
	const [createRunComment] = bublikAPI.useCreateRunCommentMutation();
	const [deleteRunComment] = bublikAPI.useDeleteRunCommentMutation();
	const commentValue = form.watch('comment') ?? '';
	const nextCommentTrimmed = commentValue.trim();
	const hasExistingComment = originalCommentTrimmed !== '';
	const isSubmitDisabled = nextCommentTrimmed === '';

	useEffect(() => {
		form.reset({ comment: originalComment });
	}, [form, originalComment]);

	async function onSubmit(data: z.infer<typeof RunCommentFormSchema>) {
		const nextComment = data.comment.trim();
		let promise: Promise<unknown>;

		if (nextComment === '') {
			return;
		}

		if (originalCommentTrimmed === '') {
			promise = createRunComment({ runId, comment: nextComment });

			toast.promise(promise, {
				loading: 'Creating comment...',
				success: 'Comment created successfully',
				error: 'Failed to create comment'
			});
		} else {
			promise = updateRunComment({ runId, comment: nextComment });

			toast.promise(promise, {
				loading: 'Updating comment...',
				success: 'Comment updated successfully',
				error: 'Failed to update comment'
			});
		}

		await promise;
	}

	async function onDelete() {
		if (!hasExistingComment) {
			return;
		}

		const promise = deleteRunComment({ runId });

		toast.promise(promise, {
			loading: 'Deleting comment...',
			success: 'Comment deleted successfully',
			error: 'Failed to delete comment'
		});

		await promise;
		form.reset({ comment: '' });
	}

	return (
		<Popover>
			<div className="flex items-start gap-2">
				<span className="text-text-menu text-[0.6875rem] font-medium leading-[0.875rem] min-w-20">
					Comment
				</span>
				<div className="max-w-[min(48rem,calc(100vw-12rem))] max-h-16 overflow-y-auto">
					<MarkdownPreview
						markdown={originalComment}
						size="compact"
						emptyState="—"
					/>
				</div>
				<Tooltip content="Edit Run Comment">
					<PopoverTrigger asChild>
						<ButtonTw variant="secondary" size="xss" className="size-6">
							<Icon name="Edit" className="size-5 shrink-0" />
							<span className="sr-only">Edit</span>
						</ButtonTw>
					</PopoverTrigger>
				</Tooltip>
			</div>

			<PopoverPortal container={document.body}>
				<PopoverContent
					className={cn(
						'relative p-4 bg-white flex flex-col gap-3 rounded-md w-[min(48rem,calc(100vw-2rem))] shadow-popover'
					)}
					align="start"
					sideOffset={8}
				>
					<div className="flex items-center justify-between">
						<h2 className="text-[0.875rem] leading-[1.125rem] font-semibold text-left">
							Edit Comment
						</h2>
						<PopoverClose>
							<Icon name="Cross" className="size-3 text-text-menu" />
						</PopoverClose>
					</div>

					<form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
						<div className="flex flex-col gap-2">
							<MarkdownEditorField
								name="comment"
								control={form.control}
								placeholder="Run comment..."
								previewPlaceholder="Run comment preview..."
							/>

							<div className="flex items-center justify-between pt-1">
								<ButtonTw
									type="button"
									size="xs"
									variant="destruction-secondary"
									onClick={onDelete}
									disabled={!hasExistingComment}
								>
									Delete
								</ButtonTw>

								<ButtonTw type="submit" size="xs" disabled={isSubmitDisabled}>
									{originalCommentTrimmed === '' ? 'Create' : 'Update'}
								</ButtonTw>
							</div>
						</div>
					</form>
				</PopoverContent>
			</PopoverPortal>
		</Popover>
	);
}

export { RunCommentFormContainer };
