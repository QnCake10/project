-- テーブル名：ユーザ
-- カラム名：ID,名前,年齢
-- データ①
INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30);
-- データ②
INSERT INTO users (id, name, age) VALUES (2, 'Bob', 25);

-- テーブル名：オーダー
-- カラム名：id,ユーザID,数量
INSERT INTO orders (order_id, user_id, amount) VALUES (101, 1, 500);
INSERT INTO orders (order_id, user_id, amount) VALUES (102, 2, 300);
