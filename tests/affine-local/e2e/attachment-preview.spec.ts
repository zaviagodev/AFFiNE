/* eslint-disable unicorn/prefer-dom-node-dataset */
import path from 'node:path';

import { test } from '@affine-test/kit/playwright';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  getBlockSuiteEditorTitle,
  waitForEditorLoad,
} from '@affine-test/kit/utils/page-logic';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

async function clickPeekViewControl(page: Page, n = 0) {
  await page.getByTestId('peek-view-control').nth(n).click();
  await page.waitForTimeout(500);
}

async function insertAttachment(page: Page, filepath: string) {
  await page.evaluate(() => {
    // Force fallback to input[type=file] in tests
    // See https://github.com/microsoft/playwright/issues/8850
    // @ts-expect-error allow
    window.showOpenFilePicker = undefined;
  });

  const fileChooser = page.waitForEvent('filechooser');

  // open slash menu
  await page.keyboard.type('/attachment', { delay: 50 });
  await page.keyboard.press('Enter');

  await (await fileChooser).setFiles(filepath);
}

test('attachment preview should be shown', async ({ page }) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page);
  const title = getBlockSuiteEditorTitle(page);
  await title.click();
  await page.keyboard.press('Enter');

  await insertAttachment(
    page,
    path.join(__dirname, '../../fixtures/lorem-ipsum.pdf')
  );

  await page.locator('affine-attachment').first().dblclick();

  const attachmentViewer = page.getByTestId('attachment-viewer');
  await expect(attachmentViewer).toBeVisible();

  await page.waitForTimeout(500);

  const pageCount = attachmentViewer.locator('.page-count');
  expect(await pageCount.textContent()).toBe('1');
  const pageTotal = attachmentViewer.locator('.page-total');
  expect(await pageTotal.textContent()).toBe('3');

  const thumbnails = attachmentViewer.locator('.thumbnails');
  await thumbnails.locator('button').click();

  await page.waitForTimeout(500);

  expect(
    await thumbnails
      .getByTestId('virtuoso-item-list')
      .locator('[data-item-index]')
      .count()
  ).toBe(3);

  await clickPeekViewControl(page);
  await expect(attachmentViewer).not.toBeVisible();
});

test('attachment preview can be expanded', async ({ page }) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page);
  const title = getBlockSuiteEditorTitle(page);
  await title.click();
  await page.keyboard.press('Enter');

  await insertAttachment(
    page,
    path.join(__dirname, '../../fixtures/lorem-ipsum.pdf')
  );

  await page.locator('affine-attachment').first().dblclick();

  const attachmentViewer = page.getByTestId('attachment-viewer');

  await page.waitForTimeout(500);

  await expect(attachmentViewer).toBeVisible();

  await clickPeekViewControl(page, 1);

  await page.waitForTimeout(500);

  const pageCount = attachmentViewer.locator('.page-count');
  expect(await pageCount.textContent()).toBe('1');
  const pageTotal = attachmentViewer.locator('.page-total');
  expect(await pageTotal.textContent()).toBe('3');

  const thumbnails = attachmentViewer.locator('.thumbnails');
  await thumbnails.locator('button').click();

  await page.waitForTimeout(500);

  expect(
    await thumbnails
      .getByTestId('virtuoso-item-list')
      .locator('[data-item-index]')
      .count()
  ).toBe(3);
});
