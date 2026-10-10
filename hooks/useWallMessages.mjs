import { getWallMessages } from '../services/api.mjs';
/** @param {(state: WallState) => void} notify */
export function useWallMessages(notify) {
    /** @type {WallState} */ const state = { sort: 'new', items: [], total: 0, nextOffset: 0, busy: false, error: '' };
    let version = 0;
    /** @param {boolean} reset */
    async function load(reset) { if (state.busy && !reset)
        return; const token = ++version; state.busy = true; state.error = ''; if (reset) {
        state.items = [];
        state.nextOffset = 0;
    } notify(state); try {
        const result = await getWallMessages({ sort: state.sort, offset: state.nextOffset, limit: 6 });
        if (token !== version)
            return;
        state.items = reset ? result.items : state.items.concat(result.items);
        state.total = result.total;
        state.nextOffset = result.nextOffset;
    }
    catch (error) {
        if (token !== version)
            return;
        state.error = error instanceof Error ? error.message : 'The wall could not load. Please try again.';
    }
    finally {
        if (token === version) {
            state.busy = false;
            notify(state);
        }
    } }
    return { state, load,
        /** @param {'new'|'top'} sort */
        sort(sort) { state.sort = sort; void load(true); }
    };
}
/** @typedef {{sort:'new'|'top',items:import('../types/index').WallMessage[],total:number,nextOffset:number,busy:boolean,error:string}} WallState */
