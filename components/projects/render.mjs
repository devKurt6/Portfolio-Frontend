import { escapeHTML as e } from '../../lib/text.mjs';
/** @param {import('../../types/index').Project} p */
export function projectCard(p) {
    return `<article class="project-card" data-category="${e(p.category)}" data-search="${e([p.title, p.description, ...p.tags].join(' ').toLowerCase())}">
    <a class="project-image" href="/projects/${p.slug}/" tabindex="-1" aria-hidden="true"><img src="${e(p.image)}" width="640" height="360" loading="lazy" alt="${e(p.title)}"></a>
    <div class="project-info"><span class="category">${e(p.category)}</span><h3><a href="/projects/${p.slug}/">${e(p.title)}</a></h3><p>${e(p.description)}</p><div class="tags">${p.tags.map(t => `<span class="tag">${e(t)}</span>`).join('')}</div><a class="project-more" href="/projects/${p.slug}/" aria-label="Explore ${e(p.title)}">Explore project <span aria-hidden="true">↗</span></a></div></article>`;
}
/** @param {number} count */
export function skeletonCards(count) { return Array.from({ length: count }, () => '<div class="card skeleton-card" aria-hidden="true"><div class="skeleton" style="aspect-ratio:16/9"></div><div class="card-body"><div class="skeleton" style="height:20px"></div><div class="skeleton" style="height:50px;margin-top:12px"></div></div></div>').join(''); }
