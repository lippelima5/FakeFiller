import { normalize } from './generators';
import type { Kind } from './types';
export type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLElement;
export function description(el: Field): string {
  const labelled = (el.getAttribute('aria-labelledby') || '')
    .split(/\s+/)
    .map((id) => el.ownerDocument.getElementById(id)?.textContent || '')
    .join(' ');
  const labels =
    'labels' in el
      ? Array.from((el as HTMLInputElement).labels || [], (l) => l.textContent).join(' ')
      : '';
  return normalize(
    [
      el.getAttribute('name'),
      el.id,
      el.getAttribute('placeholder'),
      el.getAttribute('aria-label'),
      el.getAttribute('autocomplete'),
      el.getAttribute('data-mask'),
      el.getAttribute('pattern'),
      labels,
      labelled,
      el.closest('label')?.textContent,
    ]
      .join(' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2'),
  ).replace(/[_-]/g, ' ');
}
const matches: [Kind, RegExp][] = [
  ['cnpj', /cnpj|cadastro nacional.*jurid/],
  ['cpf', /\bcpf\b|cadastro.*pessoa.*fisica/],
  ['cns', /\bcns\b|cartao.*(sus|saude)|\bsus\b/],
  ['rg', /\brg\b|registro geral|identidade/],
  ['ulid', /ulid/],
  ['uuid', /uuid|guid/],
  ['uid', /\buid\b/],
  ['token', /token|api.?key|chave.*api/],
  ['lastName', /sobrenome|surname|last\s?name|family.?name/],
  ['firstName', /primeiro nome|first\s?name|given.?name/],
  ['birthDate', /nasc|birth|\bdob\b|bday/],
  ['age', /\bidade\b|\bage\b/],
  ['cep', /\bcep\b|postal|zip/],
  [
    'houseNumber',
    /numero.*(casa|resid|endere)|house.?number|street.?number|\bnumero\b|\bnumber address\b/,
  ],
  ['district', /bairro|district|neighbou?rhood/],
  ['city', /cidade|city|locality|address level2/],
  ['state', /estado|\buf\b|\bstate\b|region|address level1/],
  ['street', /logradouro|\brua\b|street|address line1/],
  ['address', /endere[cç]o|address/],
  ['email', /e.?mail/],
  ['password', /senha|password|passcode/],
  ['username', /username|user.?name|usuario|login/],
  ['mobile', /celular|mobile|whatsapp/],
  ['phone', /telefone|phone|\btel\b|fone/],
  ['money', /preco|valor|salario|price|amount|money|currency|renda/],
  ['company', /empresa|company|organization|razao social/],
  ['url', /website|\burl\b|\bsite\b/],
  ['fullName', /\bnome\b|\bname\b|fullname|full name/],
  ['date', /\bdata\b|\bdate\b/],
  ['number', /quantidade|quantity|numeric|\bnumber\b|\bqty\b/],
];
export function detect(el: Field): Kind {
  const text = description(el);
  for (const [kind, rx] of matches) if (rx.test(text)) return kind;
  const hint = el.getAttribute('placeholder') || el.getAttribute('data-mask') || '';
  if (/^[09#Xx]{3}\.[09#Xx]{3}\.[09#Xx]{3}-[09#Xx]{2}$/.test(hint)) return 'cpf';
  if (/^[09#Xx]{5}-[09#Xx]{3}$/.test(hint)) return 'cep';
  const type = el.getAttribute('type');
  if (type === 'email') return 'email';
  if (type === 'password') return 'password';
  if (type === 'tel') return 'mobile';
  if (
    type === 'date' ||
    type === 'datetime-local' ||
    type === 'month' ||
    type === 'week' ||
    type === 'time'
  )
    return 'date';
  if (type === 'number' || type === 'range') return 'number';
  if (type === 'url') return 'url';
  // Form context is a last resort so that one nearby CPF label cannot classify every field.
  const context = normalize(el.closest('fieldset')?.querySelector('legend')?.textContent || '');
  if (/endere|address/.test(context) && /\bnum\b|\bnro\b/.test(text)) return 'houseNumber';
  if (/paciente|patient|cadastro|pessoal/.test(context) && /\bnm\b|\bnm p\b/.test(text))
    return 'fullName';
  return 'text';
}
