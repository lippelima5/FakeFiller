import { defaults, kinds, type Settings, type Rule } from './types';
export function validateRules(value: unknown): Rule[] {
  if (!Array.isArray(value) || value.length > 100)
    throw new Error('Use uma lista com até 100 regras.');
  for (const r of value) {
    if (
      !r ||
      typeof r !== 'object' ||
      (!r.selector && !r.kind) ||
      !kinds.includes(r.generator) ||
      (r.kind && !kinds.includes(r.kind)) ||
      (r.value !== undefined && (typeof r.value !== 'string' || r.value.length > 10000))
    )
      throw new Error('Cada regra precisa de selector ou kind e um generator válido.');
    if (r.selector) {
      if (typeof r.selector !== 'string' || r.selector.length > 500)
        throw new Error('Seletor inválido.');
      if (typeof document !== 'undefined')
        document.createDocumentFragment().querySelector(r.selector);
    }
  }
  return value as Rule[];
}
export async function loadSettings(): Promise<Settings> {
  const { settings } = await chrome.storage.local.get('settings');
  const s: Settings = {
    ...defaults,
    ...(settings && typeof settings === 'object' ? settings : {}),
  };
  if (!['smart', 'random', 'custom'].includes(s.mode)) s.mode = 'smart';
  if (!['light', 'dark', 'system'].includes(s.theme)) s.theme = 'system';
  try {
    s.rules = validateRules(s.rules);
  } catch {
    s.rules = [];
  }
  return s;
}
