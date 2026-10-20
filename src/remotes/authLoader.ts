type RemoteConfig = {
    url: () => Promise<string>;
    format: 'esm';
    from: 'vite';
};
export function createAuthLoader(load: () => Promise<unknown>, reset: (name: string, config: RemoteConfig) => void, entry: string) {
    let failed = false;
    let recovery = 0;
    return async () => {
        if (failed) {
            const separator = entry.includes('?') ? '&' : '?';
            const url = `${entry}${separator}recovery=${++recovery}`;
            reset('authPortal', { url: async () => url, format: 'esm', from: 'vite' });
            failed = false;
        }
        try {
            return await load();
        }
        catch (error) {
            failed = true;
            throw error;
        }
    };
}
