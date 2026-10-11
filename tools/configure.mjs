import { mkdir, writeFile, readFile } from 'node:fs/promises';
let local = {};
try { local = Object.fromEntries((await readFile('.env', 'utf8')).split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i+1).trim()]; })); } catch { /* Dashboard environment is sufficient. */ }
const value = key => process.env[key] ?? local[key];
export const config = { mode: value('PORTFOLIO_API_MODE') || 'mock', baseUrl: value('PORTFOLIO_API_BASE_URL') || '', contactMode: value('PORTFOLIO_CONTACT_MODE') || 'legacy', chatMode: value('PORTFOLIO_CHAT_MODE') || 'legacy' };
if (!['live', 'mock'].includes(config.mode) || !['legacy', 'backend'].includes(config.contactMode) || !['legacy', 'backend'].includes(config.chatMode)) throw Error('Invalid public API configuration.');
if (config.mode === 'live' && !/^https?:\/\//.test(config.baseUrl)) throw Error('Live mode requires PORTFOLIO_API_BASE_URL.');
await mkdir('config', { recursive: true });
await writeFile('config/runtime.mjs', '// Generated public configuration. Never put secrets here.\nexport const runtimeConfig = ' + JSON.stringify(config) + ';\n');
