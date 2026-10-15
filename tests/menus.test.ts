import { describe, it, expect } from 'vitest';
import { menuDefinitions } from '../menus';
import { kinds, labels, defaults } from '../types';
describe('context menu', () => {
  it('offers all six actions and Generate → every supported type on editable fields', () => {
    const menus = menuDefinitions();
    for (const id of ['all', 'form', 'input', 'random', 'regenerate', 'copy'])
      expect(menus.find((m) => m.id === id)?.parentId).toBe('ff-dev');
    expect(menus.find((m) => m.id === 'generate')?.title).toBe('Generate');
    for (const kind of kinds)
      expect(menus.find((m) => m.id === `generate:${kind}`)).toEqual({
        id: `generate:${kind}`,
        title: labels[kind],
        parentId: 'generate',
        contexts: ['editable'],
      });
    expect(new Set(menus.map((m) => m.id)).size).toBe(menus.length);
  });
  it('preserves values for explicit generators by default', () => {
    expect(defaults.overwrite).toBe(false);
  });
});
