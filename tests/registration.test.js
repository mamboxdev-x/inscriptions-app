import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

const fixture = {
  id: 'uuid-1', nom: 'Kouassi', prenoms: 'Aïcha', sexe: 'Femme', date_naissance: '2002-04-03',
  telephone: '+225 07 00 00 00 00', email: 'aicha@example.ci', adresse: 'Côte d’Ivoire, Abidjan',
  niveau: 'Bac+3', etablissement: 'ESATIC', photo_url: null, created_at: '2026-09-30T10:00:00Z', total_count: 1,
};

test.skip('complete registration submits validated details and portrait (requires configured Supabase)', async ({ page }) => {
  await page.goto('/');
  await page.route('**/storage/v1/object/portraits/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: 'portraits/test.jpg' }) }));
  await page.route('**/rest/v1/inscriptions*', async route => {
    const payload = route.request().postDataJSON();
    expect(payload).toMatchObject({ nom: 'Kouassi', prenoms: 'Aïcha', sexe: 'Femme', adresse: 'Côte d’Ivoire, Abidjan', niveau: 'Bac+3', etablissement: 'ESATIC', photo_url: expect.stringMatching(/^portraits\/[0-9a-f-]{36}\.jpg$/) });
    await route.fulfill({ status: 201, headers: { 'content-type': 'application/json' }, body: '' });
  });
  await page.getByLabel('Nom *').fill('Kouassi');
  await page.getByLabel('Prénoms *').fill('Aïcha');
  await page.getByLabel('Sexe *').selectOption('Femme');
  await page.getByLabel('Date de naissance *').fill('2002-04-03');
  await page.getByLabel('Téléphone *').fill('+225 07 00 00 00 00');
  await page.getByLabel('Adresse e-mail *').fill('aicha@example.ci');
  await page.getByLabel('Pays *').fill('Côte d’Ivoire');
  await page.getByLabel('Ville *').fill('Abidjan');
  await page.getByLabel('Niveau d’étude *').selectOption('Bac+3');
  await page.getByLabel('Établissement *').fill('ESATIC');
  const fixturePath = 'tests/portrait-fixture.jpg';
  await fs.writeFile(fixturePath, Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AX//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AX//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Amf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IT//2Q==', 'base64'));
  await page.getByLabel('Portrait professionnel *').setInputFiles(fixturePath);
  await page.getByRole('button', { name: /Envoyer mon inscription/ }).click();
  await expect(page.getByText(/Votre inscription a bien été enregistrée/)).toBeVisible();
  await fs.rm(fixturePath, { force: true });
});

test.skip('admin dashboard displays and filters secured signed-in registrations (requires configured Supabase)', async ({ page }) => {
  await page.goto('/admin');
  const user = { id: 'admin-1', aud: 'authenticated', role: 'authenticated', email: 'admin@example.ci', app_metadata: { role: 'admin', provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: '2026-09-30T10:00:00Z' };
  await page.route('**/auth/v1/**', async route => {
    if (route.request().method() === 'GET') await route.fulfill({ json: { access_token: 'mock-access', token_type: 'bearer', expires_in: 3600, refresh_token: 'mock-refresh', user } });
    else await route.fulfill({ json: { access_token: 'mock-access', token_type: 'bearer', expires_in: 3600, refresh_token: 'mock-refresh', user } });
  });
  await page.route('**/rest/v1/rpc/admin_list_inscriptions', route => route.fulfill({ json: [fixture] }));
  await page.route('**/rest/v1/rpc/admin_count_inscriptions', route => route.fulfill({ json: 1 }));
  await page.route('**/rest/v1/rpc/admin_export_inscriptions', route => route.fulfill({ json: [fixture] }));
  await page.route('**/rest/v1/inscriptions?select=adresse%2Cniveau*', route => route.fulfill({ json: [{ adresse: fixture.adresse, niveau: fixture.niveau }] }));
  await page.evaluate(() => {
    localStorage.setItem('inscriptions-app-auth-token', JSON.stringify({ access_token: 'mock-access', token_type: 'bearer', expires_in: 3600, refresh_token: 'mock-refresh', user: { id: 'admin-1', aud: 'authenticated', role: 'authenticated', email: 'admin@example.ci', app_metadata: { role: 'admin', provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: '2026-09-30T10:00:00Z' } }));
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Les inscriptions' })).toBeVisible();
  await expect(page.getByText('Kouassi')).toBeVisible();
  await expect(page.getByText('Aïcha')).toBeVisible();
  await expect(page.getByText('1', { exact: true }).first()).toBeVisible();
});
