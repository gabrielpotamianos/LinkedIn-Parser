// validation.js

// DNS-over-HTTPS MX-record check via Cloudflare
export async function hasMXRecord(domain) {
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
  
  // Basic email format (RFC 5322-ish)
  export function isValidEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return re.test(email);
  }
  
  // Block disposable-style TLDs
  const disposableTLDs = new Set([
    'ga','cf','ml','tk','xyz','info','top','buzz','work','live','online'
  ]);
  export function isDisposableTLD(domain) {
    const parts = domain.split('.');
    const tld = parts[parts.length - 1].toLowerCase();
    return disposableTLDs.has(tld);
  }
  
  // Strong password: 8–64 chars, upper, lower, digit, special
  export function isStrongPassword(pass) {
    return /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,64}/.test(pass);
  }