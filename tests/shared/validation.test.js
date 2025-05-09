
import { isValidEmail, isDisposableTLD, isStrongPassword } from "../../shared/validation";

describe("validation utilities", () => {
  test("accepts valid email formats", () => {
    expect(isValidEmail("user.name+tag@example.co.uk")).toBe(true);
    expect(isValidEmail("simple@mail.com")).toBe(true);
  });

  test("rejects invalid email formats", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("user@.com")).toBe(false);
  });

  test("detects disposable domains", () => {
    expect(isDisposableTLD("mailinator.com")).toBe(true);
    expect(isDisposableTLD("gmail.com")).toBe(false);
  });

  test("enforces password strength", () => {
    expect(isStrongPassword("Weak1!")).toBe(false);
    expect(isStrongPassword("Str0ngP@ssw0rd123")).toBe(true);
  });
});