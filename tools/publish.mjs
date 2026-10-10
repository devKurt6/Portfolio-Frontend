import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
// Explicit public allow-list excludes backend, secrets, and reference.
for (const path of ['index.html','success.html','error.html','type.html','favicon.ico','style.css','app.mjs','about','contact','projects','components','hooks','lib','pages','services','config','data','portfolio','images','videos']) {
    await cp(path, 'dist/' + path, { recursive: true, filter: source => !source.split(/[\\/]/).some(part => part.startsWith('.')) });
}
console.log('Prepared clean Netlify publish directory: dist/');
