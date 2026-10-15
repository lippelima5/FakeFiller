import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaults } from '../types';
import { menuDefinitions } from '../menus';

describe('service worker routing', () => {
  let installed: () => Promise<void>;
  let clicked: (info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab) => void;
  const send = vi.fn(async () => ({ filled: 1, skipped: 0, rejected: 0, values: ['qa'] }));
  const create = vi.fn();
  const execute = vi.fn(async () => []);

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('chrome', {
      contextMenus: {
        removeAll: vi.fn(async () => undefined),
        create,
        onClicked: {
          addListener: (fn: typeof clicked) => {
            clicked = fn;
          },
        },
      },
      runtime: {
        onInstalled: {
          addListener: (fn: typeof installed) => {
            installed = fn;
          },
        },
        onStartup: { addListener: vi.fn() },
        onMessage: { addListener: vi.fn() },
      },
      storage: {
        local: {
          get: vi.fn(async () => ({
            settings: {
              ...defaults,
              mode: 'custom',
              rules: [{ selector: '#client', generator: 'cpf' }],
            },
          })),
        },
        session: { set: vi.fn(async () => undefined), remove: vi.fn(async () => undefined) },
      },
      tabs: { sendMessage: send, onRemoved: { addListener: vi.fn() } },
      scripting: { executeScript: execute },
      action: {
        setBadgeText: vi.fn(async () => undefined),
        setTitle: vi.fn(async () => undefined),
      },
      commands: { onCommand: { addListener: vi.fn() } },
    });
    await import('../background');
  });

  it('registers the complete menu tree on installation', async () => {
    installed();
    await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(menuDefinitions().length));
    expect(create.mock.calls.map(([item]) => item)).toEqual(menuDefinitions());
  });

  it('routes Generate to the clicked tab and exact child frame, retaining selector rules', async () => {
    clicked(
      { menuItemId: 'generate:cns', frameId: 17 } as chrome.contextMenus.OnClickData,
      { id: 42 } as chrome.tabs.Tab,
    );
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        scope: 'input',
        action: 'generate',
        kind: 'cns',
        target: 'context',
        settings: expect.objectContaining({ rules: [{ selector: '#client', generator: 'cpf' }] }),
      }),
      { frameId: 17 },
    );
  });

  it('ignores submenu headings and unknown IDs', async () => {
    clicked(
      { menuItemId: 'generate' } as chrome.contextMenus.OnClickData,
      { id: 42 } as chrome.tabs.Tab,
    );
    clicked(
      { menuItemId: 'generate:invalid' } as chrome.contextMenus.OnClickData,
      { id: 42 } as chrome.tabs.Tab,
    );
    expect(send).not.toHaveBeenCalled();
  });
});
