/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { FC, ReactNode } from 'react';

export interface FormHeaderProps {
	name: string;
	description?: string;
	children?: ReactNode;
}

export const FormHeader: FC<FormHeaderProps> = ({
	name,
	description,
	children
}) => {
	return (
		<div className="flex items-center justify-between">
			<div className="flex flex-col gap-1">
				<span className="text-[1rem] font-semibold leading-[1.25rem] text-text-primary">
					{name}
				</span>
				{description ? (
					<span className="text-[0.75rem] leading-[1rem] text-history-subtle">
						{description}
					</span>
				) : null}
			</div>
			{children}
		</div>
	);
};
