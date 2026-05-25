import { test, expect } from '@playwright/test';
import { HORSES } from './fixtures';

test.describe('exhibit images', () => {
  test.describe.configure({ mode: 'serial' }); // one page, scroll through it
  test.setTimeout(60_000); // image fetches from Wikimedia can be slow

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('every exhibit image has non-empty alt text', async ({ page }) => {
    for (const horse of HORSES) {
      const img = page.locator(`article.exhibit#${horse.id} img`).first();
      await expect(img, `${horse.id} should have an <img>`).toHaveCount(1);
      const alt = await img.getAttribute('alt');
      expect(alt?.trim().length ?? 0, `${horse.id} image alt must be non-empty`).toBeGreaterThan(0);
    }
  });

  test('every exhibit image actually loads (naturalWidth > 0)', async ({ page }) => {
    const failed: string[] = [];
    for (const horse of HORSES) {
      const img = page.locator(`article.exhibit#${horse.id} img`).first();
      await img.scrollIntoViewIfNeeded();
      try {
        await expect
          .poll(async () => await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth), {
            timeout: 15_000,
            message: `${horse.id} image did not load`,
          })
          .toBeGreaterThan(0);
      } catch {
        failed.push(horse.id);
      }
    }
    expect(failed, `images that failed to load: ${failed.join(', ')}`).toEqual([]);
  });
});
