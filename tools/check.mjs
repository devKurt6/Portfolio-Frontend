import { readFile, readdir, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const roots = ['app.mjs', 'components', 'pages', 'hooks', 'lib', 'services', 'tools', 'netlify/functions'];
async function files(root) { const entries = await readdir(root, { withFileTypes: true }); const result = []; for (const entry of entries) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory())
        result.push(...await files(file));
    else
        result.push(file);
} return result; }
const sources = [];
for (const root of roots)
    sources.push(...(root.endsWith('.mjs') ? [root] : await files(root)));
const errors = [];
for (const file of sources.filter(f => /\.(mjs|js|cjs)$/.test(f))) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0)
        errors.push(result.stderr);
}
const htmlFiles = ['index.html', 'success.html', 'error.html', 'type.html', ...(await files('projects')), ...(await files('about')), ...(await files('contact'))].filter(f => f.endsWith('.html'));
for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');
    if (/Jordan Reyes|Northwind Systems|PlateReader|your-handle/.test(html))
        errors.push(`${file}: prototype placeholder found`);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    if (new Set(ids).size !== ids.length)
        errors.push(`${file}: duplicate element IDs`);
    for (const match of html.matchAll(/(?:href|src)="(\/[^"#?]+)(?:[?#][^"]*)?"/g)) {
        const url = decodeURIComponent(match[1]);
        const target = url.endsWith('/') ? url + 'index.html' : url;
        try {
            await access(path.join(process.cwd(), target));
        }
        catch {
            errors.push(`${file}: missing local asset or route ${url}`);
        }
    }
    if (!html.includes('favicon.ico'))
        errors.push(`${file}: missing favicon`);
}
const data = JSON.parse(await readFile('data/projects.json', 'utf8'));
if (!data.length || new Set(data.map(project => project.slug)).size !== data.length)
    errors.push('Project data must contain unique project slugs.');
const generated = await Promise.all(htmlFiles.map(file => readFile(file, 'utf8')));
const allHTML = generated.join('\n');
const plain = html => html.replace(/<[^>]*>/g,' ').replaceAll('&amp;','&').replaceAll('&#39;',"'").replace(/\s+/g,' ').trim();
const visibleText = plain(allHTML);
const original = JSON.parse(await readFile('data/content.json','utf8'));
for(const key of ['intro','role'])if(!visibleText.includes(plain(original[key])))errors.push(`Missing original ${key} copy.`);
for(const key of ['experience','contact','certificates','success','error']){
  for(const match of original[key].matchAll(/<(?:p|h[1-4])[^>]*>([\s\S]*?)<\/(?:p|h[1-4])>/g)){
    const text=plain(match[1]);if(text&&!visibleText.includes(text))errors.push(`Missing original ${key} text: ${text}`);
  }
}
for(const source of [original.socials,original.contact])for(const match of source.matchAll(/href="((?:https?:|mailto:)[^"]+)"/g))if(!allHTML.includes(match[1]))errors.push(`Missing original link: ${match[1]}`);
for(const field of ['description','longDescription'])for(const project of data)if(!visibleText.includes(project[field]))errors.push(`Missing ${field} for ${project.title}`);
for (const project of data) {
    if (!generated.some(html => html.includes(project.title.replaceAll('&', '&amp;'))))
        errors.push(`Missing project: ${project.title}`);
}
const gitIgnore = await readFile('.gitignore', 'utf8');
if (!gitIgnore.includes('/reference portfolio design/'))
    errors.push('Reference folder is not ignored.');
if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
}
else
    console.log(`Syntax and static validation passed: ${sources.length} source files, ${htmlFiles.length} HTML pages, all ${data.length} projects and local routes/assets.`);
