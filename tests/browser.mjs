import { chromium, expect } from '@playwright/test';
import puppeteer from 'puppeteer-core';
import { fixtureServer } from './server.mjs';
import { resolve } from 'node:path';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
const extension = resolve('dist');
const { server, url } = await fixtureServer();
await mkdir('.test-runtime', { recursive: true });
const profileDirectory = await mkdtemp(resolve('.test-runtime', 'chromium-'));
const context = await chromium.launchPersistentContext(profileDirectory, {
  channel: 'chromium',
  headless: false,
  viewport: { width: 1100, height: 850 },
  args: [
    `--disable-extensions-except=${extension}`,
    `--load-extension=${extension}`,
    '--remote-debugging-port=9333',
    '--enable-unsafe-extension-debugging',
  ],
});
try {
  const worker = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'));
  const id = new URL(worker.url()).host;
  const page = context.pages()[0] || (await context.newPage());
  await page.goto(url);
  const errors = [];
  context.on('weberror', (e) => errors.push(String(e.error())));
  const popupUrl = `chrome-extension://${id}/popup.html`;
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9333' });
  const browserSession = await browser.target().createCDPSession();
  async function fill(action = 'fill', scope = 'all', settings = {}) {
    return worker.evaluate(
      async ({ action, scope, settings, url }) => {
        const tabs = await chrome.tabs.query({});
        const tab = tabs.find((t) => t.url === url);
        return chrome.tabs.sendMessage(
          tab.id,
          {
            channel: 'fake-filler-dev',
            scope,
            action,
            settings: { mode: 'smart', formatted: true, overwrite: false, rules: [], ...settings },
            target: 'focus',
          },
          { frameId: 0 },
        );
      },
      { action, scope, settings, url: page.url() },
    );
  }
  async function popup() {
    await page.bringToFront();
    const { targetInfos } = await browserSession.send('Target.getTargets', {
      filter: [{ type: 'tab', exclude: false }, { exclude: true }],
    });
    const targetInfo = targetInfos.find((t) => t.url === page.url());
    const popupTarget = browser.waitForTarget((t) => t.url() === popupUrl, { timeout: 10000 });
    await browserSession.send('Extensions.triggerAction', { id, targetId: targetInfo.targetId });
    const p = await (await popupTarget).asPage();
    await p.waitForFunction(() => document.querySelector('#value')?.value);
    return p;
  }
  let p = await popup();
  expect(await p.$eval('h1', (e) => e.textContent)).toContain('Fake Filler');
  expect(await p.$eval('#value', (e) => e.value)).toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
  await p.click('#fill');
  await expect.poll(() => p.$eval('#status', (e) => e.textContent)).toContain('preenchidos');
  await expect(page.locator('#cpf')).toHaveValue(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
  await expect(page.locator('#cns')).toHaveValue(/^[12]\d{14}$/);
  await expect(page.locator('#cnpj')).toHaveValue(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
  await expect(page.locator('#keep')).toHaveValue('Não substituir');
  for (const field of ['disabled', 'readonly', 'hidden', 'invisible', 'file'])
    await expect(page.locator('#' + field)).toHaveValue('');
  await expect(page.locator('#email')).toHaveValue(
    await page.locator('#confirm-email').inputValue(),
  );
  await expect(page.locator('#password')).toHaveValue(
    await page.locator('#confirm-password').inputValue(),
  );
  await expect(page.locator('#full')).toHaveValue(
    (await page.locator('#first').inputValue()) + ' ' + (await page.locator('#last').inputValue()),
  );
  expect(await page.evaluate(() => window.submissions)).toBe(0);
  await expect(page.locator('#shadow-uuid')).toHaveValue(/^[a-f\d-]{36}$/);
  await expect(page.frameLocator('iframe').locator('#frame-email')).toHaveValue(/@example\.test$/);
  await p.click('#copy-value');
  await expect.poll(() => p.$eval('#status', (e) => e.textContent)).toContain('copiado');
  await p.click('#theme');
  expect(await p.$eval('html', (e) => e.dataset.theme)).toBe('dark');
  await p.click('#theme');
  expect(await p.$eval('html', (e) => e.dataset.theme)).toBe('light');
  await p.close();
  console.log(
    'PASS installed popup, all inputs, documents, preservation, coherence, clipboard, themes, frames and shadow DOM',
  );
  await page.reload();
  await page.locator('#cpf').focus();
  p = await popup();
  await p.click('[data-scope=input]');
  await p.click('#fill');
  await expect(page.locator('#cpf')).not.toHaveValue('');
  await expect(page.locator('#email')).toHaveValue('');
  await p.close();
  await page.locator('#email').focus();
  p = await popup();
  await p.click('[data-scope=form]');
  await p.click('#fill');
  await expect(page.locator('#email')).not.toHaveValue('');
  await expect(page.locator('#other-cpf')).toHaveValue('');
  const old = await page.locator('#cpf').inputValue();
  await p.click('#regenerate');
  await expect(page.locator('#cpf')).not.toHaveValue(old);
  await p.click('#copy-fields');
  await expect.poll(() => p.$eval('#status', (e) => e.textContent)).toContain('copiados');
  await p.close();
  await page.evaluate(() => window.addDynamic());
  const result = await fill();
  expect(result.filled).toBeGreaterThan(0);
  await expect(page.locator('#dynamic-phone')).toHaveValue(/\(\d{2}\) 9\d{4}-\d{4}/);
  console.log('PASS popup input/form scope, regenerate, copy scope, dynamically inserted input');
  await page.goto(url + '/frameworks');
  await expect(page.locator('#angular-email')).toBeVisible();
  await expect(page.locator('#vue-email')).toBeVisible();
  await expect(page.locator('#react-email')).toBeVisible();
  const frameworkResult = await fill();
  expect(frameworkResult.filled).toBe(4);
  for (const framework of ['react', 'vue', 'angular']) {
    await expect(page.locator('#' + framework + '-output')).toHaveText(
      await page.locator('#' + framework + '-email').inputValue(),
    );
  }
  await expect(page.locator('#mask-output')).toHaveText(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
  console.log('PASS actual React, Vue, Angular controlled state and CPF input mask');
  await page.goto(url);
  await page.locator('#cpf').focus();
  const custom = await fill('fill', 'input', {
    mode: 'custom',
    rules: [{ selector: '#cpf', generator: 'cpf', value: '123.456.789-09' }],
  });
  expect(custom.filled).toBe(1);
  await expect(page.locator('#cpf')).toHaveValue('123.456.789-09');
  const random = await fill('random', 'input');
  expect(random.skipped).toBe(1); // Nonempty values preserved.
  expect(errors).toEqual([]);
  console.log('PASS Custom rules, Random preservation, no browser runtime errors');
} finally {
  await context.close();
  await new Promise((resolve) => server.close(resolve));
  await rm(profileDirectory, { recursive: true, force: true });
}
