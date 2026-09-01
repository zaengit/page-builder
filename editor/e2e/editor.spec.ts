import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const definitions = [{ name: 'core/heading', title: 'Heading', category: 'text', version: 1, description: 'Heading block', attributes: { text: { type: 'string', label: 'Text', default: 'Hello' }, level: { type: 'select', label: 'Level', default: 2, options: [1, 2, 3] } } }];

async function captureEditor(page: Page, name: string): Promise<void> {
  await mkdir('artifacts/screenshots', { recursive: true });
  await page.screenshot({ path: `artifacts/screenshots/${name}.png`, fullPage: true });
}

async function addHeading(page: Page): Promise<void> {
  await page.getByRole('combobox', { name: 'Add block' }).filter({ visible: true }).click();
  await page.getByRole('option', { name: 'Heading', exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/page-builder/blocks', route => route.fulfill({ json: definitions }));
  await page.route('**/api/page-builder/render-page', async route => {
    const body = route.request().postDataJSON();
    const text = body.blocks?.[0]?.attrs?.text ?? '';
    await route.fulfill({ json: { html: `<main style="font-family:system-ui;padding:48px"><h2 style="font-size:42px">${text}</h2><p>Responsive page preview</p></main>`, assets: { css: [], js: [] } } });
  });
  await page.goto('/');
});

test('desktop workspace edits, previews, and supports keyboard history', async ({ page }) => {
  await addHeading(page);
  await expect(page.getByRole('button', { name: 'Heading', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const text = page.getByLabel('Text');
  await text.fill('Production title');
  const preview = page.frameLocator('iframe[title="Page builder preview"]');
  await expect(preview.locator('h2')).toHaveText('Production title');
  await expect(page.getByRole('complementary', { name: 'Block inspector' })).toBeVisible();
  await expect(page.getByLabel('Desktop preview')).toHaveAttribute('data-state', 'on');
  await captureEditor(page, 'page-builder-desktop');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z');
  await expect(text).toHaveValue('Hello');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+Z' : 'Control+Y');
  await expect(text).toHaveValue('Production title');
});

test('desktop exposes keyboard-accessible drag controls', async ({ page }) => {
  await addHeading(page);
  const move = page.getByRole('button', { name: 'Move Heading', exact: true });
  await move.focus();
  await expect(move).toBeFocused();
  await expect(page.getByLabel('Text')).toBeVisible();
});

test.describe('mobile workspace', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('uses sheets for blocks and inspector and supports mobile preview', async ({ page }) => {
    await page.getByLabel('Open blocks panel').click();
    await addHeading(page);
    await page.getByRole('button', { name: 'Close' }).click();

    await page.getByLabel('Mobile preview').click();
    await expect(page.getByLabel('Mobile preview')).toHaveAttribute('data-state', 'on');
    await expect(page.getByRole('complementary', { name: 'Block inspector' })).toBeHidden();

    await page.getByLabel('Open inspector panel').click();
    await expect(page.getByLabel('Text').filter({ visible: true })).toBeVisible();
    await page.getByLabel('Text').filter({ visible: true }).fill('Mobile title');
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.frameLocator('iframe[title="Page builder preview"]').locator('h2')).toHaveText('Mobile title');
    await captureEditor(page, 'page-builder-mobile');
  });
});
