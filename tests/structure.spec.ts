import { test, expect } from '@playwright/test';
import { HORSES } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('page loads with the right title', async ({ page }) => {
  await expect(page).toHaveTitle('The Reverie of Horses — An Illuminated Compendium');
});

test('document has lang and a viewport meta', async ({ page }) => {
  const lang = await page.locator('html').getAttribute('lang');
  expect(lang, '<html lang="…"> must be set for a11y / SEO').toBeTruthy();

  const viewport = page.locator('meta[name="viewport"]');
  await expect(viewport).toHaveCount(1);
});

test('has exactly one <h1>', async ({ page }) => {
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('The Reverie of Horses');
});

test('index lists all twelve horses, linking to in-page anchors', async ({ page }) => {
  for (const horse of HORSES) {
    const link = page.locator(`a[href="#${horse.id}"]`).first();
    await expect(link, `index should link to #${horse.id}`).toBeVisible();
  }
});

test.describe('each horse exhibit', () => {
  for (const horse of HORSES) {
    test(`${horse.name} — heading and back-to-top link`, async ({ page }) => {
      const exhibit = page.locator(`article.exhibit#${horse.id}`);
      await expect(exhibit, `expected <article class="exhibit" id="${horse.id}">`).toHaveCount(1);

      const heading = exhibit.locator('h2').first();
      await expect(heading).toContainText(horse.name);

      const backLink = exhibit.locator('a.back-to-top[href="#top"]');
      await expect(backLink, `${horse.name} should have a Return to Index link`).toHaveCount(1);
    });
  }
});

test('every in-page anchor link points to an element that exists', async ({ page }) => {
  const missing = await page.evaluate(() => {
    const hrefs = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))
      .map((a) => a.getAttribute('href') || '')
      .filter((h) => h.length > 1); // skip bare "#"
    const ids = Array.from(new Set(hrefs.map((h) => h.slice(1))));
    return ids.filter((id) => !document.getElementById(id));
  });
  expect(missing, `anchor links with no target id: ${missing.join(', ')}`).toEqual([]);
});

test('Part the Second has six aspects', async ({ page }) => {
  await expect(page.locator('article.aspect')).toHaveCount(6);
});

test.describe('comparative table', () => {
  test('has twelve horse rows', async ({ page }) => {
    await expect(page.locator('.comparison table tbody tr')).toHaveCount(12);
  });

  test('each row names the horse and its civilisation', async ({ page }) => {
    const rows = page.locator('.comparison table tbody tr');
    for (let i = 0; i < HORSES.length; i++) {
      const row = rows.nth(i);
      const text = await row.innerText();
      expect(text, `row ${i + 1} should mention ${HORSES[i].name}`).toContain(HORSES[i].name);
      expect(text, `row ${i + 1} should mention ${HORSES[i].civilisation}`).toContain(HORSES[i].civilisation);
    }
  });
});

test.describe('twelve transformations table', () => {
  test('has twelve horse rows', async ({ page }) => {
    await expect(page.locator('.transformations table tbody tr')).toHaveCount(12);
  });

  test('each row names the horse', async ({ page }) => {
    const rows = page.locator('.transformations table tbody tr');
    for (let i = 0; i < HORSES.length; i++) {
      const text = await rows.nth(i).innerText();
      expect(text, `row ${i + 1} should mention ${HORSES[i].name}`).toContain(HORSES[i].name);
    }
  });
});
