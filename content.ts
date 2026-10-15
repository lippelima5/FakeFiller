import { runFill } from './fill';
import type { Request } from './types';
let clicked: Element | null = null,
  focused: Element | null = null;
function rememberContext(event: Event) {
  clicked = (event.composedPath().find((x) => x instanceof Element) as Element) || null;
}
function detach() {
  document.removeEventListener('contextmenu', rememberContext, true);
  document.removeEventListener('focusin', rememberFocus, true);
  clicked = focused = null;
}
async function notifyFocus() {
  try {
    if (!chrome.runtime?.id) {
      detach();
      return;
    }
    // An invalidated extension context can throw before returning a Promise.
    await chrome.runtime.sendMessage({ channel: 'ff-focus' });
  } catch (error) {
    if (/extension context invalidated/i.test(String(error))) detach();
    // Focus bookkeeping must never interrupt the host page. A transient
    // disconnected receiver can be retried on the next focus event.
  }
}
function rememberFocus(event: Event) {
  focused = (event.composedPath().find((x) => x instanceof Element) as Element) || null;
  void notifyFocus();
}
document.addEventListener('contextmenu', rememberContext, true);
document.addEventListener('focusin', rememberFocus, true);
chrome.runtime.onMessage.addListener((request: Request, _sender, reply) => {
  if (request?.channel !== 'fake-filler-dev') return;
  const target = request.target === 'context' ? clicked : focused;
  if (request.scope !== 'all' && !target) return;
  try {
    reply(runFill(request, target));
  } catch (error) {
    reply({ filled: 0, skipped: 0, rejected: 0, values: [], error: String(error) });
  }
});
