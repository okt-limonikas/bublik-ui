/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { AnimatePresence, motion } from 'framer-motion';

import { Icon, twButtonStyles } from '@/shared/tailwind-ui';

import { useVersionCheck } from '../hooks/useVersionCheck';
import frontendInfo from '../git-info.json';
import { UpdateBannerContextProvider } from './update-banner-context';

export interface UpdateBannerProps {
	isVisible: boolean;
	onRefresh: () => void;
	onDismiss: () => void;
	newVersion?: string;
}

export const UpdateBanner = (props: UpdateBannerProps) => {
	const { isVisible, onRefresh, onDismiss, newVersion } = props;

	return (
		<AnimatePresence>
			{isVisible && (
				<motion.div
					className="fixed bottom-0 z-[9999] w-full bg-primary rounded-t flex items-center justify-center [&>*]:p-3"
					initial={{ y: 100 }}
					animate={{ y: 0 }}
					exit={{ y: 100 }}
					transition={{ type: 'spring', bounce: 0.3 }}
					data-testid="tw-update-banner"
				>
					<div className="flex items-center justify-center gap-2 basis-full">
						<Icon name="Refresh" size={24} className="text-white" />
						<span className="text-[18px] font-medium leading-[22px] text-white">
							A new version is available
							{newVersion ? ` (${newVersion})` : ''}.
						</span>
					</div>
					<button
						onClick={onRefresh}
						className={twButtonStyles({
							variant: 'secondary',
							size: 'xs',
							className: 'bg-white text-primary hover:bg-gray-100'
						})}
					>
						Refresh
					</button>
					<button
						onClick={onDismiss}
						aria-label="Dismiss update banner"
						className="text-white"
					>
						<Icon name="CrossSimple" size={20} />
					</button>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export const UpdateBannerProvider = ({
	children
}: {
	children?: React.ReactNode;
}) => {
	const { hasUpdate, newVersion, dismiss, show } = useVersionCheck({
		currentRevision: frontendInfo.revision
	});

	const handleRefresh = () => {
		window.location.reload();
	};

	return (
		<UpdateBannerContextProvider value={{ hasUpdate, show, dismiss }}>
			{children}
			<UpdateBanner
				isVisible={hasUpdate}
				onRefresh={handleRefresh}
				onDismiss={dismiss}
				newVersion={newVersion?.latestTag}
			/>
		</UpdateBannerContextProvider>
	);
};
