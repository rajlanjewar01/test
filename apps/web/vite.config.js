import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
			'@CommonComponents': resolve(__dirname, 'src/components/common'),
			'@Store': resolve(__dirname, 'src/store/modules'),
			'@modules': resolve(__dirname, 'src/modules'),
		},
	},
	server: {
		port: 3000,
		proxy: {
			'/api/v1': {
				target: 'http://localhost:4000',
				changeOrigin: true,
			},
		},
	},
});
