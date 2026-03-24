import { describe, it, expect } from 'vitest';

// Test basic validation patterns
describe('Basic validators', () => {
  it('email validation regex', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test('test@example.com')).toBe(true);
    expect(emailRegex.test('invalid')).toBe(false);
    expect(emailRegex.test('')).toBe(false);
    expect(emailRegex.test('user@domain.co')).toBe(true);
  });

  it('SIRET validation (14 digits)', () => {
    const siretRegex = /^\d{14}$/;
    expect(siretRegex.test('12345678901234')).toBe(true);
    expect(siretRegex.test('1234')).toBe(false);
    expect(siretRegex.test('abc')).toBe(false);
  });

  it('phone validation', () => {
    const phoneRegex = /^[\d\s\+\-\.()]{6,20}$/;
    expect(phoneRegex.test('+33 6 12 34 56 78')).toBe(true);
    expect(phoneRegex.test('06.12.34.56.78')).toBe(true);
    expect(phoneRegex.test('abc')).toBe(false);
  });
});
