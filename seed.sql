-- テスト用データ挿入
INSERT OR IGNORE INTO tasks (name, priority, deadline, estimated_duration, status) VALUES 
  ('プレゼンテーション資料作成', '高い', '2025-08-25', 120, 'pending'),
  ('レポート提出', '中', '2025-08-30', 180, 'pending'),
  ('会議資料準備', '高い', '2025-08-23', 60, 'pending'),
  ('データ分析', '低い', '2025-09-05', 240, 'pending'),
  ('メール返信', '中', '2025-08-22', 30, 'pending');

-- 確認用クエリ（コメントアウト）
-- SELECT * FROM tasks ORDER BY deadline;