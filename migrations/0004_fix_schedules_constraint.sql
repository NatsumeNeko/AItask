-- スケジュールテーブルの制約を修正（デイリーワーク対応）
DROP TABLE IF EXISTS schedules_backup;

-- 既存データをバックアップ
CREATE TABLE schedules_backup AS SELECT * FROM schedules;

-- 古いテーブルを削除
DROP TABLE schedules;

-- 新しいテーブルを作成（外部キー制約を緩和）
CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  -- 外部キー制約を削除（task_id = -1 でデイリーワークを許可）
);

-- データを復元
INSERT OR IGNORE INTO schedules (id, task_id, scheduled_date, start_time, end_time, duration_minutes, created_at)
SELECT id, task_id, scheduled_date, start_time, end_time, duration_minutes, created_at FROM schedules_backup;

-- バックアップテーブルを削除
DROP TABLE schedules_backup;

-- インデックスを再作成
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_schedules_task_id ON schedules(task_id);