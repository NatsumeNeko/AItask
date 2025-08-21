import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { renderer } from './renderer'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS設定
app.use('/api/*', cors())

// レンダラー設定
app.use(renderer)

// API Routes - タスク管理
app.get('/api/tasks', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM tasks 
      ORDER BY 
        CASE priority 
          WHEN '高い' THEN 1 
          WHEN '中' THEN 2 
          WHEN '低い' THEN 3 
        END,
        deadline
    `).all()
    
    return c.json({ tasks: results })
  } catch (error) {
    return c.json({ error: 'Failed to fetch tasks' }, 500)
  }
})

app.post('/api/tasks', async (c) => {
  try {
    const { name, priority, deadline, estimated_duration } = await c.req.json()
    
    // タスクを作成
    const result = await c.env.DB.prepare(`
      INSERT INTO tasks (name, priority, deadline, estimated_duration)
      VALUES (?, ?, ?, ?)
    `).bind(name, priority, deadline, estimated_duration).run()
    
    if (result.success) {
      const taskId = result.meta.last_row_id
      
      // 自動スケジューリングを実行
      await autoScheduleTask(c.env.DB, taskId, { name, priority, deadline, estimated_duration })
      
      return c.json({ 
        id: taskId, 
        name, 
        priority, 
        deadline, 
        estimated_duration,
        status: 'pending'
      })
    } else {
      return c.json({ error: 'Failed to create task' }, 500)
    }
  } catch (error) {
    return c.json({ error: 'Invalid task data' }, 400)
  }
})

// 自動スケジューリング関数
async function autoScheduleTask(db: D1Database, taskId: number, task: any) {
  try {
    // 1. 期限から3日前までの期間を計算
    const deadline = new Date(task.deadline)
    const startDate = new Date()
    const endDate = new Date(deadline)
    endDate.setDate(endDate.getDate() - 3) // 3日の余裕
    
    // 期限が近すぎる場合は明日から開始
    if (endDate <= startDate) {
      endDate.setTime(deadline.getTime())
    }
    
    // 2. 作業時間を計算（所要時間 + 30分バッファ）
    const totalMinutes = task.estimated_duration + 30
    
    // 3. 利用可能な時間スロットを検索（9:00-18:00の間）
    const workingHours = { start: 9, end: 18 }
    const timeSlot = await findAvailableTimeSlot(db, startDate, endDate, totalMinutes, workingHours)
    
    if (timeSlot) {
      // 4. スケジュールに登録
      await db.prepare(`
        INSERT INTO schedules (task_id, scheduled_date, start_time, end_time, duration_minutes)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        taskId,
        timeSlot.date,
        timeSlot.startTime,
        timeSlot.endTime,
        totalMinutes
      ).run()
    }
  } catch (error) {
    console.error('Auto scheduling failed:', error)
  }
}

// 利用可能な時間スロットを検索
async function findAvailableTimeSlot(db: D1Database, startDate: Date, endDate: Date, durationMinutes: number, workingHours: any) {
  const currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    // 土日をスキップ
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate.setDate(currentDate.getDate() + 1)
      continue
    }
    
    const dateStr = currentDate.toISOString().split('T')[0]
    
    // その日の既存スケジュールを取得
    const { results: existingSchedules } = await db.prepare(`
      SELECT start_time, end_time FROM schedules 
      WHERE scheduled_date = ? 
      ORDER BY start_time
    `).bind(dateStr).all()
    
    // 利用可能な時間スロットを検索
    const availableSlot = findTimeSlotInDay(existingSchedules, workingHours, durationMinutes)
    
    if (availableSlot) {
      return {
        date: dateStr,
        startTime: availableSlot.start,
        endTime: availableSlot.end
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return null
}

// 1日の中で利用可能な時間スロットを検索
function findTimeSlotInDay(existingSchedules: any[], workingHours: any, durationMinutes: number) {
  const workStartMinutes = workingHours.start * 60 // 9:00 = 540分
  const workEndMinutes = workingHours.end * 60     // 18:00 = 1080分
  
  // 既存のスケジュールを時間（分）に変換
  const busySlots = existingSchedules.map(schedule => ({
    start: timeToMinutes(schedule.start_time),
    end: timeToMinutes(schedule.end_time)
  }))
  
  // 利用可能な時間を検索
  let searchStart = workStartMinutes
  
  for (const busySlot of busySlots) {
    // 現在の検索開始時間から忙しい時間まで十分な空きがあるかチェック
    if (busySlot.start - searchStart >= durationMinutes) {
      return {
        start: minutesToTime(searchStart),
        end: minutesToTime(searchStart + durationMinutes)
      }
    }
    searchStart = busySlot.end
  }
  
  // 最後のスケジュール後に空きがあるかチェック
  if (workEndMinutes - searchStart >= durationMinutes) {
    return {
      start: minutesToTime(searchStart),
      end: minutesToTime(searchStart + durationMinutes)
    }
  }
  
  return null
}

// 時間文字列を分に変換 (例: "09:30" -> 570)
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

// 分を時間文字列に変換 (例: 570 -> "09:30")
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

app.put('/api/tasks/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { name, priority, deadline, estimated_duration, status, actual_duration } = await c.req.json()
    
    const result = await c.env.DB.prepare(`
      UPDATE tasks 
      SET name = ?, priority = ?, deadline = ?, estimated_duration = ?, status = ?, actual_duration = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(name, priority, deadline, estimated_duration, status, actual_duration || 0, id).run()
    
    if (result.success) {
      // 実際の時間が想定を超えた場合、自動調整を試行
      if (actual_duration && actual_duration > estimated_duration) {
        await handleTimeOverrun(c.env.DB, parseInt(id), actual_duration, estimated_duration)
      }
      
      return c.json({ message: 'Task updated successfully' })
    } else {
      return c.json({ error: 'Task not found' }, 404)
    }
  } catch (error) {
    return c.json({ error: 'Invalid task data' }, 400)
  }
})

// 時間超過時の自動調整処理
async function handleTimeOverrun(db: D1Database, taskId: number, actualDuration: number, estimatedDuration: number) {
  try {
    const overrunMinutes = actualDuration - estimatedDuration
    
    // 該当タスクのスケジュールを取得
    const { results: currentSchedule } = await db.prepare(`
      SELECT * FROM schedules WHERE task_id = ? LIMIT 1
    `).bind(taskId).all()
    
    if (currentSchedule.length === 0) return
    
    const schedule = currentSchedule[0]
    const scheduleDate = schedule.scheduled_date
    
    // 同じ日の後続タスクを取得
    const { results: laterTasks } = await db.prepare(`
      SELECT s.*, t.name as task_name FROM schedules s
      JOIN tasks t ON s.task_id = t.id
      WHERE s.scheduled_date = ? AND s.start_time > ?
      ORDER BY s.start_time
    `).bind(scheduleDate, schedule.end_time).all()
    
    // 後続タスクを遅らせる
    for (const laterTask of laterTasks) {
      const currentStartMinutes = timeToMinutes(laterTask.start_time)
      const currentEndMinutes = timeToMinutes(laterTask.end_time)
      const newStartMinutes = currentStartMinutes + overrunMinutes
      const newEndMinutes = currentEndMinutes + overrunMinutes
      
      // 18:00を超える場合は翌日に移動
      if (newEndMinutes > 18 * 60) {
        await moveTaskToNextAvailableDay(db, laterTask.id, laterTask.task_id, laterTask.duration_minutes)
      } else {
        // 時間をずらす
        await db.prepare(`
          UPDATE schedules 
          SET start_time = ?, end_time = ?
          WHERE id = ?
        `).bind(minutesToTime(newStartMinutes), minutesToTime(newEndMinutes), laterTask.id).run()
      }
    }
  } catch (error) {
    console.error('Time overrun handling failed:', error)
  }
}

// タスクを次の利用可能な日に移動
async function moveTaskToNextAvailableDay(db: D1Database, scheduleId: number, taskId: number, durationMinutes: number) {
  // 現在のスケジュールを削除
  await db.prepare(`DELETE FROM schedules WHERE id = ?`).bind(scheduleId).run()
  
  // 明日から検索開始
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const endDate = new Date(tomorrow)
  endDate.setDate(endDate.getDate() + 30) // 30日先まで検索
  
  const workingHours = { start: 9, end: 18 }
  const timeSlot = await findAvailableTimeSlot(db, tomorrow, endDate, durationMinutes, workingHours)
  
  if (timeSlot) {
    await db.prepare(`
      INSERT INTO schedules (task_id, scheduled_date, start_time, end_time, duration_minutes)
      VALUES (?, ?, ?, ?, ?)
    `).bind(taskId, timeSlot.date, timeSlot.startTime, timeSlot.endTime, durationMinutes).run()
  }
}

app.delete('/api/tasks/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    // 関連するスケジュールも削除
    await c.env.DB.prepare(`DELETE FROM schedules WHERE task_id = ?`).bind(id).run()
    
    const result = await c.env.DB.prepare(`
      DELETE FROM tasks WHERE id = ?
    `).bind(id).run()
    
    if (result.success) {
      return c.json({ message: 'Task deleted successfully' })
    } else {
      return c.json({ error: 'Task not found' }, 404)
    }
  } catch (error) {
    return c.json({ error: 'Failed to delete task' }, 500)
  }
})

// スケジュール取得API
app.get('/api/schedules', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT 
        s.id,
        s.scheduled_date,
        s.start_time,
        s.end_time,
        s.duration_minutes,
        t.id as task_id,
        t.name as task_name,
        t.priority,
        t.status
      FROM schedules s
      JOIN tasks t ON s.task_id = t.id
      ORDER BY s.scheduled_date, s.start_time
    `).all()
    
    return c.json({ schedules: results })
  } catch (error) {
    return c.json({ error: 'Failed to fetch schedules' }, 500)
  }
})

// 特定日のスケジュール取得
app.get('/api/schedules/:date', async (c) => {
  try {
    const date = c.req.param('date')
    
    const { results } = await c.env.DB.prepare(`
      SELECT 
        s.id,
        s.start_time,
        s.end_time,
        s.duration_minutes,
        t.id as task_id,
        t.name as task_name,
        t.priority,
        t.status
      FROM schedules s
      JOIN tasks t ON s.task_id = t.id
      WHERE s.scheduled_date = ?
      ORDER BY s.start_time
    `).bind(date).all()
    
    return c.json({ schedules: results })
  } catch (error) {
    return c.json({ error: 'Failed to fetch day schedules' }, 500)
  }
})

// 全タスクの再スケジューリング
app.post('/api/reschedule', async (c) => {
  try {
    // 既存のスケジュールをクリア
    await c.env.DB.prepare(`DELETE FROM schedules`).run()
    
    // 未完了のタスクを優先度順で取得
    const { results: tasks } = await c.env.DB.prepare(`
      SELECT * FROM tasks 
      WHERE status != 'completed'
      ORDER BY 
        CASE priority 
          WHEN '高い' THEN 1 
          WHEN '中' THEN 2 
          WHEN '低い' THEN 3 
        END,
        deadline
    `).all()
    
    // 各タスクを再スケジューリング
    for (const task of tasks) {
      await autoScheduleTask(c.env.DB, task.id, task)
    }
    
    return c.json({ message: 'All tasks rescheduled successfully' })
  } catch (error) {
    return c.json({ error: 'Failed to reschedule tasks' }, 500)
  }
})

// ストップウォッチ - タスク開始
app.post('/api/tasks/:id/start', async (c) => {
  try {
    const id = c.req.param('id')
    
    const result = await c.env.DB.prepare(`
      UPDATE tasks 
      SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(id).run()
    
    if (result.success) {
      return c.json({ message: 'Task started', startTime: new Date().toISOString() })
    } else {
      return c.json({ error: 'Task not found' }, 404)
    }
  } catch (error) {
    return c.json({ error: 'Failed to start task' }, 500)  
  }
})

// ストップウォッチ - タスク終了
app.post('/api/tasks/:id/complete', async (c) => {
  try {
    const id = c.req.param('id')
    const { actual_duration } = await c.req.json()
    
    const result = await c.env.DB.prepare(`
      UPDATE tasks 
      SET status = 'completed', actual_duration = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(actual_duration, id).run()
    
    if (result.success) {
      // 想定時間を取得
      const { results: taskData } = await c.env.DB.prepare(`
        SELECT estimated_duration FROM tasks WHERE id = ?
      `).bind(id).all()
      
      if (taskData.length > 0) {
        const estimatedDuration = taskData[0].estimated_duration
        
        // 時間超過の場合、自動調整
        if (actual_duration > estimatedDuration) {
          await handleTimeOverrun(c.env.DB, parseInt(id), actual_duration, estimatedDuration)
        }
      }
      
      return c.json({ 
        message: 'Task completed', 
        actualDuration: actual_duration,
        timeOverrun: actual_duration > (taskData[0]?.estimated_duration || 0)
      })
    } else {
      return c.json({ error: 'Task not found' }, 404)
    }
  } catch (error) {
    return c.json({ error: 'Failed to complete task' }, 500)
  }
})

// メインページ
app.get('/', (c) => {
  return c.render(
    <div>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-blue-600 text-white p-4 shadow-lg">
          <h1 className="text-2xl font-bold text-center">📅 タスクカレンダー</h1>
          <p className="text-center text-blue-100 mt-1">自動スケジューリング機能付きタスク管理</p>
          <div className="text-center text-xs text-blue-200 mt-2">
            🟢スケジュール済み ⚪未スケジュール 優先度で自動配置
          </div>
        </header>
        
        <main className="container mx-auto p-4 max-w-md">
          {/* カレンダービュー */}
          <div className="bg-white rounded-lg shadow-md mb-6">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <button id="prevMonth" className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                  ‹
                </button>
                <h2 id="currentMonth" className="text-lg font-semibold">
                  2025年8月
                </h2>
                <button id="nextMonth" className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                  ›
                </button>
              </div>
            </div>
            <div id="calendar" className="p-4">
              {/* カレンダーはJavaScriptで生成 */}
            </div>
          </div>
          
          {/* タスク追加ボタン */}
          <button 
            id="addTaskBtn" 
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold shadow-md hover:bg-blue-700 transition-colors mb-6"
          >
            ➕ 新しいタスクを追加
          </button>
          
          {/* タスクリスト */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">📋 タスク一覧</h3>
            </div>
            <div id="taskList" className="p-4">
              {/* タスクリストはJavaScriptで生成 */}
            </div>
          </div>
        </main>
        
        {/* モーダル: タスク追加フォーム */}
        <div id="taskModal" className="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">📝 タスク追加</h3>
              </div>
              <form id="taskForm" className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">名前:</label>
                  <input 
                    type="text" 
                    name="name" 
                    required 
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="タスク名を入力"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">重要度:</label>
                  <select 
                    name="priority" 
                    required 
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">選択してください</option>
                    <option value="高い">🔴 高い</option>
                    <option value="中">🟡 中</option>
                    <option value="低い">🟢 低い</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">期限:</label>
                  <input 
                    type="date" 
                    name="deadline" 
                    required 
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">所要時間（分）:</label>
                  <input 
                    type="number" 
                    name="estimated_duration" 
                    required 
                    min="1"
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例：60"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button 
                    type="button" 
                    id="cancelBtn" 
                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    追加
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        
        {/* ストップウォッチモーダル */}
        <div id="stopwatchModal" className="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white rounded-lg w-full max-w-sm">
              <div className="p-6 text-center">
                <h3 id="stopwatchTaskName" className="text-lg font-semibold mb-4">タスク実行中</h3>
                <div id="stopwatchDisplay" className="text-4xl font-bold text-blue-600 mb-6">00:00:00</div>
                <div className="flex space-x-3">
                  <button 
                    id="pauseStopwatchBtn" 
                    className="flex-1 bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    一時停止
                  </button>
                  <button 
                    id="completeTaskBtn" 
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    完了
                  </button>
                </div>
                <button 
                  id="cancelStopwatchBtn" 
                  className="w-full mt-3 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  中止
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 日次詳細ビューモーダル */}
        <div id="dayModal" className="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white rounded-lg w-full max-w-md max-h-96 overflow-y-auto">
              <div className="p-4 border-b sticky top-0 bg-white">
                <div className="flex justify-between items-center">
                  <h3 id="dayModalTitle" className="text-lg font-semibold">8月21日の予定</h3>
                  <button id="closeDayModal" className="text-gray-500 hover:text-gray-700">
                    ✕
                  </button>
                </div>
              </div>
              <div id="dayModalContent" className="p-4">
                {/* 日次スケジュールはJavaScriptで生成 */}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* JavaScript */}
      <script src="/static/app.js"></script>
    </div>
  )
})

export default app
