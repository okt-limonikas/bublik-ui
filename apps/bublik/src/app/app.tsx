/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { Provider } from 'react-redux';

import { store } from '@/bublik/+state';
import { Providers } from '@/shared/tailwind-ui';
import { UpdateBannerProvider } from '@/bublik/features/deploy-info';

import { Router } from './router';

import '../styles/tailwind.css';
import '../styles/fonts.css';

export const App = () => {
	return (
		<Provider store={store}>
			<Providers>
				<UpdateBannerProvider>
					<Router />
				</UpdateBannerProvider>
			</Providers>
		</Provider>
	);
};
