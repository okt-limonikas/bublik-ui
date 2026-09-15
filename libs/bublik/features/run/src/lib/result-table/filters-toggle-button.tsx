/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { ButtonTw, Icon, Tooltip, cn } from '@/shared/tailwind-ui';

export interface FiltersToggleButtonProps {
	showToolbar: boolean;
	setShowToolbar: (showToolbar: boolean) => void;
	className?: string;
}

/** Shows or hides the iteration filter row. Used by both List and Matrix views. */
export function FiltersToggleButton(props: FiltersToggleButtonProps) {
	const { showToolbar, setShowToolbar, className } = props;

	return (
		<Tooltip content={showToolbar ? 'Hide filters' : 'Show filters'}>
			<ButtonTw
				variant={showToolbar ? 'primary' : 'secondary'}
				size="xss"
				onClick={() => setShowToolbar(!showToolbar)}
				className={cn(
					'border',
					showToolbar
						? 'border-primary hover:border-[#94b0ff]'
						: 'border-border-primary hover:shadow-none hover:border-primary',
					className
				)}
			>
				<Icon name="Filter" size={16} className="mr-1.5" />
				<span>Filters</span>
			</ButtonTw>
		</Tooltip>
	);
}
