import { apiConfig } from '../services/api.mjs';
import { useInView } from '../hooks/useInView.mjs';
import { toast } from '../components/ui/toast.mjs';
export function mount() { const label = document.querySelector('.demo-label'); if (label && apiConfig.mode === 'live') label.textContent = 'Public wall · Messages are stored on the server and moderated.'; const visual = document.getElementById('visualHost'); if (visual)
    useInView(visual, async () => { try {
        (await import('../components/visual/canvas.mjs')).mount(visual);
    }
    catch { /* Static visual remains available. */ } }); const wall = document.getElementById('wallHost'); if (wall)
    useInView(wall, async () => { try {
        (await import('../components/freedom-wall/wall.mjs')).mount(wall);
    }
    catch {
        wall.textContent = 'The wall could not load.';
        const retry = document.createElement('button');
        retry.className = 'btn';
        retry.textContent = 'Retry';
        retry.onclick = () => location.reload();
        wall.append(retry);
        toast('Please retry loading the demo wall.');
    } }); }
