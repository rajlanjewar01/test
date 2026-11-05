import { createHash } from 'node:crypto';
import { transformSync } from 'esbuild';
import { compileTemplate, parse, rewriteDefault } from 'vue/compiler-sfc';

const DEFAULT_EXPORT_NAME = '__sfc__';

function fail(filename, message) {
	throw new Error(`${filename}: ${message}`);
}

function messagesOf(errors) {
	return errors.map((error) => String(error.message ?? error)).join('; ');
}

function restoreDefaultExport(code) {
	return code
		.replace(/var [A-Za-z_$][\w$]* = __sfc__;\n/, '')
		.replace(
			/export \{\n\s*[A-Za-z_$][\w$]* as default(,\n\s*\w+)*\n\};/,
			'export default __sfc__;',
		);
}

// Compiles a Vue single-file component (Options API, plain JavaScript) to an ES module.
// The <script> block keeps its line numbers so coverage maps back into the .vue file.
export function compileSfc(source, filename) {
	const { descriptor, errors } = parse(source, { filename });
	if (errors.length > 0) {
		fail(filename, messagesOf(errors));
	}
	if (descriptor.scriptSetup) {
		fail(filename, '<script setup> is not supported; this project uses the Options API');
	}
	if (descriptor.script?.lang && descriptor.script.lang !== 'js') {
		fail(
			filename,
			`<script lang="${descriptor.script.lang}"> is not supported; the web app is JavaScript`,
		);
	}

	const id = createHash('sha256').update(filename).digest('hex').slice(0, 8);
	const { script, template } = descriptor;

	const scriptCode = script
		? '\n'.repeat(script.loc.start.line - 1) + rewriteDefault(script.content, DEFAULT_EXPORT_NAME)
		: `const ${DEFAULT_EXPORT_NAME} = {};`;

	let templateCode = '';
	if (template) {
		const result = compileTemplate({ source: template.content, filename, id });
		if (result.errors.length > 0) {
			fail(filename, messagesOf(result.errors));
		}
		templateCode = `\n${result.code}\n${DEFAULT_EXPORT_NAME}.render = render;`;
	}

	const assembled = `${scriptCode}\n${templateCode}\nexport default ${DEFAULT_EXPORT_NAME};\n`;
	const { code } = transformSync(assembled, {
		loader: 'js',
		format: 'esm',
		sourcefile: filename,
		sourcemap: 'inline',
		sourcesContent: false,
	});
	return { code: restoreDefaultExport(code) };
}
