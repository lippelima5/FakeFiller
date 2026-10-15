// Test adapter only. Never bundled into the extension. Regular web pages
// do not expose Chrome extension APIs; all actual field writes use runFill.
import { runFill } from '../../fill';
import { defaults, type Request } from '../../types';
import { menuDefinitions } from '../../menus';
const params = new URLSearchParams(location.search);
if (params.has('fixture')) {
  let target: Element | null = null;
  document.addEventListener(
    'focusin',
    (e) => {
      target = e.composedPath().find((x) => x instanceof Element) as Element;
    },
    true,
  );
  document.addEventListener(
    'contextmenu',
    (e) => {
      target = e.composedPath().find((x) => x instanceof Element) as Element;
    },
    true,
  );
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || e.source !== parent || e.data?.type !== 'qa-fill') return;
    const result = runFill(e.data.request as Request, target);
    e.ports[0]?.postMessage(result);
  });
} else if (params.has('popup')) {
  const ask = (request: Request) =>
    new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (e) => resolve(e.data);
      parent.postMessage({ type: 'qa-dispatch', request }, location.origin, [channel.port2]);
    });
  const api = {
    storage: {
      local: {
        get: async () => ({
          settings: JSON.parse(localStorage.getItem('qa-settings') || 'null') || defaults,
        }),
        set: async ({ settings }: { settings: unknown }) => {
          localStorage.setItem('qa-settings', JSON.stringify(settings));
        },
      },
      session: { get: async () => ({}) },
    },
    tabs: {
      query: async () => [{ id: 1, url: location.origin + '/' }],
      sendMessage: async (_id: number, request: Request) => ask(request),
    },
    scripting: { executeScript: async () => [{ frameId: 0 }] },
  };
  Object.defineProperty(window, 'chrome', { value: api, configurable: true });
} else {
  const fixture = document.querySelector<HTMLIFrameElement>('#fixture')!;
  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.data?.type !== 'qa-dispatch') return;
    fixture.contentWindow?.postMessage(
      { type: 'qa-fill', request: event.data.request },
      location.origin,
      [...event.ports],
    );
  });
  const select = document.querySelector<HTMLSelectElement>('#menu-kind')!;
  for (const item of menuDefinitions().filter((m) => m.parentId === 'generate')) {
    const o = document.createElement('option');
    o.value = item.id.slice(9);
    o.textContent = item.title;
    select.append(o);
  }
  document.querySelector('#menu-generate')!.addEventListener('click', () => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      document.querySelector('#menu-status')!.textContent = JSON.stringify(event.data);
    };
    const request = {
      channel: 'fake-filler-dev',
      scope: 'input',
      action: 'generate',
      kind: select.value,
      settings: defaults,
      target: 'context',
    };
    fixture.contentWindow?.postMessage({ type: 'qa-fill', request }, location.origin, [
      channel.port2,
    ]);
  });
}
