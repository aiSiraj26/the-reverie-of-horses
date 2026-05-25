import { test, expect } from '@playwright/test';
import { POEM_STANZAS } from './fixtures';

/**
 * Pioneer Soulmate — the full poem appears at the start of Part the Second,
 * before the prose intro and before the six Aspect articles break it apart.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('poem section exists between the Part Two header and the first aspect', async ({ page }) => {
  await expect(page.locator('section.poem')).toHaveCount(1);

  const order = await page.evaluate(() => {
    const header = document.querySelector('header.part-two-header');
    const poem = document.querySelector('section.poem');
    const firstAspect = document.querySelector('article.aspect');
    if (!header || !poem || !firstAspect) return null;
    const isBefore = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    return {
      headerBeforePoem: isBefore(header, poem),
      poemBeforeAspect: isBefore(poem, firstAspect),
    };
  });
  expect(order, 'all three landmarks must exist').not.toBeNull();
  expect(order!.headerBeforePoem, 'poem must come after the Part Two header').toBe(true);
  expect(order!.poemBeforeAspect, 'poem must come before the first aspect article').toBe(true);
});

test('poem has six stanzas, each with the right opening and four following lines', async ({ page }) => {
  const stanzas = page.locator('section.poem .poem-stanza');
  await expect(stanzas).toHaveCount(POEM_STANZAS.length);

  for (let i = 0; i < POEM_STANZAS.length; i++) {
    const stanza = stanzas.nth(i);
    // innerText preserves <br> as newlines, so each line lands on its own row.
    const renderedLines = (await stanza.innerText())
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    const expected = [POEM_STANZAS[i].opening, ...POEM_STANZAS[i].lines];
    expect(renderedLines, `stanza ${i + 1} lines mismatch`).toEqual(expected);
  }
});

test('"We venture" is rendered as the prominent opening', async ({ page }) => {
  const opening = page.locator('section.poem .poem-opening');
  await expect(opening).toHaveCount(1);
  await expect(opening).toHaveText('We venture');

  const fontSizePx = await opening.evaluate(
    (el) => parseFloat(getComputedStyle(el).fontSize),
  );
  // Body text on this site sits around 18–20px; the opening should be visibly larger.
  expect(fontSizePx, 'opening should be visually larger than body text').toBeGreaterThan(28);
});
