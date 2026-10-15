import { describe, it, expect } from 'vitest';
import { cpf, cnpj, cns, generate, profile, ulid } from '../generators';
import { kinds } from '../types';
// Independent validators multiply the full document, including its check digits.
function mod11(s: string, weights: number[]) {
  return [...s].reduce((n, c, i) => n + Number(c) * weights[i], 0) % 11;
}
describe('Brazilian documents', () => {
  it('generates 2000 CPF documents with independently valid check digits', () => {
    for (let i = 0; i < 2000; i++) {
      const s = cpf();
      expect(s).toMatch(/^\d{11}$/);
      expect(mod11(s.slice(0, 10), [10, 9, 8, 7, 6, 5, 4, 3, 2, 1])).toBeLessThan(2);
      expect(mod11(s, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])).toBeLessThan(2);
      expect(/^(\d)\1+$/.test(s)).toBe(false);
    }
  });
  it('generates 2000 CNPJ documents with valid check digits', () => {
    for (let i = 0; i < 2000; i++) {
      const s = cnpj();
      expect(s).toMatch(/^\d{14}$/);
      expect(mod11(s.slice(0, 13), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 1])).toBeLessThan(2);
      expect(mod11(s, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 1])).toBeLessThan(2);
    }
  });
  it('generates 4000 CNS documents with valid full weighted modulus', () => {
    for (let i = 0; i < 4000; i++) {
      const s = cns();
      expect(s).toMatch(/^[12]\d{14}$/);
      expect(mod11(s, [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])).toBe(0);
    }
  });
});
describe('profiles', () => {
  it('keeps name, email, address and birth date coherent', () => {
    const p = profile();
    expect(p.fullName).toBe(`${p.firstName} ${p.lastName}`);
    expect(p.email).toContain(p.username);
    expect(generate('address', p)).toContain(p.city);
    const born = new Date(p.birthDate + 'T12:00:00');
    expect(Number(p.age)).toBeGreaterThan(18);
    expect(born.getFullYear()).toBeLessThan(2006);
  });
  it('supports every documented generator', () => {
    for (const k of kinds) expect(generate(k)).toBeTruthy();
  });
  it('generates unique UUIDs, tokens and canonical ULIDs', () => {
    expect(new Set(Array.from({ length: 200 }, () => generate('uuid'))).size).toBe(200);
    expect(generate('uuid')).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
    );
    expect(ulid()).toMatch(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/);
    expect(generate('token')).toMatch(/^[a-f\d]{48}$/);
  });
});
