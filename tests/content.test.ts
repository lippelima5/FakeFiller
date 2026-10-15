// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('content script focus notifications', () => {
  const send = vi.fn<() => Promise<unknown>>();
  let runtime: {
    id?: string;
    sendMessage: typeof send;
    onMessage: { addListener: ReturnType<typeof vi.fn> };
  };

  beforeEach(async () => {
    vi.resetModules();
    send.mockReset().mockResolvedValue(undefined);
    runtime = { id: 'fake-filler-dev', sendMessage: send, onMessage: { addListener: vi.fn() } };
    vi.stubGlobal('chrome', { runtime });
    document.body.innerHTML = '<input id="field">';
    await import('../content');
  });

  afterEach(() => {
    // Invalidate the instance so its document listeners cannot leak into another test.
    runtime.id = undefined;
    document.querySelector('input')!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    vi.unstubAllGlobals();
  });

  const focus = () =>
    document.querySelector('input')!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

  it('notifies the background while the extension is available', async () => {
    focus();
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ channel: 'ff-focus' }));
  });

  it('handles a synchronous context invalidation and removes stale listeners', async () => {
    send.mockImplementation(() => {
      throw new Error('Extension context invalidated.');
    });
    expect(focus).not.toThrow();
    await Promise.resolve();
    focus();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('handles a rejected invalidation without an unhandled rejection', async () => {
    send.mockRejectedValue(new Error('Extension context invalidated.'));
    focus();
    await Promise.resolve();
    focus();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('does not call Chrome APIs once runtime.id is unavailable', () => {
    runtime.id = undefined;
    focus();
    expect(send).not.toHaveBeenCalled();
  });

  it('can retry a transient receiver failure on the next focus', async () => {
    send.mockRejectedValueOnce(
      new Error('Could not establish connection. Receiving end does not exist.'),
    );
    focus();
    await Promise.resolve();
    focus();
    expect(send).toHaveBeenCalledTimes(2);
  });
});
