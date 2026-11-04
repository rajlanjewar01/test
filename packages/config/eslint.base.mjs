import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const testFiles = ['**/test/**', '**/*.test.*', '**/*.spec.*'];
const toolingFiles = ['**/*.config.{js,mjs,cjs}', '**/.mocharc.cjs', 'packages/config/*.{mjs,cjs}'];

export default defineConfig([
	globalIgnores(['**/node_modules/**', '**/coverage/**', '**/dist/**', '**/.husky/_/**']),
	{
		files: ['**/*.{js,mjs,cjs,ts}'],
		extends: [js.configs.recommended],
		plugins: { import: importPlugin },
		languageOptions: {
			ecmaVersion: 'latest',
			globals: { ...globals.node },
		},
		rules: {
			eqeqeq: ['error', 'always'],
			'no-var': 'error',
			'import/no-extraneous-dependencies': [
				'error',
				{ devDependencies: [...testFiles, ...toolingFiles] },
			],
		},
	},
	{
		files: ['**/*.ts'],
		extends: [tseslint.configs.recommended],
	},
	{
		files: testFiles,
		languageOptions: { globals: { ...globals.mocha } },
	},
	{
		files: toolingFiles,
		rules: { 'import/no-extraneous-dependencies': 'off' },
	},
	prettier,
]);
