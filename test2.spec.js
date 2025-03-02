const { test, expect } = require('@playwright/test');
const fs = require('fs');
const jsoncParser = require('jsonc-parser');

// JSONCファイルを読み込んで解析する
const expectedResults = jsoncParser.parse(fs.readFileSync('./tests/expected-test1.jsonc', 'utf-8'));

test('フォームの入力テスト', async ({ page }) => {
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
  
  // SQLファイルを読み込む
  const sqlFilePath = './tests/test2.sql'; // 実際のSQLファイルのパス
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
  
  // 1行ずつ処理を行うために、改行で分割
  const sqlLines = sqlContent.split('\n');
  
  // テーブルごとのデータを格納するオブジェクト
  const tablesData = {};
  
  // コメントとSQLを統合してデータを抽出
  let tableLogicName = '';  // テーブル論理名
  let columnLogicNames = [];    // カラム論理名
  let comment = '';     // コメント（データパターン）
  
  // コメントやINSERT文を処理
  sqlLines.forEach(line => {
    const trimmedLine = line.trim();
    
    // テーブル論理名のコメント行を処理
    if (trimmedLine.startsWith('-- テーブル名：')) {
      tableLogicName = trimmedLine.slice('-- テーブル名：'.length);  // テーブル名を抽出
    }
    
    // カラム論理名のコメント行を処理
    else if (trimmedLine.startsWith('-- カラム名：')) {
      columnLogicNames = trimmedLine.slice('-- カラム名：'.length).split(',');  // カラム名を抽出
      columnLogicNames.unshift(''); // コメント用の空列を追加
    }
    
    // データパターンのコメント行を処理
    else if (trimmedLine.startsWith('-- ')) {
      comment = trimmedLine.slice('-- '.length);  // データパターンを抽出
    }
  
    // INSERT INTO 文を処理
    else if (trimmedLine.toUpperCase().startsWith('INSERT INTO')) {
      const regex = /INSERT INTO (\w+)\s?\((.*?)\)\s?VALUES\s?\((.*?)\);/g;
      const match = regex.exec(trimmedLine);
      
      if (match) {
        const tableName = match[1];  // テーブル物理名
        let columns = match[2].split(','); // カラム物理名
        const values = match[3].split(','); // 値
  
        // テーブルの情報を格納
        if (!tablesData[tableName]) {
          tablesData[tableName] = {
            tableLogicName: tableLogicName,  // テーブル論理名
            columnLogicNames: columnLogicNames,  // カラム論理名
            data: [],  // 行データ
          };
  
          // リセット
          tableLogicName = '';  // テーブル論理名
          columnLogicNames = [];    // カラム論理名
        }
  
        // 行データを追加
        const rowData = {};
        rowData['_comment'] = comment;
        columns.forEach((col, index) => {
          rowData[col] = values[index];
        });
  
        tablesData[tableName].data.push(rowData);
  
        // コメントをリセット
        comment = [];
      }
    }
  });
  
  // 抽出されたデータを表示
  console.log(tablesData);
  
  // HTMLに変換して表示
  let htmlContent = `
  <!DOCTYPE html>
  <html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SQL データ表示</title>
    <style>
      table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
      table, th, td { border: 1px solid black; }
      th, td { padding: 8px; text-align: left; }
      h2 { color: #007BFF; }
    </style>
  </head>
  <body>
    <h1>SQLテストデータ</h1>
  `;
  
  Object.keys(tablesData).forEach(tableName => {
    const table = tablesData[tableName];
  
    htmlContent += `
      <h2>テーブル名: ${table.tableLogicName}</h2>
      <table>
        <thead>
          <tr>
            ${table.columnLogicNames.map(col => `<th>${col}</th>`).join('')}
          </tr>
          <tr>
            ${Object.keys(table.data[0]).map(key => `<th>${key}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
    `;
  
    // カラム、値を追加
    table.data.forEach(row => {
      htmlContent += `
        <tr>
          ${Object.values(row).map(value => `<td>${value}</td>`).join('')}
        </tr>
      `;
    });
  
    htmlContent += `
        </tbody>
      </table>
    `;
  });
  
  htmlContent += `
  </body>
  </html>
  `;
  
  // 結果のHTMLをファイルに保存
  fs.writeFileSync('output.html', htmlContent);
  console.log('HTMLファイルを作成しました。');
  


});
