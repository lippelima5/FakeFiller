// @vitest-environment jsdom
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { detect } from '../detect';
import { runFill } from '../fill';
import { defaults, type Request } from '../types';
import { validateRules } from '../settings';
beforeEach(() => {
  document.body.innerHTML = '';
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
    { width: 100, height: 30 },
  ] as unknown as DOMRectList);
});
const request = (extra: Partial<Request> = {}): Request => ({
  channel: 'fake-filler-dev',
  action: 'fill',
  scope: 'all',
  settings: { ...defaults },
  ...extra,
});
const input = (selector = 'input') => document.querySelector<HTMLInputElement>(selector)!;
describe('recognition', () => {
  it.each([
    ['<label>Cartão Nacional de Saúde<input name="x1"></label>', 'cns'],
    ['<label for="x">Data de nascimento</label><input id="x">', 'birthDate'],
    ['<input placeholder="000.000.000-00">', 'cpf'],
    ['<input autocomplete="given-name">', 'firstName'],
    ['<input name="lastName">', 'lastName'],
    ['<span id="lab">Cidade</span><input aria-labelledby="lab">', 'city'],
    ['<fieldset><legend>Endereço</legend><input name="nro"></fieldset>', 'houseNumber'],
  ])('detects %s', (html, kind) => {
    document.body.innerHTML = html;
    expect(detect(input())).toBe(kind);
  });
});
describe('safe filling', () => {
  it('uses preserved form context for This Input and matching geography', () => {
    document.body.innerHTML =
      '<form><input name="fullName" value="Alice Costa"><input name="city" value="Curitiba"><input name="state"><input name="email"></form>';
    runFill(request({ scope: 'input' }), input('[name=email]'));
    expect(input('[name=email]').value).toMatch(/^alice\.costa\d+@example\.test$/);
    runFill(request({ scope: 'input' }), input('[name=state]'));
    expect(input('[name=state]').value).toBe('PR');
  });
  it('keeps age consistent with preserved birth date and native birth bounds', () => {
    document.body.innerHTML =
      '<form><input type="date" name="birthDate" value="2000-01-01"><input name="age" type="number"></form>';
    runFill(request(), null);
    expect(input('[name=age]').value).toBe(String(new Date().getFullYear() - 2000));
    document.body.innerHTML =
      '<form><input type="date" name="birthDate" min="2000-01-01" max="2000-01-01"><input name="age" type="number"></form>';
    runFill(request(), null);
    expect(input('[name=age]').value).toBe(String(new Date().getFullYear() - 2000));
  });
  it('preserves values and skips disabled, readonly, hidden and file inputs', () => {
    document.body.innerHTML =
      '<input value="keep"><input disabled><fieldset disabled><input></fieldset><input readonly><input type="hidden"><input hidden><input type="file"><button type="submit">Enviar</button><input name="cpf">';
    expect(runFill(request(), null).filled).toBe(1);
    expect(input().value).toBe('keep');
  });
  it('regenerates populated fields', () => {
    document.body.innerHTML = '<input name="cpf" value="old">';
    expect(runFill(request({ action: 'regenerate' }), null).filled).toBe(1);
    expect(input().value).not.toBe('old');
  });
  it('scopes to the exact selected input and form, including external form controls', () => {
    document.body.innerHTML =
      '<form id="a"><input name="cpf"><input name="email"></form><input form="a" name="cns"><form id="b"><input name="cpf"></form>';
    const target = input('#a input');
    expect(runFill(request({ scope: 'input' }), target).filled).toBe(1);
    expect(input('#a input[name=email]').value).toBe('');
    expect(runFill(request({ scope: 'form' }), target).filled).toBe(2);
    expect(input('#b input').value).toBe('');
  });
  it('emits input/change/blur without click or submit', () => {
    document.body.innerHTML = '<form><input name="email"><button>Enviar</button></form>';
    const events: string[] = [];
    for (const type of ['input', 'change', 'blur', 'submit', 'click'])
      document.addEventListener(type, () => events.push(type), { once: true });
    runFill(request(), null);
    expect(events).toEqual(['input', 'change', 'blur']);
  });
  it('keeps confirmation passwords and profile names coherent', () => {
    document.body.innerHTML =
      '<input name="firstName" value="Alice"><input name="lastName" value="Costa"><input name="fullName"><input type="password"><input name="confirmPassword" type="password">';
    runFill(request(), null);
    expect(input('[name=fullName]').value).toBe('Alice Costa');
    expect(input('input[type=password]').value).toBe(input('[name=confirmPassword]').value);
  });
  it('does not truncate documents, and fits document masks into numeric lengths', () => {
    document.body.innerHTML = '<input name="cpf" maxlength="11"><input name="cnpj" maxlength="4">';
    const r = runFill(request(), null);
    expect(input().value).toMatch(/^\d{11}$/);
    expect(input('[name=cnpj]').value).toBe('');
    expect(r.rejected).toBe(1);
  });
  it('respects numeric min, max and step, dates and incompatible patterns', () => {
    document.body.innerHTML =
      '<input type="number" min="10" max="20" step="2"><input type="date" min="2020-01-01" max="2021-01-01"><input pattern="[A-Z]{3}" name="x">';
    const r = runFill(request(), null);
    expect(Number(input().value) % 2).toBe(0);
    expect(Number(input().value)).toBeGreaterThanOrEqual(10);
    expect(input('[type=date]').value <= '2021-01-01').toBe(true);
    expect(r.rejected).toBe(1);
  });
  it('copies scope values without mutating', () => {
    document.body.innerHTML = '<input value="hello"><textarea>world</textarea>';
    const r = runFill(request({ action: 'copy' }), null);
    expect(r.values).toEqual(['hello', 'world']);
    expect(r.filled).toBe(0);
  });
  it('handles shadow DOM, dynamic controls and custom selector precedence', () => {
    document.body.innerHTML = '<div id="host"></div>';
    const shadow = document.getElementById('host')!.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<input name="field">';
    const r = runFill(
      request({
        settings: {
          ...defaults,
          mode: 'custom',
          rules: [{ selector: '[name=field]', generator: 'text', value: 'QA-42' }],
        },
      }),
      null,
    );
    expect(r.filled).toBe(1);
    expect(shadow.querySelector('input')!.value).toBe('QA-42');
  });
  it('keeps radio selections and avoids selecting disabled options', () => {
    document.body.innerHTML =
      '<input type="radio" name="a" checked><input type="radio" name="a"><select><option value="">Escolha</option><option value="bad" disabled>Bad</option><option value="ok">OK</option></select>';
    runFill(request(), null);
    expect(input().checked).toBe(true);
    expect(document.querySelector('select')!.value).toBe('ok');
  });
  it('rejects invalid custom rules', () => {
    expect(() => validateRules([{ selector: '[', generator: 'cpf' }])).toThrow();
    expect(() => validateRules([{ kind: 'unknown', generator: 'cpf' }])).toThrow();
  });
  it('Generate uses the chosen type even in Random mode and preserves nonempty values', () => {
    document.body.innerHTML = '<input name="email"><input name="email" value="keep@example.test">';
    const r = runFill(
      request({
        scope: 'input',
        action: 'generate',
        kind: 'cns',
        settings: { ...defaults, mode: 'random' },
      }),
      input(),
    );
    expect(r.filled).toBe(1);
    expect(input().value).toMatch(/^[12]\d{14}$/);
    const skipped = runFill(
      request({ scope: 'input', action: 'generate', kind: 'cpf' }),
      input('input[value]'),
    );
    expect(skipped.skipped).toBe(1);
  });
});
