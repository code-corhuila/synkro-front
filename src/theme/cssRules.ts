// Test-only parser for the host's own stylesheets: plain rules and one level
// of @media nesting, which is all they use. It lets a test ask which selectors
// a stylesheet styles and under which media condition.

export interface CssRule {
  // The @media condition the rule sits in, or null for a top-level rule.
  media: string | null;
  selectors: string[];
  declarations: Array<[property: string, value: string]>;
}

const COMMENT = /\/\*[\s\S]*?\*\//g;

function declarationsOf(body: string): CssRule['declarations'] {
  return [...body.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);?/gi)].map(([, property, value]) => [property, value.trim()]);
}

export function parseRules(css: string): CssRule[] {
  const rules: CssRule[] = [];

  const walk = (text: string, media: string | null) => {
    let position = 0;
    while (position < text.length) {
      const open = text.indexOf('{', position);
      if (open === -1) return;
      let depth = 1;
      let close = open + 1;
      while (close < text.length && depth > 0) {
        if (text[close] === '{') depth++;
        if (text[close] === '}') depth--;
        close++;
      }
      const prelude = text.slice(position, open).trim();
      const body = text.slice(open + 1, close - 1);
      if (prelude.startsWith('@media')) {
        walk(body, prelude.slice('@media'.length).trim());
      } else {
        rules.push({
          media,
          selectors: prelude.split(',').map((selector) => selector.trim()),
          declarations: declarationsOf(body),
        });
      }
      position = close;
    }
  };

  walk(css.replace(COMMENT, ''), null);
  return rules;
}
