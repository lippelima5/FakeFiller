import { generate, profile } from './generators';
import { loadSettings, validateRules } from './settings';
import { kinds, labels, type Action, type Kind, type Result, type Scope } from './types';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const settings = await loadSettings();
let scope: Scope = 'all';
const status = (text: string, error = false) => {
  $('status').textContent = text;
  $('status').classList.toggle('error', error);
};
const persist = () => chrome.storage.local.set({ settings });
function render() {
  document.documentElement.dataset.theme = settings.theme;
  $('theme').title = `Tema: ${settings.theme}. Clique para alternar.`;
  document
    .querySelectorAll<HTMLButtonElement>('[data-mode]')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === settings.mode)));
  document
    .querySelectorAll<HTMLButtonElement>('[data-scope]')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scope === scope)));
  $('mode-help').textContent =
    settings.mode === 'smart'
      ? 'Reconhece os campos e mantém os dados relacionados.'
      : settings.mode === 'random'
        ? 'Dados aleatórios respeitando o tipo HTML do campo.'
        : 'Suas regras primeiro. Smart completa o restante.';
  $<HTMLInputElement>('formatted').checked = settings.formatted;
  $<HTMLInputElement>('overwrite').checked = settings.overwrite;
}
for (const kind of kinds) {
  const o = document.createElement('option');
  o.value = kind;
  o.textContent = labels[kind];
  $('kind').append(o);
}
$<HTMLSelectElement>('kind').value = 'cpf';
$<HTMLTextAreaElement>('rules').value = JSON.stringify(settings.rules, null, 2);
const newValue = () => {
  $<HTMLInputElement>('value').value = generate(
    $<HTMLSelectElement>('kind').value as Kind,
    profile(),
    settings.formatted,
  );
};
render();
newValue();
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(
  (b) =>
    (b.onclick = () => {
      settings.mode = b.dataset.mode as typeof settings.mode;
      render();
      void persist();
      if (settings.mode === 'custom') $<HTMLDetailsElement>('settings').open = true;
    }),
);
document.querySelectorAll<HTMLButtonElement>('[data-scope]').forEach(
  (b) =>
    (b.onclick = () => {
      scope = b.dataset.scope as Scope;
      render();
    }),
);
$('theme').onclick = () => {
  settings.theme =
    settings.theme === 'system' ? 'dark' : settings.theme === 'dark' ? 'light' : 'system';
  render();
  void persist();
};
$('generate').onclick = newValue;
$('kind').onchange = newValue;
$('formatted').onchange = () => {
  settings.formatted = $<HTMLInputElement>('formatted').checked;
  void persist();
  newValue();
};
$('overwrite').onchange = () => {
  settings.overwrite = $<HTMLInputElement>('overwrite').checked;
  void persist();
};
$('save').onclick = () => {
  try {
    settings.rules = validateRules(JSON.parse($<HTMLTextAreaElement>('rules').value));
    void persist();
    status('Preferências e regras salvas.');
  } catch (e) {
    status(e instanceof Error ? e.message : String(e), true);
  }
};
$('copy-value').onclick = () => {
  void navigator.clipboard
    .writeText($<HTMLInputElement>('value').value)
    .then(() => status('Valor copiado.'))
    .catch(() => status('Não foi possível copiar. Selecione e copie o valor manualmente.', true));
};
async function execute(action: Action) {
  const controls = ['fill', 'random', 'regenerate', 'copy-fields'].map((id) =>
    $<HTMLButtonElement>(id),
  );
  controls.forEach((b) => (b.disabled = true));
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:|^file:/.test(tab.url || ''))
      throw new Error('Abra uma página de formulário. Páginas internas do Chrome são protegidas.');
    const tabId = tab.id;
    let frameIds = [0];
    if (scope === 'all') {
      const frames = await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: () => true,
      });
      frameIds = frames.map((f) => f.frameId);
    } else {
      const stored = await chrome.storage.session.get(`focus:${tabId}`);
      const focus = stored[`focus:${tabId}`] as { frameId?: number } | undefined;
      frameIds = [focus?.frameId ?? 0];
    }
    const results = await Promise.all(
      frameIds.map(async (frameId) => {
        try {
          return (await chrome.tabs.sendMessage(
            tabId,
            { channel: 'fake-filler-dev', scope, action, settings, target: 'focus' },
            { frameId },
          )) as Result;
        } catch {
          return {
            filled: 0,
            skipped: 0,
            rejected: 0,
            values: [],
            error: 'Recarregue a página para ativar a extensão.',
          } satisfies Result;
        }
      }),
    );
    const good = results.filter((r): r is Result => !!r && !r.error);
    if (!good.length)
      throw new Error(
        results.find((r) => r?.error)?.error || 'Selecione um campo na página primeiro.',
      );
    if (action === 'copy') {
      const values = good.flatMap((r) => r.values);
      if (!values.length) throw new Error('Não há valores no escopo selecionado.');
      await navigator.clipboard.writeText(values.join('\n'));
      status(`${values.length} valores copiados.`);
      return;
    }
    const sum = (key: 'filled' | 'skipped' | 'rejected') => good.reduce((n, r) => n + r[key], 0);
    status(
      `${sum('filled')} preenchidos · ${sum('skipped')} preservados · ${sum('rejected')} incompatíveis${good.length < results.length ? ' · alguns frames inacessíveis' : ''}.`,
    );
  } catch (e) {
    status(e instanceof Error ? e.message : String(e), true);
  } finally {
    controls.forEach((b) => (b.disabled = false));
  }
}
$('fill').onclick = () => {
  void execute('fill');
};
$('random').onclick = () => {
  void execute('random');
};
$('regenerate').onclick = () => {
  void execute('regenerate');
};
$('copy-fields').onclick = () => {
  void execute('copy');
};
