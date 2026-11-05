/**
 * Sahayak URL and Navigation Safety Service (Slice 16)
 * Validates target URLs before proposing, approving, or executing navigation actions.
 * Enforces strict protocol allowlisting, rejects embedded credentials, and blocks malicious schemes.
 */

export interface UrlSafetyValidationResult {
  isValid: boolean;
  reason?: string;
  sanitizedUrl?: string;
  scheme?: string;
}

export class UrlSafetyService {
  private static readonly ALLOWED_SCHEMES = new Set(['http:', 'https:']);

  private static readonly DISALLOWED_SCHEMES = new Set([
    'javascript:',
    'data:',
    'file:',
    'chrome:',
    'chrome-extension:',
    'edge:',
    'about:',
    'blob:',
    'view-source:',
    'filesystem:',
    'vbscript:',
  ]);

  /**
   * Validates a target URL against deterministic protocol and credential rules.
   */
  public validateUrl(rawUrl: string | undefined | null): UrlSafetyValidationResult {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return {
        isValid: false,
        reason: 'Target URL is missing or invalid.',
      };
    }

    const trimmed = rawUrl.trim();
    if (!trimmed) {
      return {
        isValid: false,
        reason: 'Target URL is empty.',
      };
    }

    // Direct check for malicious scheme prefixes without protocol parser
    const lower = trimmed.toLowerCase();
    for (const disallowed of UrlSafetyService.DISALLOWED_SCHEMES) {
      if (lower.startsWith(disallowed)) {
        return {
          isValid: false,
          scheme: disallowed,
          reason: `Navigation to "${disallowed}" protocol is strictly blocked for extension security.`,
        };
      }
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return {
        isValid: false,
        reason: `Malformed or invalid URL: "${trimmed}".`,
      };
    }

    const protocol = parsed.protocol.toLowerCase();

    // 1. Strict Protocol Allowlist
    if (!UrlSafetyService.ALLOWED_SCHEMES.has(protocol)) {
      return {
        isValid: false,
        scheme: protocol,
        reason: `Unsupported URL protocol "${protocol}". Sahayak only permits http: and https: web destinations.`,
      };
    }

    // 2. Reject embedded credentials (e.g. https://user:pass@host)
    if (parsed.username || parsed.password) {
      return {
        isValid: false,
        scheme: protocol,
        reason:
          'URLs containing embedded user credentials (username/password) are blocked to prevent credential leaks.',
      };
    }

    // 3. Reject hostnames with invalid characters or empty hosts
    if (!parsed.hostname || parsed.hostname.includes(' ') || parsed.hostname.includes('<')) {
      return {
        isValid: false,
        scheme: protocol,
        reason: 'URL hostname is invalid or contains malformed characters.',
      };
    }

    return {
      isValid: true,
      scheme: protocol,
      sanitizedUrl: parsed.href,
    };
  }
}

export const urlSafetyService = new UrlSafetyService();
