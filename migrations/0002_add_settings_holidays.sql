-- 設定テーブル - アプリ全体の設定管理
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 休日テーブル - カスタム休日設定
CREATE TABLE IF NOT EXISTS holidays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  holiday_date DATE UNIQUE NOT NULL,
  holiday_name TEXT,
  is_recurring BOOLEAN DEFAULT FALSE, -- 毎年繰り返すか
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- デフォルト設定値を挿入
INSERT OR IGNORE INTO settings (setting_key, setting_value) VALUES 
  ('buffer_minutes', '0'),  -- 1日の追加バッファ時間（分）
  ('work_start_hour', '9'), -- 作業開始時間
  ('work_end_hour', '18'),  -- 作業終了時間
  ('default_task_buffer', '30'); -- タスクごとのデフォルトバッファ

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);