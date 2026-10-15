import { detect, type Field } from './detect';
import { addresses, generate, integer, normalize, profile, type Profile } from './generators';
import type { Kind, Request, Result } from './types';
const selector = 'input,textarea,select,[contenteditable="true"],[contenteditable=""]';
export function fields(root: Document | Element | ShadowRoot): Field[] {
  const result = Array.from(root.querySelectorAll<HTMLElement>(selector));
  for (const el of root.querySelectorAll('*'))
    if (el.shadowRoot) result.push(...fields(el.shadowRoot));
  return result;
}
export function eligible(el: Field): boolean {
  if (
    !el.isConnected ||
    el.matches(':disabled,[readonly],[aria-disabled="true"]') ||
    el.closest('[hidden],[inert],[aria-hidden="true"]')
  )
    return false;
  if (
    el instanceof HTMLInputElement &&
    ['button', 'submit', 'reset', 'file', 'hidden', 'image'].includes(el.type)
  )
    return false;
  const style = getComputedStyle(el);
  return (
    style.visibility !== 'hidden' &&
    style.visibility !== 'collapse' &&
    style.display !== 'none' &&
    el.getClientRects().length > 0
  );
}
export function valueOf(el: Field): string {
  if (el instanceof HTMLInputElement && ['checkbox', 'radio'].includes(el.type))
    return el.checked ? el.value : '';
  return 'value' in el ? String(el.value) : el.textContent || '';
}
export function write(el: Field, value: string) {
  if (el instanceof HTMLInputElement && ['checkbox', 'radio'].includes(el.type)) {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set?.call(
      el,
      value === 'true',
    );
  } else if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    const proto =
      el instanceof HTMLInputElement
        ? HTMLInputElement.prototype
        : el instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLSelectElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value);
  } else el.textContent = value;
  el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  el.dispatchEvent(new FocusEvent('blur', { bubbles: true, composed: true }));
}
function adapt(el: Field, value: string, kind: Kind, p: Profile, formatted: boolean): string {
  if (el instanceof HTMLSelectElement) {
    const options = Array.from(el.options).filter(
      (o) => o.value && !o.disabled && !o.parentElement?.matches('optgroup:disabled') && !o.hidden,
    );
    const candidates = [value, kind === 'state' ? p.stateName : ''].filter(Boolean).map(normalize);
    const match = options.find(
      (o) =>
        candidates.includes(normalize(o.value)) ||
        candidates.includes(normalize(o.textContent || '')),
    );
    // Never choose another city/state: that would silently break address coherence.
    return (
      match?.value ??
      (['state', 'city'].includes(kind) ? '' : options[integer(0, options.length - 1)]?.value || '')
    );
  }
  if (el instanceof HTMLInputElement) {
    if (el.type === 'checkbox' || el.type === 'radio') return 'true';
    if (el.type === 'color') return '#' + integer(0, 0xffffff).toString(16).padStart(6, '0');
    if (el.type === 'number' || el.type === 'range') {
      const min = el.min ? Number(el.min) : 0,
        max = el.max ? Number(el.max) : Math.max(el.type === 'range' ? 100 : 1000, min);
      const step = el.step === 'any' ? 0.01 : Number(el.step) || 1;
      const candidate = Number(
        value.includes(',') ? value.replaceAll('.', '').replace(',', '.') : value,
      );
      const base = el.min ? Number(el.min) : 0;
      const desired = Number.isFinite(candidate) ? candidate : integer(min, max);
      const lower = Math.ceil((min - base) / step),
        upper = Math.floor((max - base) / step);
      if (lower > upper) return '';
      const index =
        kind === 'number'
          ? integer(lower, upper)
          : Math.min(upper, Math.max(lower, Math.round((desired - base) / step)));
      return String(Number((base + index * step).toFixed(8)));
    }
    if (['date', 'datetime-local', 'time', 'month', 'week'].includes(el.type)) {
      let date = value.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = generate('date', p, false);
      if (el.type === 'datetime-local') date += 'T12:00';
      if (el.type === 'time') date = '12:00';
      if (el.type === 'month') date = date.slice(0, 7);
      if (el.type === 'week') date = date.slice(0, 4) + '-W20';
      if (el.min && date < el.min) date = el.min;
      if (el.max && date > el.max) date = el.max;
      return date;
    }
  }
  const hint = el.getAttribute('placeholder') || el.getAttribute('data-mask') || '';
  if (kind === 'birthDate' || kind === 'date') {
    if (formatted || /dd.*mm.*(yyyy|aaaa)/i.test(hint))
      value = value.split('-').reverse().join('/');
  }
  const max = 'maxLength' in el ? Number(el.maxLength) : -1;
  if (['cpf', 'cnpj', 'phone', 'mobile', 'cep', 'cns', 'rg'].includes(kind)) {
    const raw = value.replace(/\D/g, '');
    if ((max > 0 && value.length > max) || el.getAttribute('inputmode') === 'numeric') value = raw;
  }
  if (
    max >= 0 &&
    value.length > max &&
    !['cpf', 'cnpj', 'cns', 'uuid', 'ulid', 'email', 'birthDate', 'date'].includes(kind)
  )
    value = value.slice(0, max);
  const min = 'minLength' in el ? Number(el.minLength) : 0;
  if (value.length < min && ['text', 'password', 'username', 'token'].includes(kind))
    value += generate('token', p, false)
      .repeat(Math.ceil(min / 48))
      .slice(0, min - value.length);
  return value;
}
export function runFill(
  request: Request,
  target: Element | null,
  doc: Document = document,
): Result {
  const result: Result = { filled: 0, skipped: 0, rejected: 0, values: [] };
  let elements: Field[];
  if (request.scope === 'input') {
    if (!target?.matches(selector))
      return { ...result, error: 'Selecione um campo na página antes de usar This Input.' };
    elements = [target as Field];
  } else if (request.scope === 'form') {
    const form =
      target && ('form' in target ? (target as HTMLInputElement).form : target.closest('form'));
    const root = form || target?.closest('[role="form"],form');
    if (!root)
      return { ...result, error: 'Selecione um campo do formulário antes de usar This Form.' };
    elements = fields(root);
    if (root instanceof HTMLFormElement)
      elements = [
        ...new Set([
          ...elements,
          ...(Array.from(root.elements).filter((e) => e.matches(selector)) as Field[]),
        ]),
      ];
  } else elements = fields(doc);
  const profiles = new Map<Element | Document | ShadowRoot, Profile>();
  const radioGroups = new Set<string>();
  const overwrite = request.action === 'regenerate' || request.settings.overwrite;
  for (const el of elements) {
    if (!eligible(el)) {
      result.skipped++;
      continue;
    }
    if (request.action === 'copy') {
      const v = valueOf(el);
      if (v) result.values.push(v);
      continue;
    }
    if (!overwrite && valueOf(el)) {
      result.skipped++;
      continue;
    }
    const owner =
      ('form' in el ? (el as HTMLInputElement).form : null) ||
      el.closest('form,[role="form"]') ||
      (el.getRootNode() as Document | ShadowRoot);
    let p = profiles.get(owner);
    if (!p) {
      p = profile();
      profiles.set(owner, p);
      // Read the whole owning form even for This Input. Only seed from values
      // that this operation will preserve, never from fields being regenerated.
      const related =
        owner instanceof HTMLFormElement
          ? [
              ...new Set([
                ...fields(owner),
                ...(Array.from(owner.elements).filter((e) => e.matches(selector)) as Field[]),
              ]),
            ]
          : fields(owner);
      const existing = new Map<Kind, string>();
      for (const field of related) {
        const value = valueOf(field);
        if (value && eligible(field) && (!overwrite || !elements.includes(field)))
          existing.set(detect(field), value);
      }
      const geo = addresses.find((a) =>
        existing.has('cep')
          ? existing.get('cep')!.replace(/\D/g, '') === a.cep
          : existing.has('city')
            ? normalize(existing.get('city')!) === normalize(a.city)
            : existing.has('state')
              ? [normalize(a.state), normalize(a.stateName)].includes(
                  normalize(existing.get('state')!),
                )
              : false,
      );
      if (geo) Object.assign(p, geo);
      for (const key of [
        'firstName',
        'lastName',
        'fullName',
        'email',
        'username',
        'password',
        'street',
        'houseNumber',
        'district',
      ] as const)
        if (existing.has(key)) Object.assign(p, { [key]: existing.get(key) });
      if (existing.has('fullName')) {
        const parts = existing.get('fullName')!.trim().split(/\s+/);
        p.firstName = existing.get('firstName') || parts[0];
        p.lastName = existing.get('lastName') || parts.slice(1).join(' ') || p.lastName;
      }
      p.fullName = p.firstName + ' ' + p.lastName;
      if (!existing.has('username'))
        p.username =
          normalize(p.firstName + '.' + p.lastName).replace(/\s+/g, '.') + integer(10, 99);
      if (!existing.has('email')) p.email = p.username + '@example.test';
      let birth = existing.get('birthDate');
      if (birth && /^\d{2}\/\d{2}\/\d{4}$/.test(birth))
        birth = birth.split('/').reverse().join('-');
      if (birth && /^\d{4}-\d{2}-\d{2}$/.test(birth)) p.birthDate = birth;
      for (const field of related)
        if (
          field instanceof HTMLInputElement &&
          field.type === 'date' &&
          detect(field) === 'birthDate' &&
          !existing.has('birthDate')
        ) {
          if (field.min && p.birthDate < field.min) p.birthDate = field.min;
          if (field.max && p.birthDate > field.max) p.birthDate = field.max;
        }
      const today = new Date(),
        born = new Date(p.birthDate + 'T12:00:00');
      let age = today.getFullYear() - born.getFullYear();
      if (
        today.getMonth() < born.getMonth() ||
        (today.getMonth() === born.getMonth() && today.getDate() < born.getDate())
      )
        age--;
      if (Number.isFinite(age)) p.age = String(age);
    }
    if (el instanceof HTMLInputElement && el.type === 'radio') {
      const group = elements.filter(
        (f): f is HTMLInputElement =>
          f instanceof HTMLInputElement &&
          f.type === 'radio' &&
          f.name === el.name &&
          f.form === el.form &&
          f.getRootNode() === el.getRootNode(),
      );
      const key = elements.indexOf(group[0]).toString();
      if (radioGroups.has(key) || (!overwrite && group.some((f) => f.checked))) {
        result.skipped++;
        continue;
      }
      radioGroups.add(key);
      const options = group.filter(eligible),
        chosen = options[integer(0, options.length - 1)];
      if (chosen) {
        write(chosen, 'true');
        result.filled++;
        result.values.push(chosen.value);
      }
      continue;
    }
    let kind: Kind = detect(el),
      value: string | undefined;
    if (request.settings.mode === 'custom' && request.action !== 'generate')
      for (const rule of request.settings.rules) {
        let matched = false;
        try {
          matched = rule.selector ? el.matches(rule.selector) : rule.kind === kind;
        } catch {
          continue;
        }
        if (matched) {
          kind = rule.generator;
          value = rule.value;
          break;
        }
      }
    if (
      request.action === 'random' ||
      (request.settings.mode === 'random' && request.action !== 'generate')
    ) {
      // Random bypasses semantic inference while retaining native HTML type validity.
      const type = el.getAttribute('type');
      kind =
        type === 'email'
          ? 'email'
          : type === 'password'
            ? 'password'
            : type === 'url'
              ? 'url'
              : type === 'tel'
                ? 'mobile'
                : type === 'number' || type === 'range'
                  ? 'number'
                  : type?.includes('date') || type === 'month' || type === 'week' || type === 'time'
                    ? 'date'
                    : 'text';
    }
    if (request.action === 'generate' && request.kind) kind = request.kind;
    const formatted =
      request.settings.formatted && !(el instanceof HTMLInputElement && el.type === 'number');
    value = adapt(el, value ?? generate(kind, p, formatted), kind, p, formatted);
    if (!value) {
      result.skipped++;
      continue;
    }
    // Check native constraints on a detached clone before modifying the real field.
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const probe = el.cloneNode() as HTMLInputElement;
      probe.removeAttribute('required');
      probe.value = value;
      if (
        !['checkbox', 'radio'].includes(el.type) &&
        (!probe.checkValidity() || (probe.maxLength >= 0 && value.length > probe.maxLength))
      ) {
        result.rejected++;
        continue;
      }
    }
    write(el, value);
    const actual = valueOf(el);
    if (!actual || ('validity' in el && !(el as HTMLInputElement).validity.valid))
      result.rejected++;
    else {
      result.filled++;
      result.values.push(actual);
    }
  }
  return result;
}
