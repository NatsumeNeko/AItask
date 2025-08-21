-- Add order field to tasks table for user-defined ordering
ALTER TABLE tasks ADD COLUMN display_order INTEGER DEFAULT 0;

-- Update existing tasks to have sequential order numbers
UPDATE tasks SET display_order = (
  SELECT COUNT(*) 
  FROM tasks t2 
  WHERE t2.id <= tasks.id
);

-- Create index for faster ordering queries
CREATE INDEX IF NOT EXISTS idx_tasks_display_order ON tasks(display_order);