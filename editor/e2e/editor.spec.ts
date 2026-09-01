import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const definitions = [{ name: 'core/heading', title: 'Heading', category: 'text', version: 1, description: 'Heading block', attributes: { text: { type: 'string', label: 'Text', default: 'Hello' }, level: { type: 'select', label: 'Level', default: 2, options: [1, 2, 3] } } }];

async function captureEditor(page: Page, name: string): Promise<void> {
  await mkdir('artifacts/screenshots', { recursive: true });
  await page.screenshot({ path: `artifacts/screenshots/${name}.png`, fullPage: true });
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/page-builder/blocks', route => route.fulfill({ json: definitions }));
  await page.route('**/api/page-builder/render-page', async route => {
    const body = route.request().postDataJSON();
    const text = body.blocks?.[0]?.attrs?.text ?? '';
    await route.fulfill({ json: { html: `<h2>${text}</h2>`, assets: { css: [], js: [] } } });
  });
  await page.goto('/');
});

test('edits a block, previews it, and supports keyboard history', async ({ page }) => {
  await page.getByLabel('Add block').selectOption('core/heading');
  await expect(page.getByRole('button', { name: 'Heading', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const text = page.getByLabel('Text');
  await text.fill('Production title');
  const preview = page.frameLocator('iframe[title="Page builder preview"]');
  await expect(preview.locator('h2')).toHaveText('Production title');
  await captureEditor(page, 'page-builder-edited');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z');
  await expect(text).toHaveValue('Hello');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+Z' : 'Control+Y');
  await expect(text).toHaveValue('Production title');
});

test('exposes keyboard-accessible editor controls', async ({ page }) => {
  const inserter = page.getByLabel('Add block');
  await inserter.focus();
  await expect(inserter).toBeFocused();
  await inserter.selectOption('core/heading');

  const move = page.getByRole('button', { name: 'Move Heading', exact: true });
  await move.focus();
  await expect(move).toBeFocused();
  await expect(page.getByRole('complementary', { name: 'Block inspector' })).toBeVisible();
  await expect(page.getByLabel('Text')).toBeVisible();
  await captureEditor(page, 'page-builder-keyboard');
});
