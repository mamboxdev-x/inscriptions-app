import { test, expect } from '@playwright/test';

test('registration form offers promotions IT12 through IT30', async ({ page }) => {
  await page.goto('/');
  const options = await page.getByLabel('Promotion *').locator('option').allTextContents();
  expect(options).toEqual(['Sélectionner votre promotion', ...Array.from({ length: 19 }, (_, index) => `IT${index + 12}`)]);
});
