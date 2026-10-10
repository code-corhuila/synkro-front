import { describe, expect, it } from 'vitest';
import { parseRules } from './cssRules';
import { parsePublishedSheet, readSourceFiles, readThemeFile } from './tokenSheet';

const published = parsePublishedSheet(readThemeFile('tokens.css'));
const sources = readSourceFiles();

const isTestFile = (path: string) => /\.test\.tsx?$/.test(path);
const hostStylesheets = [...sources].filter(([path]) => path.endsWith('.css') && !path.startsWith('theme/'));
const hostComponents = [...sources].filter(([path]) => path.endsWith('.tsx') && !isTestFile(path));

// Custom properties and colours that the starter template (the Vite scaffold
// this host began from) defined. None may survive in the host.
const STARTER_PROPERTY = /--(?:accent(?:-bg|-border)?|text|text-h|bg|border|code-bg|social-bg|shadow|sans|heading|mono)(?![\w-])/;
const STARTER_COLOUR = /#aa3bff|#c084fc|#08060d|#6b6375|#f4f3ec|#16171d|#9ca3af|#f3f4f6|#2e303a|#1f2028|rgba\(170, 59, 255|rgba\(192, 132, 252/;

// Properties whose value is a colour, and a literal colour written in a value.
const COLOUR_PROPERTY = /color|background|border|outline|shadow|fill|stroke|caret/i;
const LITERAL_COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(|\b(?:white|black|red|green|blue|gray|grey)\b/i;

// The classes the host's own screens (header, navigation, not-found page,
// unavailable notice) must use, and that a host stylesheet must define.
const SCREEN_CLASSES = ['shell-header', 'shell-nav', 'page', 'portal-notice'];

// A selector that starts with one of these elements styles it everywhere in the
// page, portals included. Portals render inside the host's <main class="page">.
const BARE_ELEMENT = /^(?:h1|h2|p|code)(?![\w-])/;
const FROM_PAGE = /\.page\s+(?:h1|h2|p|code)(?![\w-])/;

function selectorsMatching(pattern: RegExp): string[] {
  return hostStylesheets.flatMap(([path, css]) =>
    parseRules(css).flatMap((rule) =>
      rule.selectors.filter((selector) => pattern.test(selector)).map((selector) => `${path}: ${selector}`)
    )
  );
}

function cssDeclarations(css: string): Array<[string, string]> {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...withoutComments.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/gi)].map(([, property, value]) => [
    property,
    value.trim(),
  ]);
}

describe('host styles', () => {
  it('reads the host stylesheets and screens it is about to check', () => {
    expect(hostStylesheets.length).toBeGreaterThan(0);
    expect(hostComponents.length).toBeGreaterThan(0);
    expect(hostStylesheets.flatMap(([, css]) => cssDeclarations(css)).length).toBeGreaterThan(0);
  });

  it('keeps no starter-template custom property or colour in the host', () => {
    const leftovers = [...sources]
      .filter(([path]) => !isTestFile(path))
      .flatMap(([path, text]) => {
        const matches = [...text.matchAll(new RegExp(`${STARTER_PROPERTY.source}|${STARTER_COLOUR.source}`, 'g'))];
        return matches.map(([match]) => `${path}: ${match}`);
      });

    expect(leftovers).toEqual([]);
  });

  it('writes every host colour as a published token, never as a literal', () => {
    const problems = hostStylesheets.flatMap(([path, css]) =>
      cssDeclarations(css).flatMap(([property, value]) => {
        const found: string[] = [];
        if (COLOUR_PROPERTY.test(property) && LITERAL_COLOUR.test(value)) {
          found.push(`${path}: ${property}: ${value}`);
        }
        for (const [, name] of value.matchAll(/var\((--[\w-]+)/g)) {
          if (!published.light.has(name)) found.push(`${path}: ${name} is not a published token`);
        }
        return found;
      })
    );

    expect(problems).toEqual([]);
  });

  it('styles each class the host screens use, and uses the screen classes', () => {
    const usedClasses = new Set(
      hostComponents.flatMap(([, text]) =>
        [...text.matchAll(/className="([^"]+)"/g)].flatMap(([, names]) => names.split(/\s+/))
      )
    );
    const stylesheetText = hostStylesheets.map(([, css]) => css).join('\n');
    const unstyled = [...usedClasses].filter((name) => !new RegExp(`\\.${name}(?![\\w-])`).test(stylesheetText));

    expect(unstyled).toEqual([]);
    expect([...usedClasses]).toEqual(expect.arrayContaining(SCREEN_CLASSES));
  });

  it('scopes host typography to host-owned classes, never to bare h1, h2, p or code', () => {
    expect(selectorsMatching(BARE_ELEMENT)).toEqual([]);
  });

  it('does not style headings or text by descent from .page, which holds portal content', () => {
    expect(selectorsMatching(FROM_PAGE)).toEqual([]);
  });
});
