import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
	root: __dirname,
	cacheDir: '../../../../node_modules/.vite/libs/bublik/features/net-analysis',

	plugins: [react(), nxViteTsPaths()],

	worker: {
		plugins: () => [nxViteTsPaths()]
	},

	test: {
		watch: false,
		globals: true,
		passWithNoTests: true,
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
		reporters: ['default'],
		coverage: {
			reportsDirectory:
				'../../../../coverage/libs/bublik/features/net-analysis',
			provider: 'v8'
		}
	}
});
