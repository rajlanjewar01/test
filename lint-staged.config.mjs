export default {
	'*.{js,mjs,cjs,ts}': ['eslint --max-warnings 0 --no-warn-ignored --fix', 'prettier --write'],
	'*.{json,md,yml,yaml,css,html}': ['prettier --write'],
};
