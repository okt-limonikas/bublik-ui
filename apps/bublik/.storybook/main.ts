/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
	stories: [
		'../src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
		'../../../libs/**/*.stories.@(js|jsx|ts|tsx|mdx)'
	],
	addons: [
		'@storybook/addon-essentials',
		'@storybook/addon-interactions',
		'@storybook/addon-a11y',
		'storybook-addon-react-router-v6'
	],
	framework: {
		name: '@storybook/react-vite',
		options: {
			builder: {
				viteConfigPath: 'vite.config.ts'
			}
		}
	},
	viteFinal: (config) => {
		config.plugins = config.plugins?.filter((plugin) => {
			if (typeof plugin === 'object' && plugin !== null && 'name' in plugin) {
				return plugin.name !== '@mdx-js/rollup';
			}
			return true;
		});

		return config;
	}
};

export default config;

// To customize your Vite configuration you can use the viteFinal field.
// Check https://storybook.js.org/docs/react/builders/vite#configuration
// and https://nx.dev/recipes/storybook/custom-builder-configs
