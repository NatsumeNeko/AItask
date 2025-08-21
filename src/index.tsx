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
    
    const result = await c.env.DB.prepare(`
      INSERT INTO tasks (name, priority, deadline, estimated_duration)
      VALUES (?, ?, ?, ?)
    `).bind(name, priority, deadline, estimated_duration).run()
    
    if (result.success) {
      return c.json({ 
        id: result.meta.last_row_id, 
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

app.put('/api/tasks/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { name, priority, deadline, estimated_duration, status } = await c.req.json()
    
    const result = await c.env.DB.prepare(`
      UPDATE tasks 
      SET name = ?, priority = ?, deadline = ?, estimated_duration = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(name, priority, deadline, estimated_duration, status, id).run()
    
    if (result.success) {
      return c.json({ message: 'Task updated successfully' })
    } else {
      return c.json({ error: 'Task not found' }, 404)
    }
  } catch (error) {
    return c.json({ error: 'Invalid task data' }, 400)
  }
})

app.delete('/api/tasks/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
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

// メインページ
app.get('/', (c) => {
  return c.render(
    <div>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-blue-600 text-white p-4 shadow-lg">
          <h1 className="text-2xl font-bold text-center">📅 タスクカレンダー</h1>
          <p className="text-center text-blue-100 mt-1">タスク管理が簡単にできるカレンダー</p>
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
