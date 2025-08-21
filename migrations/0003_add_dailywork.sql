-- デイリーワーク設定を追加
INSERT OR IGNORE INTO settings (setting_key, setting_value) VALUES 
  ('daily_work_minutes', '0'),  -- デイリーワーク時間（分）
  ('daily_work_name', 'デイリーワーク'); -- デイリーワーク名