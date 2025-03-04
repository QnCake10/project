const { test, expect } = require('@playwright/test');
import * as allure from "allure-js-commons";
import { ContentType } from "allure-js-commons";
const fs = require('fs');
const jsoncParser = require('jsonc-parser');
const path = require('path');
import { mapToDiff2Html, getInsertDataMap, mapToHtml } from 'C:/git/work/test/tests/common';

// 出力用ファイル名
const exportFileName = path.basename(__filename, path.extname(__filename));

// JSONCファイルを読み込んで解析する
const expectedResults = jsoncParser.parse(fs.readFileSync('./tests/expected-test1.jsonc', 'utf-8'));

test('フォームの入力テスト', async ({ page }, testInfo ) => {
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

  // 各要素に対して入力や選択を行う
  await page.fill('[data-testid="name-input"]', expectedResults.nameInput);
  await page.fill('[data-testid="description-textarea"]', expectedResults.descriptionTextarea.value);
  await page.check('[data-testid="subscribe-checkbox"]');
  await page.click('[data-testid="radio-option1"]');
  await page.selectOption('[data-testid="dropdown-select"]', { value: expectedResults.dropdownSelect.selectedOption });
  await page.selectOption('[data-testid="fruit-select"]', { value: expectedResults.fruitSelect.selectedOption });
  // スクショ
  await page.screenshot({ path: 'screenshot.png' });

  // 期待結果の確認
  await expect.soft(page.locator('[data-testid="fruit-select"]')).toHaveValue(expectedResults.fruitSelect.selectedOption);

  const sqlFilePath = './tests/test2.sql'; // 実際のSQLファイルのパス
  const exportTestDataPath = exportFileName + '_TestData.html';
  
  const testDataMap = getInsertDataMap(sqlFilePath);
  // 結果のHTMLをファイルに保存
  await allure.attachment("before", mapToHtml(testDataMap), ContentType.HTML);

  const sqlFilePath1 = './tests/test2_after.sql'; // 実際のSQLファイルのパス
  const afterDataMap = getInsertDataMap(sqlFilePath1)
  // 結果のHTMLをファイルに保存
  await allure.attachment("after", mapToHtml(afterDataMap), ContentType.HTML);

  // 結果のHTMLをファイルに保存
  await allure.attachment("diff", mapToDiff2Html(testDataMap, afterDataMap), ContentType.HTML);
});


