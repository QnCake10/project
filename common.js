const fs = require('fs');
const jsonc = require('jsonc-parser');
const diff = require('diff');
const Diff2Html = require('diff2html');

function mapToDiff2Html(map1, map2){
  let diffHtml = "";
  for (let [key, value1] of map1) {
    if (map2.has(key)) {
      const value2 = map2.get(key);
      diffHtml += getDiffHtml(key, value1, value2);
    }
  }

  const htmlContent = `
    <!doctype html>
      <!-- CSS -->
      <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/diff2html/bundles/css/diff2html.min.css" />

      <!-- Javascripts -->
      <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/diff2html/bundles/js/diff2html.min.js"></script>
    <html>
      <head>
        <title>diff2html</title>
      </head>
      <body>
        <div id="diffHtml">${diffHtml}</div>
      </body>
    </html>
    `;

  return htmlContent;
}

function getDiffHtml(key, value1, value2){

  // MapデータをJSON形式の文字列に変換
  const value1Str = JSON.stringify(value1, null, 2);
  const value2Str = JSON.stringify(value2, null, 2);

  // 差分を取得
  const diffResult = diff.createPatch(key, value1Str, value2Str);

  // diff2htmlを使って差分をHTMLに変換
  const diffHtml = Diff2Html.html(diffResult, {
    inputFormat: 'diff', // 入力形式（差分）
    showFiles: false,     // ファイル名を表示しない
    matching: 'words',    // words単位で比較
    outputFormat: 'line-by-line' // 横並びじゃない
  });

  return diffHtml;
}

// SQLファイルを読み込み、パースしてデータを抽出する関数
function getInsertDataMap(filePath) {
  const sqlContent = fs.readFileSync(filePath, 'utf-8');
  
  // 1行ずつ処理を行うために、改行で分割
  const sqlLines = sqlContent.split('\n');
  
  // テーブルごとのデータを格納するMap
  const tablesData = new Map();
  
  let tableLogicName = '';  // テーブル論理名
  let columnLogicNames = [];    // カラム論理名
  let comment = '';     // コメント（データパターン）
  
  // コメントやINSERT文を処理
  sqlLines.forEach(line => {
    const trimmedLine = line.trim();
    
    // テーブル論理名のコメント行を処理
    if (trimmedLine.startsWith('-- テーブル名：')) {
      tableLogicName = trimmedLine.slice('-- テーブル名：'.length).trim();  // テーブル名を抽出
    }
    
    // カラム論理名のコメント行を処理
    else if (trimmedLine.startsWith('-- カラム名：')) {
      columnLogicNames = trimmedLine.slice('-- カラム名：'.length).split(',').map(col => col.trim());  // カラム名を抽出
    }
    
    // データパターンのコメント行を処理
    else if (trimmedLine.startsWith('-- ')) {
      comment = trimmedLine.slice('-- '.length).trim();  // データパターンを抽出
    }

    // INSERT INTO 文を処理
    else if (trimmedLine.toUpperCase().startsWith('INSERT INTO')) {
      const regex = /INSERT INTO `?(\w+)`?\s?\((.*?)\)\s?VALUES\s?\((.*?)\);/g;
      const match = regex.exec(trimmedLine);
      
      if (match) {
        const tableName = match[1];  // テーブル物理名
        let columns = match[2].split(',').map(col => col.trim()); // カラム物理名
        const values = match[3].split(',').map(val => val.trim().replace(/'|"/g, '')); // 値をトリミングして引用符を削除

        if (!tablesData.has(tableName)) {
          // Mapのsetメソッドを使ってテーブル情報を格納
          tablesData.set(tableName, {
            tableLogicName: tableLogicName,  // テーブル論理名
            columnLogicNames: columnLogicNames,  // カラム論理名
            data: [],  // 行データ
          });
          
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
        
        // Mapのgetメソッドで対象のテーブル情報を取得し、データを追加
        tablesData.get(tableName).data.push(rowData);

        // コメントをリセット
        comment = '';
      }
    }
  });

  return tablesData;
}


function mapToHtml(tablesData) {
  let htmlContent = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.10.5/font/bootstrap-icons.min.css" rel="stylesheet">
    
    <!-- Bootstrap 5のJavaScript -->
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.6/dist/umd/popper.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.min.js"></script>

    <style>
    body { margin: 2em; position: relative; }
    .item { margin-bottom: 20px; }
    .table-header {
      cursor: pointer;
      display: flex;
      align-items: center;
      background: #f8f9fa;
      padding: 10px;
      border: 1px solid #ddd;
      font-size: 18px;
      font-weight: bold;
    }

    .chevron-icon {
      margin-right: 10px;
      transition: transform 0.3s ease-in-out;
      font-size: 22px;
      color: #4a4a4a; /* ダークグレー */
    }
    .resizable {resize: horizontal; overflow: auto;}
      table {table-layout: fixed; width: 100%;}
      th, td {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        position: relative;
        padding: 10px;
      }
    td._comment {width: 15%; word-wrap: break-word; white-space: normal;}
    td:not(._comment) {
      width: calc(85% / var(--columns)); 
      position: relative;
    }

    .collapsed .chevron-icon {
      transform: rotate(0deg);
    }

    .copy-btn {
      background: white; /* 白背景 */
      border: 1px solid #ccc; /* ボーダー */
      cursor: pointer;
      font-size: 14px;
      color: #6c757d;
      padding: 2px 4px;
      border-radius: 4px;
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      transition: background 0.3s, transform 0.2s;
      align-items: center;
      min-width: 24px;
    }

    .copy-btn i {
      font-size: 14px;
    }

    .copy-btn:hover {
      background: #f8f9fa; /* ホバー時の色変更 */
      transform: translateY(-50%) scale(1.1);
    }

    /* ツールチップ吹き出しのスタイル */
    [data-bs-toggle="tooltip"] {
      position: relative;
      cursor: pointer;
    }

    /* コピー通知 */
    #copy-notification {
      display: none;
      position: fixed;
      top: 5%;
      left: 50%;
      transform: translateX(-50%);
      background:rgb(109, 178, 117);
      color: white;
      padding: 8px 16px;
      font-size: 12px;
      border-radius: 5px 5px 5px 5px;
      z-index: 1000;
      box-shadow: 0 4px 6px rgba(119, 120, 119, 0.1);
    }
  </style>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Bootstrap 5 のツールチップの初期化
      var tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
      tooltipTriggerList.forEach(function(tooltipTriggerEl) {
        new bootstrap.Tooltip(tooltipTriggerEl);
      });

      document.querySelectorAll('.table-header').forEach(function(header) {
        header.addEventListener('click', function() {
          var tableContainer = this.nextElementSibling;
          tableContainer.style.display = tableContainer.style.display === 'none' ? 'block' : 'none';
          this.classList.toggle('collapsed');
          var chevronIcon = this.querySelector('.chevron-icon');
          chevronIcon.classList.toggle('bi-caret-down-fill');
          chevronIcon.classList.toggle('bi-caret-right-fill');
        });
      });

      // コピー処理
      document.querySelectorAll('.copy-btn').forEach(function(button) {
        button.addEventListener('click', function() {
          const text = this.previousElementSibling.textContent.trim();
          // テキストを選択するために一時的にテキストエリアを作成
          var textArea = document.createElement('textarea');
          textArea.value = text;
          document.body.appendChild(textArea);
          
          // テキストを選択してコピー
          textArea.select();
          document.execCommand('copy');  // コピー処理

          // コピー後に通知を表示
          var notification = document.getElementById('copy-notification');
          notification.style.display = 'block';
          setTimeout(function() {
            notification.style.display = 'none';
          }, 2000);

          // 一時的に作成したテキストエリアを削除
          document.body.removeChild(textArea);
        });
      });
    });
  </script>

    <title>SQL データ表示</title>
    </head>
    <body>
      <div id="copy-notification">コピーしました</div>
      <h1></h1>
  `;

  htmlContent += `</div>`;

  Object.keys(tablesData).forEach(tableName => {
    const table = tablesData[tableName];
    const tableLogicName = table.tableLogicName || tableName;
    const columnCount = Object.keys(table.data[0] || {}).length - 1;

    htmlContent += `
      <div class="item">
        <div class="table-header">
          <i class="bi bi-caret-down-fill chevron-icon"></i>
          <span>${tableLogicName}</span>
        </div>
        <div id="${tableLogicName}_table" class="table-container">
          <table class="table table-striped table-bordered" style="--columns: ${columnCount};">
            <thead>
              <tr>
    `;

    htmlContent += `<th class="resizable"></th>`;
    if (table.columnLogicNames.length > 0) {
      htmlContent += table.columnLogicNames.map(col => `<th class="resizable">${col}</th>`).join('');
    } else {
      htmlContent += Object.keys(table.data[0]).map(key => `<th class="resizable">${key}</th>`).join('');
    }

    htmlContent += `</tr></thead><tbody>`;

    table.data.forEach(row => {
      htmlContent += `<tr role="row" class="even">`;
      Object.keys(row).forEach(key => {
        if (key === "_comment") {
          htmlContent += `<td class="_comment">${row[key]}</td>`;
        } else {
          htmlContent += `
            <td data-toggle="tooltip" title="${row[key]}" style="position: relative;">
              <span class="copy-text">${row[key]}</span>
              <button class="copy-btn">
                <i class="bi bi-clipboard"></i>
              </button>
            </td>
          `;
        }
      });
      htmlContent += `</tr>`;
    });

    htmlContent += `</tbody></table></div></div>`;
  });

  htmlContent += `</body></html>`;
  return htmlContent;
}

export { mapToDiff2Html, getInsertDataMap, mapToHtml };