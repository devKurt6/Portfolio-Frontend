/** @param {HTMLElement} host */
export function mount(host) {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Simulated computer-vision pipeline: detection confidence and processing load over time.');
    host.querySelector('.canvas-placeholder')?.replaceWith(canvas);
    const context = canvas.getContext('2d');
    if (!context)
        return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let time = 0, frame = 0, visible = true;
    function draw() { if (!context)
        return; const ratio = Math.min(devicePixelRatio || 1, 2); const width = canvas.width = Math.round(canvas.clientWidth * ratio), height = canvas.height = Math.round(canvas.clientHeight * ratio); const css = getComputedStyle(document.documentElement); context.clearRect(0, 0, width, height); context.strokeStyle = css.getPropertyValue('--border').trim(); context.lineWidth = ratio * .6; for (let x = 0; x < width; x += width / 12) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
    } for (let y = 0; y < height; y += height / 6) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
    } for (const [index, color] of ['--accent', '--teal'].entries()) {
        context.strokeStyle = css.getPropertyValue(color).trim();
        context.lineWidth = 2 * ratio;
        context.beginPath();
        for (let x = 0; x <= width; x += 2) {
            const u = x / width * 9 + time;
            const y = index === 0 ? height * .33 + Math.sin(u) * height * .10 + Math.sin(u * 2.7) * height * .035 : height * .74 + Math.sin(u * .65) * height * .08 + Math.sin(u * 2) * height * .025;
            x ? context.lineTo(x, y) : context.moveTo(x, y);
        }
        context.stroke();
    } context.fillStyle = css.getPropertyValue('--muted').trim(); context.font = `${11 * ratio}px monospace`; context.fillText('YOLO · edge inference · simulated telemetry', 16 * ratio, height - 15 * ratio); }
    function loop() { draw(); time += .025; if (visible && !document.hidden && !reduced.matches)
        frame = requestAnimationFrame(loop); }
    function restart() { cancelAnimationFrame(frame); draw(); if (visible && !document.hidden && !reduced.matches)
        frame = requestAnimationFrame(loop); }
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; restart(); });
    observer.observe(canvas);
    new ResizeObserver(restart).observe(canvas);
    window.addEventListener('themechange', restart);
    document.addEventListener('visibilitychange', restart);
    reduced.addEventListener('change', restart);
    window.addEventListener('pagehide', event => { cancelAnimationFrame(frame); if(!event.persisted)observer.disconnect(); });
    window.addEventListener('pageshow', event => { if(event.persisted)restart(); });
    restart();
}
