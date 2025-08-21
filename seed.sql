-- テスト用データ挿入
INSERT OR IGNORE INTO tasks (name, priority, deadline, estimated_duration, status, display_order) VALUES 
  ('プレゼンテーション資料作成', '高い', '2025-08-25', 120, 'pending', 1),
  ('レポート提出', '中', '2025-08-30', 180, 'pending', 2),
  ('会議資料準備', '高い', '2025-08-23', 60, 'pending', 3),
  ('データ分析', '低い', '2025-09-05', 240, 'pending', 4),
  ('メール返信', '中', '2025-08-22', 30, 'pending', 5);

-- テスト用休日データ
INSERT OR IGNORE INTO holidays (holiday_date, holiday_name, is_recurring) VALUES 
  ('2025-08-24', '夏休み', FALSE),
  ('2025-12-25', 'クリスマス', TRUE),
  ('2025-01-01', '元日', TRUE);

-- 確認用クエリ（コメントアウト）
-- SELECT * FROM tasks ORDER BY deadline;
-- SELECT * FROM settings;
-- SELECT * FROM holidays;