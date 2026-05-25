import { test, expect } from '@playwright/test';

const HORSES = [
  { id: 'buraq',          name: 'Buraq' },
  { id: 'pegasus',        name: 'Pegasus' },
  { id: 'sleipnir',       name: 'Sleipnir' },
  { id: 'uchchaihshravas', name: 'Uchchaiḥśravas' },
  { id: 'kanthaka',       name: 'Kanthaka' },
  { id: 'tianma',         name: 'Tiānmǎ' },
  { id: 'chollima',       name: 'Chollima' },
  { id: 'tulpar',         name: 'Tulpar' },
  { id: 'rakhsh',         name: 'Rakhsh' },
  { id: 'enbarr',         name: 'Enbarr' },
];

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

test('index lists all ten horses, linking to in-page anchors', async ({ page }) => {
  const indexLinks = page.locator('header.hero ~ section a[href^="#"], nav a[href^="#"], h3:has-text("Index of Steeds") + ol a, ol a[href^="#"]').first();
  // Simpler: just check each expected anchor link exists somewhere in the document.
  for (const horse of HORSES) {
    const link = page.locator(`a[href="#${horse.id}"]`).first();
    await expect(link, `index should link to #${horse.id}`).toBeVisible();
  }
});

test.describe('each horse exhibit', () => {
  for (const horse of HORSES) {
    test(`${horse.name} exhibit is present with heading and "Return to Index"`, async ({ page }) => {
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

test('comparative table has ten horse rows', async ({ page }) => {
  // The comparative section is keyed by the "A Comparative Glance" heading.
  const tableRows = page.locator('table tbody tr');
  await expect(tableRows).toHaveCount(10);
});
