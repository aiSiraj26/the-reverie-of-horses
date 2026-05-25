import { test, expect, request } from '@playwright/test';

const LIVE_URL = 'https://aisiraj26.github.io/the-reverie-of-horses/';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test.describe('XSS / injection surface', () => {
  test('no inline <script> blocks (only src-loaded scripts allowed)', async ({ page }) => {
    const inlineScripts = await page.locator('script:not([src])').count();
    expect(inlineScripts, 'inline <script>…</script> blocks are a CSP-bypass risk').toBe(0);
  });

  test('no inline event handler attributes (onclick, onerror, etc.)', async ({ page }) => {
    const offenders = await page.evaluate(() => {
      const events = [
        'onclick', 'ondblclick', 'onerror', 'onload', 'onmouseover',
        'onmouseout', 'onfocus', 'onblur', 'oninput', 'onchange',
        'onsubmit', 'onbeforeunload', 'onunload', 'onkeydown', 'onkeyup',
      ];
      const found: { tag: string; attr: string }[] = [];
      for (const el of Array.from(document.querySelectorAll('*'))) {
        for (const e of events) {
          if (el.hasAttribute(e)) found.push({ tag: el.tagName, attr: e });
        }
      }
      return found;
    });
    expect(offenders, `inline event handlers: ${JSON.stringify(offenders)}`).toEqual([]);
  });

  test('no third-party font hosts referenced (fonts are self-hosted)', async ({ page }) => {
    const offenders = await page.evaluate(() => {
      const banned = ['fonts.googleapis.com', 'fonts.gstatic.com', 'fonts.bunny.net'];
      const found: string[] = [];
      for (const el of Array.from(document.querySelectorAll('[href], [src]'))) {
        const u = el.getAttribute('href') || el.getAttribute('src') || '';
        if (banned.some((b) => u.includes(b))) found.push(u);
      }
      // Also scan inline <style> rules for embedded font URLs.
      for (const style of Array.from(document.querySelectorAll('style'))) {
        const text = style.textContent || '';
        for (const b of banned) {
          if (text.includes(b)) found.push(`inline <style> referenced ${b}`);
        }
      }
      return found;
    });
    expect(offenders, `third-party font references: ${offenders.join(', ')}`).toEqual([]);
  });

  test('no mixed-content resources (http:// instead of https://)', async ({ page }) => {
    const insecure = await page.evaluate(() => {
      const urls: string[] = [];
      for (const el of Array.from(document.querySelectorAll('[src], [href]'))) {
        const u = el.getAttribute('src') || el.getAttribute('href') || '';
        if (u.startsWith('http://')) urls.push(u);
      }
      return urls;
    });
    expect(insecure, `insecure http:// resources: ${insecure.join(', ')}`).toEqual([]);
  });
});

test.describe('External link safety', () => {
  test('every target="_blank" link has rel="noopener"', async ({ page }) => {
    const offenders = await page.evaluate(() => {
      return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]'))
        .filter((a) => !(a.rel || '').toLowerCase().includes('noopener'))
        .map((a) => a.href);
    });
    expect(offenders, `links missing rel="noopener": ${offenders.join(', ')}`).toEqual([]);
  });
});

test.describe('Defence-in-depth meta tags', () => {
  test('Content-Security-Policy meta tag is present and sensibly scoped', async ({ page }) => {
    const csp = page.locator('meta[http-equiv="Content-Security-Policy"]');
    await expect(csp, 'a CSP meta tag should be present').toHaveCount(1);
    const content = (await csp.getAttribute('content')) || '';
    expect(content, 'CSP should declare a default-src').toMatch(/\bdefault-src\b/);
    // frame-ancestors is intentionally NOT asserted: it's ignored when
    // delivered via <meta>, so we don't fake-protect with it.
    expect(content, 'CSP should constrain object-src to none').toMatch(/\bobject-src\b\s+'none'/);
    expect(content, 'CSP should constrain base-uri').toMatch(/\bbase-uri\b/);
    expect(content, 'CSP should constrain form-action').toMatch(/\bform-action\b/);
  });

  test('CSP does not raise console errors on initial load', async ({ page }) => {
    // Catches misconfigured directives that block our own resources.
    const violations: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      // Ignore the well-known frame-ancestors-in-meta warning; that's expected.
      if (msg.type() === 'error' && /Content Security Policy/i.test(text) && !/frame-ancestors/i.test(text)) {
        violations.push(text);
      }
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    expect(violations, `CSP violations: ${violations.join('\n')}`).toEqual([]);
  });

  test('Referrer-Policy meta tag is present and not leaky', async ({ page }) => {
    const meta = page.locator('meta[name="referrer"]');
    await expect(meta, 'a referrer meta tag should be present').toHaveCount(1);
    const value = await meta.getAttribute('content');
    const safe = ['no-referrer', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin'];
    expect(safe, `referrer policy "${value}" should be one of ${safe.join(', ')}`).toContain(value);
  });
});

test.describe('Live-site HTTP layer', () => {
  test('Strict-Transport-Security header is set with at least 1-year max-age', async () => {
    const ctx = await request.newContext();
    const res = await ctx.get(LIVE_URL);
    const hsts = res.headers()['strict-transport-security'];
    expect(hsts, 'HSTS header should be present').toBeTruthy();
    const maxAge = Number((hsts || '').match(/max-age=(\d+)/)?.[1] ?? 0);
    expect(maxAge, 'HSTS max-age should be >= 1 year').toBeGreaterThanOrEqual(31536000);
    await ctx.dispose();
  });

  test('plain http:// URL upgrades to https://', async () => {
    const ctx = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await ctx.get('http://aisiraj26.github.io/the-reverie-of-horses/', {
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    expect([301, 302, 307, 308], `unexpected status ${res.status()}`).toContain(res.status());
    const location = res.headers()['location'] || '';
    expect(location, 'redirect target should be https://').toMatch(/^https:\/\//);
    await ctx.dispose();
  });
});
