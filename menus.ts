import { kinds, labels } from './types';
export const menuItems = [
  ['all', 'All Inputs · preencher página'],
  ['form', 'This Form · preencher formulário'],
  ['input', 'This Input · preencher campo'],
  ['random', 'Random · dados aleatórios'],
  ['regenerate', 'Regenerate · substituir valores'],
  ['copy', 'Copy · copiar valor do campo'],
] as const;
type MenuContexts = ['page' | 'editable', ...('page' | 'editable')[]];
export interface MenuDefinition {
  id: string;
  title: string;
  parentId?: string;
  contexts: MenuContexts;
}
export function menuDefinitions(): MenuDefinition[] {
  return [
    { id: 'ff-dev', title: 'Fake Filler Dev', contexts: ['page', 'editable'] },
    ...menuItems.map(([id, title]) => ({
      id,
      title,
      parentId: 'ff-dev',
      contexts: ['page', 'editable'] as MenuContexts,
    })),
    { id: 'generate', title: 'Generate', parentId: 'ff-dev', contexts: ['editable'] },
    ...kinds.map((kind) => ({
      id: `generate:${kind}`,
      title: labels[kind],
      parentId: 'generate',
      contexts: ['editable'] as MenuContexts,
    })),
  ];
}
