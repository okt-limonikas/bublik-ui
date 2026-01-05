/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { createContext, useContext, ReactNode } from 'react';

interface UpdateBannerContextValue {
	hasUpdate: boolean;
	show: () => void;
	dismiss: () => void;
}

const UpdateBannerContext = createContext<UpdateBannerContextValue | null>(
	null
);

export const useUpdateBanner = () => {
	const context = useContext(UpdateBannerContext);
	if (!context) {
		throw new Error(
			'useUpdateBanner must be used within UpdateBannerProvider'
		);
	}
	return context;
};

export const UpdateBannerContextProvider = ({
	children,
	value
}: {
	children: ReactNode;
	value: UpdateBannerContextValue;
}) => {
	return (
		<UpdateBannerContext.Provider value={value}>
			{children}
		</UpdateBannerContext.Provider>
	);
};
