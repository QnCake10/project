const { test, expect } = require('@playwright/test');
const fs = require('fs');
const jsoncParser = require('jsonc-parser');

// JSONCファイルを読み込んで解析する
const expectedResults = jsoncParser.parse(fs.readFileSync('./tests/expected-test1.jsonc', 'utf-8'));

test.describe('1-1 フォームの入力テスト', () => {

  // 各要素に対して入力や選択を行う
  test('テスト', async ({ page }) => {
    await test.step('0. ページを開く', async () => {
      // HTMLページを開く
      await page.setContent(`
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Playwrightテスト用ページ</title>
          <style>
            body { font-family: Arial, sans-serif; }
            .input, .select, .textarea { padding: 10px; margin-bottom: 10px; width: 100%; border: 1px solid #ccc; border-radius: 5px; }
            .button { padding: 10px 20px; background-color: #007BFF; color: white; border: none; border-radius: 5px; cursor: pointer; }
            .button:disabled { background-color: #cccccc; }
          </style>
        </head>
        <body>
          <input type="text" id="name" class="input" placeholder="名前を入力" data-testid="name-input">
          <textarea id="description" class="textarea" placeholder="説明を入力" data-testid="description-textarea"></textarea>
          <input type="checkbox" id="subscribe" name="subscribe" data-testid="subscribe-checkbox">
          <input type="radio" id="radio1" name="choice" value="option1" data-testid="radio-option1">
          <input type="radio" id="radio2" name="choice" value="option2" data-testid="radio-option2">
          <select id="dropdown" class="select" data-testid="dropdown-select">
            <option value="option1">オプション 1</option>
            <option value="option2">オプション 2</option>
          </select>
          <select id="fruit" class="select" data-testid="fruit-select">
            <option value="apple">リンゴ</option>
            <option value="orange">オレンジ</option>
          </select>
          <button id="submitButton" class="button" disabled data-testid="submit-button">送信</button>
        </body>
        </html>
      `);
    });

    await test.step('2. データ入力', async () => {
      await page.fill('[data-testid="name-input"]', expectedResults.nameInput);
      await page.fill('[data-testid="description-textarea"]', expectedResults.descriptionTextarea.value);
      await page.check('[data-testid="subscribe-checkbox"]');
      await page.click('[data-testid="radio-option1"]');
      await page.selectOption('[data-testid="dropdown-select"]', { value: expectedResults.dropdownSelect.selectedOption });
      await page.selectOption('[data-testid="fruit-select"]', { value: expectedResults.fruitSelect.selectedOption });
    });

    await test.step('3. 期待結果1', async () => {
      // 送信ボタンが有効になっていることを確認
      await expect.soft(page.locator('[data-testid="submit-button"]')).toBeDisabled();
    });

    await test.step('4. 期待結果2', async () => {
      // 期待結果の確認
      await expect.soft(page.locator('[data-testid="name-input"]')).toHaveValue(expectedResults.nameInput);
      await expect.soft(page.locator('[data-testid="description-textarea"]')).toHaveValue(expectedResults.descriptionTextarea.value);
      await expect.soft(page.locator('[data-testid="subscribe-checkbox"]')).toBeChecked();
      await expect.soft(page.locator('[data-testid="radio-option1"]')).toBeChecked();
      await expect.soft(page.locator('[data-testid="dropdown-select"]')).toHaveValue(expectedResults.dropdownSelect.selectedOption);
      await expect.soft(page.locator('[data-testid="fruit-select"]')).toHaveValue(expectedResults.fruitSelect.selectedOption);
    });
    
  });
});
