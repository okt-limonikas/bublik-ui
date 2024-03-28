/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { forwardRef } from 'react';

import * as RadixCheckbox from '@radix-ui/react-checkbox';

import { cn, cva } from '../utils';
import { Icon, IconProps } from '../icon';

const isBoxedCheckbox = (
	props: SimpleCheckboxProps | BoxedCheckboxProps
): props is BoxedCheckboxProps => {
	return 'iconName' in props && 'iconSize' in props && 'label' in props;
};

export type CheckboxProps = SimpleCheckboxProps | BoxedCheckboxProps;

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
	(props, ref) => {
		if (isBoxedCheckbox(props)) {
			return <BoxedCheckbox {...props} ref={ref} />;
		}

		return <SimpleCheckbox {...props} ref={ref} />;
	}
);

type SimpleCheckboxProps = RadixCheckbox.CheckboxProps & { label?: string };

const SimpleCheckbox = forwardRef<HTMLButtonElement, SimpleCheckboxProps>(
	(props, ref) => {
		const checked = props.checked;

		return (
			<div className="flex items-center">
				<RadixCheckbox.Root
					className={cn(
						'grid w-6 h-6 bg-white rounded place-items-center border relative',
						checked
							? 'text-white bg-primary border-primary'
							: 'border-border-primary'
					)}
					data-testid="tw-checkbox"
					name={props.name}
					{...props}
					ref={ref}
				>
					<RadixCheckbox.Indicator>
						{checked === 'indeterminate' && (
							<div className="absolute w-[65%] h-0.5 -translate-x-1/2 -translate-y-1/2 bg-white rounded top-1/2 left-1/2" />
						)}
						{checked === true && (
							<svg
								width="15"
								height="15"
								viewBox="0 0 15 15"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
									fill="currentColor"
									fillRule="evenodd"
									clipRule="evenodd"
								/>
							</svg>
						)}
					</RadixCheckbox.Indicator>
				</RadixCheckbox.Root>
				<label htmlFor={props.name} className="pl-2">
					{props.label}
				</label>
			</div>
		);
	}
);

const checkboxLabelStyles = cva({
	base: [
		'flex',
		'items-center',
		'justify-start',
		'w-full',
		'h-full',
		'cursor-pointer',
		'gap-1',
		'border',
		'border-border-primary',
		'px-2',
		'py-1.5',
		'rounded',
		'transition-all',
		'focus-within:shadow-[0_0_0_2px_rgba(98,126,251,0.1)]',
		'rdx-state-checked:border-primary'
	]
});

const iconStyles = cva({
	base: [
		'grid place-items-center',
		'rdx-state-checked:text-primary rdx-state-unchecked:text-border-primary'
	]
});

type BoxedCheckboxProps = RadixCheckbox.CheckboxProps & {
	label: string;
	iconName: IconProps['name'];
	iconSize: IconProps['size'];
};

const BoxedCheckbox = forwardRef<HTMLButtonElement, BoxedCheckboxProps>(
	(props, ref) => {
		const { iconName, iconSize, label, ...restProps } = props;

		return (
			<RadixCheckbox.Root
				checked={props.checked}
				onCheckedChange={props.onCheckedChange}
				className={checkboxLabelStyles()}
				{...restProps}
				data-testid="tw-checkbox"
				ref={ref}
			>
				<RadixCheckbox.CheckboxIndicator forceMount className={iconStyles()}>
					<Icon name={iconName} size={iconSize} />
				</RadixCheckbox.CheckboxIndicator>
				<label
					htmlFor={props.id}
					className="text-[0.75rem] font-medium leading-[0.875rem]"
				>
					{label}
				</label>
			</RadixCheckbox.Root>
		);
	}
);
