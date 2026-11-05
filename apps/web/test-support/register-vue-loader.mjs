import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { compileSfc } from './compile-sfc.mjs';

registerHooks({
	load(url, context, nextLoad) {
		if (!url.endsWith('.vue')) {
			return nextLoad(url, context);
		}
		const filename = fileURLToPath(url);
		const { code } = compileSfc(readFileSync(filename, 'utf8'), filename);
		return { format: 'module', source: code, shortCircuit: true };
	},
});
