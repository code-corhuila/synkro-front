import { describe, it, expect } from 'vitest';
import { defaultPathFor } from './navigation';

// navigation-map.md, "Default landing route per role — target design".
describe('defaultPathFor', () => {
  it.each(['ADMIN', 'SALESPERSON', 'INVENTORY'])('lands %s on /dashboard', (role) => {
    expect(defaultPathFor(role)).toBe('/dashboard');
  });
});
