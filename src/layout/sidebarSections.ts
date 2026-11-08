import { copy } from './copy';
import { navItemsFor, type NavItem } from './navigation';

export interface NavSection {
  label: string;
  items: NavItem[];
}

// The role's menu items, grouped by section. The access matrix stays in
// navigation.ts; this only decides how the allowed items are laid out. A
// section with nothing for the role is dropped, and an allowed item no section
// lists is kept under the first section's label, so it never disappears.
export function navSectionsFor(role: string | undefined): NavSection[] {
  const allowed = navItemsFor(role);
  const placed = new Set<string>();
  const sections = copy.sections
    .map((section) => ({
      label: section.label,
      items: section.paths.flatMap((path) => allowed.filter((item) => item.path === path)),
    }))
    .filter((section) => section.items.length > 0);
  for (const section of sections) for (const item of section.items) placed.add(item.path);
  const rest = allowed.filter((item) => !placed.has(item.path));
  return rest.length > 0 ? [...sections, { label: copy.sections[0].label, items: rest }] : sections;
}
