/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The interface is in Spanish, so assistive technology must read it as Spanish.
describe('index.html', () => {
  it('declares the page language as Spanish', () => {
    const html = readFileSync('index.html', 'utf8');

    expect(html).toMatch(/<html[^>]*\slang="es"/);
  });
});
