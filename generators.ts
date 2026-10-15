import type { Kind } from './types';
export function integer(min: number, max: number): number {
  const range = Math.floor(max) - Math.ceil(min) + 1;
  if (range <= 0 || !Number.isFinite(range)) return min;
  return (
    Math.ceil(min) +
    Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296) * range)
  );
}
const pick = <T>(items: readonly T[]): T => items[integer(0, items.length - 1)];
const digits = (n: number) => Array.from({ length: n }, () => integer(0, 9)).join('');
const check = (s: string, weights: number[]) => {
  const r = [...s].reduce((a, c, i) => a + Number(c) * weights[i], 0) % 11;
  return String(r < 2 ? 0 : 11 - r);
};
export function cpf(): string {
  let s = digits(9);
  if (/^(\d)\1+$/.test(s)) s = '123456789';
  s += check(s, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return s + check(s, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
}
export function cnpj(): string {
  let s = digits(8) + '0001';
  s += check(s, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return s + check(s, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
}
// Definitive CNS algorithm for prefixes 1/2, weighted modulo 11.
export function cns(): string {
  const base = pick(['1', '2']) + digits(10);
  const sum = [...base].reduce((a, c, i) => a + Number(c) * (15 - i), 0);
  const dv = 11 - (sum % 11);
  return (
    base +
    (dv === 10 ? '001' + String((11 - ((sum + 2) % 11)) % 11) : '000' + String(dv === 11 ? 0 : dv))
  );
}
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export const addresses = [
  {
    cep: '01310100',
    street: 'Avenida Paulista',
    district: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    stateName: 'São Paulo',
    ddd: '11',
  },
  {
    cep: '30130110',
    street: 'Avenida Afonso Pena',
    district: 'Centro',
    city: 'Belo Horizonte',
    state: 'MG',
    stateName: 'Minas Gerais',
    ddd: '31',
  },
  {
    cep: '80010000',
    street: 'Rua XV de Novembro',
    district: 'Centro',
    city: 'Curitiba',
    state: 'PR',
    stateName: 'Paraná',
    ddd: '41',
  },
] as const;
export function profile() {
  const firstName = pick([
    'Marina',
    'Rafael',
    'Camila',
    'Lucas',
    'Beatriz',
    'Daniel',
    'Ana',
    'Pedro',
  ]);
  const lastName = pick(['Silva', 'Oliveira', 'Costa', 'Almeida', 'Santos', 'Pereira']);
  const birth = new Date(integer(1970, 2005), integer(0, 11), integer(1, 28));
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  )
    age--;
  const username = normalize(firstName + '.' + lastName) + integer(10, 99);
  return {
    firstName,
    lastName,
    fullName: firstName + ' ' + lastName,
    username,
    email: username + '@example.test',
    password: 'Qa!' + crypto.randomUUID().replaceAll('-', '').slice(0, 13),
    birthDate: localDate(birth),
    age: String(age),
    cpf: cpf(),
    cnpj: cnpj(),
    cns: cns(),
    ...pick(addresses),
    houseNumber: String(integer(10, 999)),
  };
}
export type Profile = ReturnType<typeof profile>;
export function localDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const loremSentences = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  'Praesent commodo cursus magna, vel scelerisque nisl consectetur et.',
  'Donec ullamcorper nulla non metus auctor fringilla.',
  'Maecenas sed diam eget risus varius blandit sit amet non magna.',
];
export function ulid() {
  let n = BigInt(Date.now()),
    s = '';
  for (let i = 0; i < 10; i++) {
    s = alphabet[Number(n % 32n)] + s;
    n /= 32n;
  }
  return (
    s + Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) => alphabet[n % 32]).join('')
  );
}
export function generate(kind: Kind, p: Profile = profile(), formatted = true): string {
  const mask = (value: string, rx: RegExp, format: string) =>
    formatted ? value.replace(rx, format) : value;
  switch (kind) {
    case 'cpf':
      return mask(p.cpf, /(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    case 'cnpj':
      return mask(p.cnpj, /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    case 'cns':
      return p.cns;
    case 'rg':
      return mask(digits(9), /(\d{2})(\d{3})(\d{3})(\d)/, '$1.$2.$3-$4');
    case 'cep':
      return mask(p.cep, /(\d{5})(\d{3})/, '$1-$2');
    case 'phone':
      return mask(p.ddd + '3' + digits(7), /(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    case 'mobile':
      return mask(p.ddd + '9' + digits(8), /(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    case 'address':
      return `${p.street}, ${p.houseNumber} - ${p.district}, ${p.city} - ${p.state}, ${generate('cep', p, formatted)}`;
    case 'uuid':
      return crypto.randomUUID();
    case 'uid':
      return crypto.randomUUID().replaceAll('-', '');
    case 'ulid':
      return ulid();
    case 'token':
      return Array.from(crypto.getRandomValues(new Uint8Array(24)), (n) =>
        n.toString(16).padStart(2, '0'),
      ).join('');
    case 'date':
      return localDate(new Date(integer(2020, 2030), integer(0, 11), integer(1, 28)));
    case 'number':
      return String(integer(1, 999));
    case 'money': {
      const n = integer(100, 999999) / 100;
      return formatted ? n.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : n.toFixed(2);
    }
    case 'text': {
      const start = integer(0, loremSentences.length - 1);
      return Array.from(
        { length: integer(1, 3) },
        (_, index) => loremSentences[(start + index) % loremSentences.length],
      ).join(' ');
    }
    case 'url':
      return 'https://example.test/qa/' + integer(1, 9999);
    case 'company':
      return 'Laboratório ' + p.lastName + ' QA';
    default:
      return p[kind];
  }
}
