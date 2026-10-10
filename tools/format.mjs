import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
async function sources(dir) { const output = []; for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory())
        output.push(...await sources(file));
    else if (/\.(mjs|cjs)$/.test(file))
        output.push(file);
} return output; }
for (const file of ['app.mjs', ...await sources('components'), ...await sources('hooks'), ...await sources('pages'), ...await sources('services'), ...await sources('lib'), ...await sources('tools')]) {
    const text = await readFile(file, 'utf8');
    const tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    await writeFile(file, printer.printFile(tree));
}
const css = await readFile('style.css', 'utf8');
let output = '', depth = 0, quote = '', comment = false, paren = 0;
const newline = () => { output = output.trimEnd() + '\n' + '  '.repeat(Math.max(depth, 0)); };
for (let i = 0; i < css.length; i++) {
    const char = css[i];
    if (comment) {
        output += char;
        if (char === '/' && css[i - 1] === '*') {
            comment = false;
            newline();
        }
        continue;
    }
    if (quote) {
        output += char;
        if (char === quote && css[i - 1] !== '\\')
            quote = '';
        continue;
    }
    if (char === '/' && css[i + 1] === '*') {
        comment = true;
        output += char;
        continue;
    }
    if (char === '"' || char === "'") {
        quote = char;
        output += char;
        continue;
    }
    if (char === '(')
        paren++;
    if (char === ')')
        paren--;
    if (!paren && char === '{') {
        output += ' {';
        depth++;
        newline();
    }
    else if (!paren && char === '}') {
        depth--;
        newline();
        output += '}';
        newline();
    }
    else if (!paren && char === ';') {
        output += ';';
        newline();
    }
    else if (char === '\n' || char === '\r') {
        if (output.endsWith('\n'))
            continue;
    }
    else
        output += char;
}
await writeFile('style.css', output.trim() + '\n');
console.log('Formatted JavaScript modules and stylesheet.');
