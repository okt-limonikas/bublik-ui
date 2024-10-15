/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024 OKTET LTD */
import { useState, ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
	ButtonTw,
	Checkbox,
	Dialog,
	DialogContent,
	DialogOverlay,
	dialogContentStyles,
	dialogOverlayStyles,
	cn,
	Icon,
	Tooltip
} from '@/shared/tailwind-ui';

import { ConfigEditor } from '../components/editor.component';
import {
	CurrentBadge,
	InactiveBadge,
	ModifiedBadge
} from '../components/badges.component';
import { ConfigVersions } from '../versions/config-versions';
import { ConfigVersionResponse } from '@/services/bublik-api';

const configFormSchema = z.object({
	content: z.string().refine(
		(val) => {
			try {
				JSON.parse(val);
				return true;
			} catch {
				return false;
			}
		},
		{ message: 'Invalid JSON' }
	),
	description: z.string().min(1, 'Description is required'),
	is_active: z.boolean()
});

type ConfigFormData = z.infer<typeof configFormSchema>;

interface ConfigEditorFormProps {
	defaultValues: ConfigFormData;
	onSubmit: (data: ConfigFormData) => void;
	schema?: Record<string, unknown>;
	isLoading?: boolean;
	label: ReactNode;
	config: { id: number; is_active: boolean };
	versions: ConfigVersionResponse['all_config_versions'];
	isModified: boolean;
	setConfigId: (id: number) => void;
	handleMarkAsCurrent: (id: number) => void;
	handleDeleteClick: (id: number) => void;
}

function ConfigEditorForm({
	defaultValues,
	onSubmit,
	schema,
	isLoading,
	label,
	config,
	versions,
	setConfigId,
	handleMarkAsCurrent,
	handleDeleteClick
}: ConfigEditorFormProps) {
	const form = useForm<ConfigFormData>({
		defaultValues,
		resolver: zodResolver(configFormSchema)
	});

	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const handleSaveClick = () => {
		if (form.formState.isValid) {
			setIsDialogOpen(true);
		}
	};

	function handleResetToOriginalClick() {
		form.reset({ content: defaultValues.content });
	}

	const isModified = form.watch('content') !== defaultValues.content;

	return (
		<>
			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogOverlay className={dialogOverlayStyles()} />
				<DialogContent
					className={cn(
						dialogContentStyles(),
						'sm:max-w-md p-6 bg-white sm:rounded-lg md:shadow min-w-[420px] overflow-auto max-h-[85vh]'
					)}
				>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						<h2 className="mb-4 text-xl font-semibold leading-tight text-text-primary">
							Update Config
						</h2>
						<div className="mb-4">
							<label
								htmlFor="description"
								className="block text-sm font-medium text-gray-700"
							>
								Description
							</label>
							<Controller
								name="description"
								control={form.control}
								render={({ field }) => (
									<textarea
										{...field}
										id="description"
										rows={4}
										className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
										placeholder="Enter description for the update"
									/>
								)}
							/>
							{form.formState.errors.description && (
								<p className="mt-1 text-sm text-red-600">
									{form.formState.errors.description.message}
								</p>
							)}
						</div>
						<div className="mb-4">
							<Controller
								name="is_active"
								control={form.control}
								render={({ field }) => (
									<label className="flex items-center">
										<Checkbox
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
										<span className="ml-2 text-sm text-gray-700">
											Activate config?
										</span>
									</label>
								)}
							/>
						</div>
						<div className="flex justify-end gap-2">
							<ButtonTw
								variant="secondary"
								type="button"
								onClick={() => setIsDialogOpen(false)}
							>
								Cancel
							</ButtonTw>
							<ButtonTw type="submit" variant="primary">
								Save
							</ButtonTw>
						</div>
					</form>
				</DialogContent>
			</Dialog>
			<Controller<ConfigFormData, 'content'>
				name="content"
				control={form.control}
				render={({ field }) => (
					<ConfigEditor
						schema={schema}
						value={field.value}
						onChange={field.onChange}
						className={cn(isLoading && 'opacity-40 pointer-events-none')}
						label={
							<UpdateConfigLabelContainer
								label={label}
								config={config}
								versions={versions}
								isModified={isModified}
								handleResetToOriginalClick={handleResetToOriginalClick}
								setConfigId={setConfigId}
								handleMarkAsCurrent={handleMarkAsCurrent}
								handleDeleteClick={handleDeleteClick}
								handleSaveClick={handleSaveClick}
							/>
						}
					/>
				)}
			/>
		</>
	);
}

interface UpdateConfigLabelContainerProps {
	label: ReactNode;
	config: { id: number; is_active: boolean };
	versions: ConfigVersionResponse['all_config_versions'];
	isModified: boolean;
	handleResetToOriginalClick: () => void;
	setConfigId: (id: number) => void;
	handleMarkAsCurrent: (id: number) => void;
	handleDeleteClick: (id: number) => void;
	handleSaveClick: () => void;
}

function UpdateConfigLabelContainer({
	label,
	config,
	versions,
	isModified,
	handleResetToOriginalClick,
	setConfigId,
	handleMarkAsCurrent,
	handleDeleteClick,
	handleSaveClick
}: UpdateConfigLabelContainerProps) {
	return (
		<div className="flex items-center gap-2">
			<div className="flex items-center gap-2">
				<span className="text-text-primary text-[0.75rem] font-semibold leading-[0.875rem]">
					{label}
				</span>
				{config.is_active ? <CurrentBadge /> : <InactiveBadge />}
				{isModified ? (
					<ModifiedBadge onClick={handleResetToOriginalClick} />
				) : null}
			</div>
			<ConfigVersions
				configId={config.id}
				versions={versions ?? []}
				onVersionClick={setConfigId}
			/>
			<Tooltip content="Update">
				<ButtonTw variant="secondary" size="xss" onClick={handleSaveClick}>
					<Icon name="Edit" className="size-5 mr-1.5" />
					<span>Update</span>
				</ButtonTw>
			</Tooltip>
			<Tooltip content="Activate">
				<ButtonTw
					variant={config.is_active ? 'destruction-secondary' : 'secondary'}
					size="xss"
					onClick={() => handleMarkAsCurrent(config.id)}
				>
					<Icon name="Edit" className="size-5 mr-1.5" />
					<span>{config.is_active ? 'Deactivate' : 'Activate'}</span>
				</ButtonTw>
			</Tooltip>
			<Tooltip content="Delete Config">
				<ButtonTw
					variant="destruction-secondary"
					size="xss"
					onClick={() => handleDeleteClick(config.id)}
				>
					<Icon name="Bin" className="size-5 mr-1.5" />
					<span>Delete</span>
				</ButtonTw>
			</Tooltip>
		</div>
	);
}

export { ConfigEditorForm };
