// Simple at-rest token encryption for localStorage using Web Crypto (AES-GCM)
// Note: This protects against casual inspection only; frontend secrets are extractable.

const STORAGE_KEY = 'lw_token_enc';
const PASSPHRASE = process.env.REACT_APP_TOKEN_KEY || 'livewatch-dev-key';
const SALT = new TextEncoder().encode('livewatch-static-salt');

function bytesToB64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function getKey() {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(PASSPHRASE),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptAndStoreToken(token: string) {
  try {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(token));
    const data = new Uint8Array(ct);
    const payload = `${bytesToB64(iv)}.${bytesToB64(data)}`;
    localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // fallback: store plain if crypto unavailable (not ideal)
    localStorage.setItem(STORAGE_KEY, token);
  }
}

export async function loadDecryptedToken(): Promise<string | null> {
  const payload = localStorage.getItem(STORAGE_KEY);
  if (!payload) return null;
  if (!payload.includes('.')) return payload; // fallback/plain
  try {
    const [ivB64, ctB64] = payload.split('.');
    const iv = b64ToBytes(ivB64);
    const data = b64ToBytes(ctB64);
    const key = await getKey();
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(new Uint8Array(pt));
  } catch {
    return null;
  }
}

export function clearStoredToken() {
  localStorage.removeItem(STORAGE_KEY);
}


