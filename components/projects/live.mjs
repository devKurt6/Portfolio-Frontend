import { apiConfig, getProjects, getProject } from '../../services/api.mjs';
import { projectCard, skeletonCards } from './render.mjs';
import { projectDetail } from './detail.mjs';
import { mountMedia } from '../ui/media.mjs';
/** @param {HTMLElement} host @param {'featured'|'list'|'detail'} kind @param {() => void} [after] */
export async function hydrateProjects(host, kind, after = () => {}) {
    if (apiConfig.mode !== 'live') return;
    host.setAttribute('aria-busy', 'true');
    host.innerHTML = skeletonCards(kind === 'list' ? 6 : 1);
    try {
        if (kind === 'detail') {
            const slug = location.pathname.split('/').filter(Boolean)[1] || '';
            const project = await getProject(slug);
            if (!project) throw Error('Project not found.');
            host.innerHTML = projectDetail(project).replace(/^<div class="wrap page-content">/, '').slice(0, -6);
            mountMedia();
        } else {
            const projects = await getProjects();
            const items = kind === 'featured' ? projects.filter(p => p.featured).sort((a,b) => Number(b.slug === 'wedding-invitation') - Number(a.slug === 'wedding-invitation')).slice(0,3) : projects;
            host.innerHTML = items.map(projectCard).join('');
        }
        after();
    } catch (error) {
        host.replaceChildren();
        const message = document.createElement('p'); message.setAttribute('role','alert'); message.textContent = error instanceof Error ? error.message : 'Could not load projects.';
        const retry = document.createElement('button'); retry.className = 'btn'; retry.textContent = 'Retry'; retry.onclick = () => { void hydrateProjects(host, kind, after); };
        host.append(message, retry);
    } finally { host.removeAttribute('aria-busy'); }
}
