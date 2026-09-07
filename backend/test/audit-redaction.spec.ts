import { describe, expect, it } from 'vitest';
import { redact } from '../src/modules/audit/audit.service';

/**
 * What the audit trail is allowed to write down.
 *
 * The interceptor records the body of every mutating request, which includes
 * `POST /auth/register` — so without redaction the trail would be a collection
 * of plaintext passwords, and every database backup would carry a copy.
 *
 * Redaction happens on the way *in* rather than on the way out, because no
 * amount of care at read time un-writes a credential that already reached
 * disk. These cases pin that, and pin that it survives nesting: the rule is
 * keyed on the field name at any depth, not on a list of known endpoints,
 * because the interceptor covers routes nobody has written yet.
 */
describe('redact', () => {
  it('removes a password at the top level', () => {
    expect(
      redact({ email: 'ada@blanksys.pos', password: 'Verdant-Meridian-5644' }),
    ).toEqual({ email: 'ada@blanksys.pos', password: '[redacted]' });
  });

  it('matches the field name whatever its casing', () => {
    expect(redact({ Password: 'x', NEWPASSWORD: 'y', accessToken: 'z' })).toEqual({
      Password: '[redacted]',
      NEWPASSWORD: '[redacted]',
      accessToken: '[redacted]',
    });
  });

  it('reaches a credential nested inside an object', () => {
    expect(redact({ account: { name: 'Ada', password: 'secret' } })).toEqual({
      account: { name: 'Ada', password: '[redacted]' },
    });
  });

  it('reaches into arrays of objects', () => {
    expect(redact({ users: [{ password: 'a' }, { password: 'b' }] })).toEqual({
      users: [{ password: '[redacted]' }, { password: '[redacted]' }],
    });
  });

  it('leaves everything else exactly as it was', () => {
    // An audit row is only useful if it says what actually happened, so
    // redaction has to be surgical rather than broad.
    const body = {
      customerId: 'CUST-101',
      amount: 32.1,
      appliesTo: 'TRX-8901',
      items: [{ productId: 'PROD-101', qty: 2 }],
      unscheduled: null,
    };

    expect(redact(body)).toEqual(body);
  });

  it('stops descending rather than recursing forever', () => {
    // A body nested past any plausible depth is a malformed or hostile one.
    // Truncating is the safe answer; a stack overflow inside the audit path
    // would take down the request it was only meant to observe.
    let deep: Record<string, unknown> = { password: 'x' };
    for (let i = 0; i < 20; i += 1) deep = { nested: deep };

    expect(() => redact(deep)).not.toThrow();
    expect(JSON.stringify(redact(deep))).not.toContain('"x"');
  });

  it('passes primitives straight through', () => {
    expect(redact('plain')).toBe('plain');
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBe(null);
    expect(redact(undefined)).toBe(undefined);
  });
});
