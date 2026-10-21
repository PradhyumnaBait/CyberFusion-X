/** Indian formatting + plain-language labels shared by both portals. */

export function formatInr(paise?: number | null): string {
  if (paise == null) return '—';
  const rupees = paise / 100;
  return '₹' + rupees.toLocaleString('en-IN', { maximumFractionDigits: paise % 100 ? 2 : 0 });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export function ageLabel(minutes?: number | null): string {
  if (minutes == null) return 'time unknown';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m ago`;
  const days = Math.floor(minutes / 1440);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

export const SCAM_TYPE_LABELS: Record<string, string> = {
  UPI_PAYMENT_FRAUD: 'UPI / payment fraud',
  UPI_WIRE_FRAUD: 'UPI / payment fraud',
  FAKE_JOB_INVESTMENT: 'Fake job / investment scam',
  PHISHING_LINK: 'Fake link / message',
  PHISHING_CAMPAIGN: 'Phishing',
  ACCOUNT_HACKED: 'Account hacked',
  ACCOUNT_TAKEOVER: 'Account takeover',
  HARASSMENT_THREATS: 'Threats / harassment',
  BEC_WIRE_INTERCEPT: 'Business email / wire fraud',
  OTHER: 'Something else',
};

export function scamLabel(type?: string): string {
  return (type && SCAM_TYPE_LABELS[type]) || (type ? type.replace(/_/g, ' ') : '—');
}

export const ENTITY_LABELS: Record<string, string> = {
  UPI_ID: 'UPI ID', BANK_ACCOUNT: 'Bank account', IFSC: 'IFSC', PHONE: 'Phone number',
  TRANSACTION_ID: 'Transaction ref (UTR)', URL: 'Link', EMAIL: 'Email', PERSON: 'Name',
  IP_ADDRESS: 'IP address', CRYPTO_WALLET: 'Crypto wallet', MESSAGE: 'Message', DEVICE: 'Device',
};

export function entityLabel(type?: string): string {
  return (type && ENTITY_LABELS[type]) || (type ? type.replace(/_/g, ' ') : 'Detail');
}

/** Golden-window hint: fresh money cases need bank action fast. Display only — not a legal deadline. */
export function goldenWindow(minutes?: number | null): { text: string; tone: 'red' | 'amber' | 'slate' } {
  if (minutes == null) return { text: 'Incident time not known', tone: 'slate' };
  if (minutes <= 60) return { text: `Golden window: ~${Math.max(0, 60 - Math.round(minutes))} min left to act fast`, tone: 'red' };
  if (minutes <= 360) return { text: 'Still fresh — bank hold may be possible', tone: 'amber' };
  if (minutes <= 1440) return { text: 'Within 24 hours', tone: 'amber' };
  return { text: ageLabel(minutes), tone: 'slate' };
}

/**
 * Officer auth headers. The JWT is sent through THREE transports
 * (Authorization header, X-Officer-Token header, and the cfx_token cookie the
 * login endpoints set) because some hosting/preview proxies silently strip
 * the Authorization header — symptom: login works, but every officer fetch
 * returns 401 and the queue looks empty. The backend verifies the same JWT
 * whichever transport survives. Always pair with credentials: 'include'.
 */
export function officerHeaders(token?: string | null, extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { ...(extra || {}) };
  if (token) {
    h['Authorization'] = `Bearer ${token}`;
    h['X-Officer-Token'] = token;
  }
  return h;
}

/** fetch() preconfigured for officer APIs: multi-transport auth + cookies. Throws on non-2xx with the server message. */
export async function officerFetch<T = any>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: officerHeaders(token, (init?.headers as Record<string, string>) || {}),
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`;
    throw Object.assign(new Error(msg), { status: res.status });
  }
  return data as T;
}

/** Download a URL that needs officer auth (plain <a> links cannot send headers). */
export async function downloadAuthed(url: string, token: string, filename: string): Promise<void> {
  const res = await fetch(url, { headers: officerHeaders(token), credentials: 'include' });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export async function sha256Hex(file: File): Promise<string> {
  try {
    const buf = await file.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return '';
  }
}
