function onXampp() {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
}

export function pipefyEndpoint() {
    return onXampp() ? '/kloweekpipefy/proxy.php' : '/api/proxy';
}

export function sheetsEndpoint() {
    return onXampp() ? '/kloweekpipefy/sheets-proxy.php' : '/api/sheets-proxy';
}