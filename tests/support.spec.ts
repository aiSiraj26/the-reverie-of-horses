import { test, expect } from '@playwright/test';

/**
 * Link-integrity guard for the Patronage section. Catches accidental
 * URL swaps that could redirect supporters to a lookalike phishing
 * checkout. Update EXPECTED whenever a provider is genuinely switched.
 */

type HostMatch = { host: string } | { hostSuffix: string };

const EXPECTED: Record<string, HostMatch> = {
  tip:          { host: 'ko-fi.com' },
  digital:      { hostSuffix: 'lemonsqueezy.com' },
  subscription: { host: 'www.patreon.com' },
  prints:       { host: 'society6.com' },
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test.describe('Patronage section', () => {
  test('section exists with id="support"', async ({ page }) => {
    await expect(page.locator('section#support')).toHaveCount(1);
  });

  test('contains exactly four support cards', async ({ page }) => {
    await expect(page.locator('section#support a.support-card')).toHaveCount(4);
  });

  test('each support card links to its expected provider host', async ({ page }) => {
    const cards = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll<HTMLAnchorElement>('section#support a.support-card'),
      ).map((a) => {
        const url = new URL(a.href);
        return {
          kind: a.dataset.support ?? '',
          host: url.hostname,
          protocol: url.protocol,
          rel: (a.rel || '').toLowerCase(),
          target: a.target,
        };
      });
    });

    const kinds = cards.map((c) => c.kind).sort();
    expect(kinds, 'expected tip, digital, subscription, prints').toEqual(
      ['digital', 'prints', 'subscription', 'tip'],
    );

    for (const card of cards) {
      const expected = EXPECTED[card.kind];
      expect(expected, `no host expectation registered for data-support="${card.kind}"`).toBeTruthy();

      if ('host' in expected) {
        expect(card.host, `${card.kind} link host`).toBe(expected.host);
      } else {
        expect(
          card.host === expected.hostSuffix || card.host.endsWith(`.${expected.hostSuffix}`),
          `${card.kind} link host "${card.host}" should be (a subdomain of) ${expected.hostSuffix}`,
        ).toBe(true);
      }

      expect(card.protocol, `${card.kind} link should be https`).toBe('https:');
      expect(card.target, `${card.kind} link should open in a new tab`).toBe('_blank');
      expect(card.rel, `${card.kind} link should carry noopener`).toContain('noopener');
      expect(card.rel, `${card.kind} link should carry noreferrer`).toContain('noreferrer');
    }
  });

  test('no support link uses http://', async ({ page }) => {
    await expect(page.locator('section#support a.support-card[href^="http://"]')).toHaveCount(0);
  });

  test('privacy notice is present', async ({ page }) => {
    const notice = page.locator('section#support .support-privacy');
    await expect(notice).toHaveCount(1);
    await expect(notice).toContainText(/no card/i);
  });
});
