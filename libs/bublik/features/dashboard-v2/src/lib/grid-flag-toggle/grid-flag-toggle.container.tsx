/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2026 OKTET LTD */
import { useId } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { FlaskConical } from 'lucide-react';

import { useFeatureFlag } from '@/bublik/features/feature-flags';
import { cn } from '@/shared/tailwind-ui';

import { useLegacyTablePreview } from '../hooks';

/**
 * Debug switch between the grid table and the flex table it replaces,
 * pinned to the page's bottom right. Shown only while the `dashboard-grid`
 * flag is on (Settings → Beta); it does not change the flag itself, so the
 * two layouts can be compared and the switch stays available.
 * WIP: goes away when the grid layout graduates.
 */
export const GridFlagToggleContainer = () => {
	const [isGridEnabled] = useFeatureFlag('dashboard-grid');
	const { showLegacy, setShowLegacy } = useLegacyTablePreview();
	const id = useId();

	if (!isGridEnabled) return null;

	return (
		<label
			htmlFor={id}
			data-testid="dashboard-grid-flag-toggle"
			className={cn(
				'fixed bottom-3 right-3 z-50 flex items-center gap-2 rounded-full border border-border-primary bg-bg-primary py-1 pl-2.5 pr-1.5',
				'text-[0.6875rem] font-semibold text-text-menu shadow-popover cursor-pointer select-none'
			)}
		>
			<FlaskConical className="size-3.5 shrink-0" />
			<span>Grid layout</span>
			<SwitchPrimitive.Root
				id={id}
				checked={!showLegacy}
				onCheckedChange={(checked) => setShowLegacy(!checked)}
				className={cn(
					'relative h-4 w-[26px] shrink-0 rounded-full transition-colors duration-200 ease-in-out',
					'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
					'rdx-state-checked:bg-primary rdx-state-unchecked:bg-border-primary'
				)}
			>
				<SwitchPrimitive.Thumb
					className={cn(
						'block size-3 translate-x-0.5 rounded-full bg-white shadow transition-transform will-change-transform',
						'rdx-state-checked:translate-x-3'
					)}
				/>
			</SwitchPrimitive.Root>
		</label>
	);
};
