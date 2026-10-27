/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { PropsWithChildren, ReactNode, useState } from 'react';

import { analyticsEventNames, trackEvent } from '@/bublik/features/analytics';
import {
	Dialog,
	DialogTrigger,
	ModalContent,
	ButtonTw,
	Icon,
	Tooltip,
	DialogClose,
	DialogDescription,
	DialogTitle,
	toast
} from '@/shared/tailwind-ui';

const CLOSE_BLOCKED_TOAST_ID = 'import-runs-close-blocked';

interface ImportRunFormModalProps {
	/** The line under the title */
	description?: ReactNode;
	onClose?: () => void;
	preventClose?: boolean;
}

function ImportRunFormModal(props: PropsWithChildren<ImportRunFormModalProps>) {
	const [open, setOpen] = useState(false);

	const handleOpenChange = (open: boolean) => {
		if (!open && props.preventClose) {
			toast.warning(
				'Import is still in progress. Please wait until it finishes.',
				{ id: CLOSE_BLOCKED_TOAST_ID }
			);
			return;
		}

		setOpen(open);

		if (open) {
			trackEvent(analyticsEventNames.importModalOpen, {
				source: 'import_page'
			});
		}

		if (!open) setTimeout(() => props.onClose?.(), 300);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<ButtonTw variant="outline" size="md" rounded="lg">
					<Icon name="FilePlus" size={24} className="mr-1.5 text-primary" />
					<span>Import</span>
				</ButtonTw>
			</DialogTrigger>

			{/* One size for every source and step, so switching never resizes it. */}
			<ModalContent className="w-[1120px] max-w-[95vw]">
				<div className="flex flex-col h-[min(760px,90vh)] overflow-hidden rounded-2xl bg-bg-primary">
					<header className="flex items-start justify-between gap-4 px-8 pt-7">
						<div className="flex flex-col gap-1">
							<DialogTitle className="text-xl font-semibold text-text-primary">
								Import runs
							</DialogTitle>
							<DialogDescription className="text-sm text-text-menu">
								{props.description}
							</DialogDescription>
						</div>
						<Tooltip content="Close">
							<DialogClose asChild>
								<ButtonTw
									variant="ghost"
									className="grid size-10 p-0 rounded-lg place-items-center text-text-menu hover:text-primary"
									aria-label="Close Import Dialog"
								>
									<Icon name="Cross" size={14} />
								</ButtonTw>
							</DialogClose>
						</Tooltip>
					</header>
					{props.children}
				</div>
			</ModalContent>
		</Dialog>
	);
}

export { ImportRunFormModal, type ImportRunFormModalProps };
