import { test, expect } from '@playwright/test';

/**
 * Pioneer Soulmate — the full poem appears at the start of Part the Second,
 * before the prose intro and before the six Aspect articles break it apart.
 */

const STANZAS: Array<{ first: string; last: string }> = [
  { first: 'We venture', last: 'of our tomorrow.' },
  { first: 'We look',    last: 'of our reflection.' }, // "We look / into the mirror …"
  { first: 'We seek',    last: 'of our humanity.' },
  { first: 'We thrive',  last: 'of our quandary.' },
  { first: 'We look',    last: 'of our soul.' },       // "We look / into the dark …"
  { first: 'We dive',    last: 'of our ignorance.' },
];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('poem section exists at the start of Part the Second', async ({ page }) => {
  const poem = page.locator('section.poem');
  await expect(poem, 'expected <section class="poem">').toHaveCount(1);

  // It must come AFTER the Part Two header and BEFORE the first aspect article.
  const order = await page.evaluate(() => {
    const header = document.querySelector('header.part-two-header');
    const poem = document.querySelector('section.poem');
    const firstAspect = document.querySelector('article.aspect');
    if (!header || !poem || !firstAspect) return null;
    const pos = (a: Element, b: Element) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    return { headerBeforePoem: pos(header, poem), poemBeforeAspect: pos(poem, firstAspect) };
  });
  expect(order, 'all three landmarks must exist').not.toBeNull();
  expect(order!.headerBeforePoem, 'poem must come after the Part Two header').toBe(-1);
  expect(order!.poemBeforeAspect, 'poem must come before the first aspect article').toBe(-1);
});

test('poem has exactly six stanzas with the right opening and closing lines', async ({ page }) => {
  const stanzas = page.locator('section.poem .poem-stanza');
  await expect(stanzas).toHaveCount(6);

  for (let i = 0; i < STANZAS.length; i++) {
    const stanza = stanzas.nth(i);
    const text = (await stanza.innerText()).replace(/\s+/g, ' ').trim();
    expect(text, `stanza ${i + 1} should start with "${STANZAS[i].first}"`).toMatch(
      new RegExp(`^${STANZAS[i].first}\\b`),
    );
    expect(text, `stanza ${i + 1} should end with "${STANZAS[i].last}"`).toContain(STANZAS[i].last);
  }
});

test('"We venture" is rendered as the prominent opening', async ({ page }) => {
  // The first stanza's opening words are visually large, like the image.
  const opening = page.locator('section.poem .poem-opening');
  await expect(opening).toHaveCount(1);
  await expect(opening).toHaveText('We venture');

  const fontSizePx = await opening.evaluate(
    (el) => parseFloat(getComputedStyle(el).fontSize),
  );
  // Body text on this site sits around 18–20px; the opening should be visibly larger.
  expect(fontSizePx, 'opening should be visually larger than body text').toBeGreaterThan(28);
});
