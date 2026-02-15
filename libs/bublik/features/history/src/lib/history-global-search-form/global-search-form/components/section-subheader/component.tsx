/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { FC } from 'react';

export interface FormSectionSubheaderProps {
	name: string;
}

export const FormSectionSubheader: FC<FormSectionSubheaderProps> = ({
	name
}) => {
	return (
		<div className="mb-3">
			<span className="inline-flex pl-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] leading-[0.875rem]">
				{name}
			</span>
		</div>
	);
};
