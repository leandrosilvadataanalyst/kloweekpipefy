import { apiBase } from './api-base.js';

function onXampp() {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
}

export async function fetchDashboardFromSupabase(months = 3) {
    const base = onXampp() ? '/kloweekpipefy' : '/api';
    const resp = await fetch(`${base}/dashboard?months=${months}`, { cache: 'no-store' });
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
    }
    return await resp.json();
}

export async function syncPipefyToSupabase() {
    const base = onXampp() ? '/kloweekpipefy' : '/api';
    const resp = await fetch(`${base}/sync-pipefy?secret=kloweek-sync`, {
        method: 'POST',
        cache: 'no-store'
    });
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
    }
    return await resp.json();
}
