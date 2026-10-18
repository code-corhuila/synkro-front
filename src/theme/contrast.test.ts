import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';

describe('contrastRatio', () => {
  it('gives 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('gives 1:1 for a colour on itself', () => {
    expect(contrastRatio('#B51A28', '#B51A28')).toBeCloseTo(1, 5);
  });

  it('does not depend on which colour is the foreground', () => {
    expect(contrastRatio('#7C645E', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#7C645E'), 10);
  });

  it('matches the well-known 4.54:1 of #767676 on white', () => {
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
  });

  it('reads three-digit hex the same as six-digit hex', () => {
    expect(contrastRatio('#FFF', '#161E2F')).toBeCloseTo(contrastRatio('#FFFFFF', '#161E2F'), 10);
  });

  it('rejects anything that is not an opaque hex colour', () => {
    expect(() => contrastRatio('rgba(0, 0, 0, 0.5)', '#FFFFFF')).toThrow(/opaque hex/);
  });
});
