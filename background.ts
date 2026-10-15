import { loadSettings } from './settings';
import { kinds, type Action, type Kind, type Scope } from './types';
import { menuDefinitions } from './menus';
async function setup() {
  await chrome.contextMenus.removeAll();
  for (const item of menuDefinitions()) chrome.contextMenus.create(item);
}
chrome.runtime.onInstalled.addListener(() => {
  void setup();
});
chrome.runtime.onStartup.addListener(() => {
  void setup();
});
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.channel === 'ff-focus' && sender.tab?.id)
    void chrome.storage.session.set({
      [`focus:${sender.tab.id}`]: { frameId: sender.frameId ?? 0 },
    });
});
chrome.tabs.onRemoved.addListener((tabId) => {
  void chrome.storage.session.remove(`focus:${tabId}`);
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  void (async () => {
    if (!tab?.id) return;
    const id = String(info.menuItemId);
    const kind = id.startsWith('generate:') ? (id.slice(9) as Kind) : undefined;
    if (
      !['all', 'form', 'input', 'random', 'regenerate', 'copy'].includes(id) &&
      (!kind || !kinds.includes(kind))
    )
      return;
    const scope: Scope = id === 'all' ? 'all' : id === 'form' ? 'form' : 'input';
    const action: Action = kind
      ? 'generate'
      : ['random', 'regenerate', 'copy'].includes(id)
        ? (id as Action)
        : 'fill';
    try {
      const settings = await loadSettings();
      const result = await chrome.tabs.sendMessage(
        tab.id,
        { channel: 'fake-filler-dev', scope, action, kind, settings, target: 'context' },
        { frameId: info.frameId ?? 0 },
      );
      await chrome.action.setBadgeText({
        tabId: tab.id,
        text: result.error ? '!' : String(result.filled),
      });
      await chrome.action.setTitle({
        tabId: tab.id,
        title: result.error || `${result.filled} preenchidos; ${result.rejected} incompatíveis`,
      });
      if (action === 'copy' && result.values?.length) {
        // Clipboard API runs in the clicked document under clipboardWrite permission.
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, frameIds: [info.frameId ?? 0] },
          func: async (value: string) => {
            await navigator.clipboard.writeText(value);
          },
          args: [result.values.join('\n')],
        });
      }
    } catch {
      await chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
      await chrome.action.setTitle({
        tabId: tab.id,
        title: 'Recarregue a página. Páginas internas do Chrome não permitem preenchimento.',
      });
    }
  })();
});
chrome.commands.onCommand.addListener((_command, tab) => {
  if (tab?.id)
    void loadSettings()
      .then((settings) =>
        chrome.tabs.sendMessage(tab.id!, {
          channel: 'fake-filler-dev',
          scope: 'all',
          action: 'fill',
          settings,
        }),
      )
      .catch(() => undefined);
});
