/**
 * @jest-environment node
 */
import { jest, describe, test, expect, beforeAll } from '@jest/globals';

beforeAll(() => {
  global.fetch = jest.fn();
});


import {
  isValidEmail,
  isStrongPassword,
} from '../../shared/validation.js';

describe("Validation utils", () => {
  describe("isValidEmail()", () => {
    test("accepts standard emails", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
      expect(isValidEmail("foo.bar+baz@sub.domain.co")).toBe(true);
    });
    test("rejects missing @ or domain", () => {
      expect(isValidEmail("bad")).toBe(false);
      expect(isValidEmail("no-domain@")).toBe(false);
      expect(isValidEmail("")).toBe(false);
    });
  });

  describe("isStrongPassword()", () => {
    test("enforces length and character classes", () => {
      expect(isStrongPassword("Short1!")).toBe(false); // too short
      expect(isStrongPassword("longbutn0symbols")).toBe(false); // missing symbol
      expect(isStrongPassword("NoDigits!!")).toBe(false); // missing digit
      expect(isStrongPassword("VaL1dP@ssword")).toBe(true);
    });
  });
});
