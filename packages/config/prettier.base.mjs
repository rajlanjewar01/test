export default {
	semi: true,
	singleQuote: true,
	trailingComma: 'all',
	printWidth: 100,
	useTabs: true,
	tabWidth: 2,
	endOfLine: 'lf',
	overrides: [
		{
			files: ['*.yml', '*.yaml', '*.md'],
			options: { useTabs: false, tabWidth: 2 },
		},
	],
};
