/**
 * Utility functions for validating user input, including email, password strength, and MX record checks
 */

// DNS Utilities
// DNS-over-HTTPS MX-record check via Cloudflare
export async function hasMXRecord(domain) {
  /**
   * Checks if a domain has MX records using Cloudflare DNS-over-HTTPS.
   * @param {string} domain - The domain to check.
   * @returns {Promise<boolean>} True if MX records exist, false otherwise.
   */
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`;
    const res = await fetch(url, { headers: { 'Accept': 'application/dns-json' } });
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data.Answer) && data.Answer.length > 0;
  } catch {
    return false;
  }
}

// Email Validation
export function isValidEmail(email) {
  /**
   * Validates the format of an email address.
   * @param {string} email - The email address to validate.
   * @returns {boolean} True if the email format is valid, false otherwise.
   */
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailPattern.test(email);
}

// Password Strength Validation
export function isStrongPassword(pass) {
  /**
   * Validates if a password is strong.
   * Requires 8–64 characters, including uppercase, lowercase, digit, and special character.
   * @param {string} pass - The password to validate.
   * @returns {boolean} True if the password is strong, false otherwise.
   */
  return /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,64}/.test(pass);
}