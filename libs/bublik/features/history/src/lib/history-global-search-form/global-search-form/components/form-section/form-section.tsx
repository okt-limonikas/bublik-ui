/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { ComponentProps, ReactNode, forwardRef } from 'react';

import { cn } from '@/shared/tailwind-ui';

import { FormSectionHeader, FormSectionHeaderProps } from '../section-header';
import { IconButton } from '../icon-button';

export interface FormSectionProps extends ComponentProps<'fieldset'> {
	children: ReactNode;
}

const FormSectionRoot = forwardRef<HTMLFieldSetElement, FormSectionProps>(
	({ children, className, ...props }, ref) => {
		return (
			<fieldset
				ref={ref}
				className={cn(
					'relative rounded-2xl border border-border-primary bg-white px-4 pt-6 pb-4',
					'transition-colors hover:border-primary focus-within:border-primary motion-safe:animate-fade-in',
					'md:px-5 md:pt-6 md:pb-5',
					className
				)}
				{...props}
			>
				{children}
			</fieldset>
		);
	}
);

FormSectionRoot.displayName = 'FormSection';

interface FormSectionHeaderComponentProps extends FormSectionHeaderProps {
	children?: ReactNode;
}

const FormSectionHeaderComponent = ({
	children,
	...props
}: FormSectionHeaderComponentProps) => {
	return <FormSectionHeader {...props}>{children}</FormSectionHeader>;
};

interface FormSectionResetToDefaultButtonProps {
	onClick: () => void;
	helpMessage?: string;
}

const FormSectionResetToDefaultButton = ({
	onClick,
	helpMessage = 'Reset to defaults'
}: FormSectionResetToDefaultButtonProps) => {
	return (
		<IconButton
			name="Refresh"
			size={18}
			helpMessage={helpMessage}
			onClick={onClick}
		/>
	);
};

interface FormSectionResetButtonProps {
	onClick: () => void;
	helpMessage?: string;
}

const FormSectionResetButton = ({
	onClick,
	helpMessage = 'Clear section'
}: FormSectionResetButtonProps) => {
	return (
		<IconButton
			name="Bin"
			size={18}
			helpMessage={helpMessage}
			onClick={onClick}
		/>
	);
};

export const FormSection = Object.assign(FormSectionRoot, {
	Header: FormSectionHeaderComponent,
	ResetToDefaultButton: FormSectionResetToDefaultButton,
	ResetButton: FormSectionResetButton
});
