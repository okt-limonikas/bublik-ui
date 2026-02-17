/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import {
	ComponentProps,
	ComponentPropsWithoutRef,
	ReactNode,
	forwardRef
} from 'react';

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
					'relative shrink-0 overflow-hidden rounded-2xl border border-border-primary bg-white px-4 pt-5',
					'shadow-[0_1px_2px_rgba(34,60,80,0.06)]',
					'transition-[border-color,box-shadow,transform] hover:border-primary/60 focus-within:border-primary focus-within:shadow-text-field motion-safe:animate-fade-in',
					'md:px-5 md:py-3',
					'shadow-sm',
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

const FormSectionBar = (props: ComponentPropsWithoutRef<'div'>) => {
	const { className, ...rest } = props;
	return (
		<div
			className={cn('absolute w-2 left-0 top-0 h-full', className)}
			{...rest}
		/>
	);
};

export const FormSection = Object.assign(FormSectionRoot, {
	Header: FormSectionHeaderComponent,
	ResetToDefaultButton: FormSectionResetToDefaultButton,
	ResetButton: FormSectionResetButton,
	Bar: FormSectionBar
});
