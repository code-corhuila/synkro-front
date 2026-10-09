import { describe, it, expect } from 'vitest';
import { federationConfig } from './federation.config';

describe('host federation config', () => {
  it('is named host and serves remoteEntry.js', () => {
    expect(federationConfig.name).toBe('host');
    expect(federationConfig.filename).toBe('remoteEntry.js');
  });

  it('exposes exactly ./apiClient and ./session', () => {
    expect(federationConfig.exposes).toEqual({
      './apiClient': './src/shell/apiClient.ts',
      './session': './src/shell/session.ts',
    });
  });

  it('keeps consuming the three React portals, productsPortal included', () => {
    expect(Object.keys(federationConfig.remotes).sort()).toEqual(['authPortal', 'productsPortal', 'salesPortal']);
    expect(federationConfig.remotes.productsPortal).toBe('http://localhost:5175/assets/remoteEntry.js');
  });

  it('keeps sharing react and react-dom', () => {
    expect(federationConfig.shared).toEqual(['react', 'react-dom']);
  });
});
