import { createHash, randomBytes } from 'crypto';

const API_KEY_PREFIX = 'pcrm_';
const PREVIEW_LENGTH = 12;

export interface GeneratedApiKey {
  /** Full raw key — shown to the client exactly once, never stored. */
  rawKey: string;
  /** Safe-to-display prefix, e.g. "pcrm_3f9a1c78...". */
  keyPreview: string;
  /** SHA-256 hash of rawKey — what actually gets persisted. */
  hashedKey: string;
}

export function generateApiKey(): GeneratedApiKey {
  const rawKey = `${API_KEY_PREFIX}${randomBytes(24).toString('hex')}`;
  return {
    rawKey,
    keyPreview: `${rawKey.slice(0, PREVIEW_LENGTH)}...`,
    hashedKey: hashApiKey(rawKey),
  };
}

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}
