import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const sample = [{
  id: 'test-001', nom: 'Kouassi', prenoms: 'Aïcha & <Mari>', sexe: 'Femme',
  date_naissance: '2002-04-03', telephone: '+225 07 00 00 00 00', email: 'aicha@example.ci',
  adresse: 'Côte d’Ivoire, Abidjan', niveau: 'Bac+3', etablissement: 'ESATIC',
  photo_url: 'portraits/test.jpg', created_at: '2026-09-30T10:00:00Z',
}];

test('form validates required fields and admin route explains missing Supabase setup', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /La prochaine étape/ })).toBeVisible();
  await page.getByRole('button', { name: /Envoyer mon inscription/ }).click();
  await expect(page.getByText('Ce champ est obligatoire.').first()).toBeVisible();
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Connectez Supabase' })).toBeVisible();
});

test('Excel export creates a valid formatted XLSX with all columns and escaped data', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async rows => {
    const { exportInscriptions } = await import('/src/utils/exportExcel.js');
    const original = URL.createObjectURL;
    let file;
    URL.createObjectURL = blob => { file = blob; return 'blob:test'; };
    await exportInscriptions(rows);
    URL.createObjectURL = original;
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    return { filename: `inscriptions_${new Date().toISOString().slice(0, 10).replaceAll('-', '_')}.xlsx`, base64: btoa(binary) };
  }, sample);
  expect(result.filename).toMatch(/^inscriptions_\d{4}_\d{2}_\d{2}\.xlsx$/);
  const filePath = path.join(process.env.TEMP || process.env.TMP || '.', 'forma-test.xlsx');
  await fs.writeFile(filePath, Buffer.from(result.base64, 'base64'));
  const output = execFileSync('python', ['-c', 'import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); print("CHECK="+(z.testzip() or "OK")); print(z.read("xl/worksheets/sheet1.xml").decode("utf-8"))', filePath], { encoding: 'utf8' });
  expect(output).toContain('CHECK=OK');
  expect(output).toContain('REGISTRE DES INSCRIPTIONS');
  expect(output).toContain('Aïcha &amp; &lt;Mari&gt;');
  expect(output).toContain('Exporté le');
  for (const header of ['Identifiant', 'Nom', 'Prénoms', 'Sexe', 'Date de naissance', 'Téléphone', 'Email', 'Adresse (pays et ville)', 'Niveau d’étude', 'Établissement', 'Portrait (URL)', 'Date d’inscription']) expect(output).toContain(header);
  await fs.rm(filePath, { force: true });
});
