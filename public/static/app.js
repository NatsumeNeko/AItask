// タスクカレンダーアプリ - JavaScript

class TaskCalendar {
  constructor() {
    this.currentDate = new Date();
    this.selectedDate = null;
    this.tasks = [];
    this.schedules = [];
    this.stopwatch = {
      taskId: null,
      taskName: '',
      estimatedDuration: 0,
      startTime: null,
      elapsedTime: 0,
      interval: null,
      isPaused: false
    };
    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.renderCalendar();
    await this.loadTasks();
    await this.loadSchedules();
    this.renderTaskList();
  }

  setupEventListeners() {
    // カレンダーナビゲーション
    document.getElementById('prevMonth').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.renderCalendar();
    });

    // タスク追加モーダル
    document.getElementById('addTaskBtn').addEventListener('click', () => {
      this.showTaskModal();
    });

    document.getElementById('cancelBtn').addEventListener('click', () => {
      this.hideTaskModal();
    });

    document.getElementById('taskModal').addEventListener('click', (e) => {
      if (e.target.id === 'taskModal') {
        this.hideTaskModal();
      }
    });

    // タスクフォーム送信
    document.getElementById('taskForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.addTask();
    });

    // 日次詳細モーダル
    document.getElementById('closeDayModal').addEventListener('click', () => {
      this.hideDayModal();
    });

    document.getElementById('dayModal').addEventListener('click', (e) => {
      if (e.target.id === 'dayModal') {
        this.hideDayModal();
      }
    });

    // ストップウォッチモーダル
    document.getElementById('pauseStopwatchBtn').addEventListener('click', () => {
      this.toggleStopwatch();
    });

    document.getElementById('completeTaskBtn').addEventListener('click', () => {
      this.completeTask();
    });

    document.getElementById('cancelStopwatchBtn').addEventListener('click', () => {
      this.cancelStopwatch();
    });

    document.getElementById('stopwatchModal').addEventListener('click', (e) => {
      if (e.target.id === 'stopwatchModal') {
        // ストップウォッチ実行中はモーダル外クリックでは閉じない
      }
    });
  }

  renderCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    // 月表示更新
    document.getElementById('currentMonth').textContent = `${year}年${month + 1}月`;
    
    // カレンダーグリッド生成
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    let calendarHTML = `
      <div class="grid grid-cols-7 gap-1 mb-2">
        <div class="text-center text-sm font-semibold text-gray-600 py-2">日</div>
        <div class="text-center text-sm font-semibold text-gray-600 py-2">月</div>
        <div class="text-center text-sm font-semibold text-gray-600 py-2">火</div>
        <div class="text-center text-sm font-semibold text-gray-600 py-2">水</div>
        <div class="text-center text-sm font-semibold text-gray-600 py-2">木</div>
        <div class="text-center text-sm font-semibold text-gray-600 py-2">金</div>
        <div class="text-center text-sm font-semibold text-gray-600 py-2">土</div>
      </div>
      <div class="grid grid-cols-7 gap-1">
    `;

    const currentDate = new Date(startDate);
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = this.isToday(currentDate);
        const dateStr = currentDate.toISOString().split('T')[0];
        const tasksOnDay = this.getTasksForDate(dateStr);

        let cellClass = 'h-12 flex flex-col items-center justify-center cursor-pointer rounded transition-colors ';
        if (isCurrentMonth) {
          cellClass += isToday ? 'bg-blue-100 text-blue-800 font-bold ' : 'hover:bg-gray-100 ';
        } else {
          cellClass += 'text-gray-400 ';
        }

        // タスクやスケジュールがある日は背景色を変更
        const schedulesOnDay = this.getSchedulesForDate(dateStr);
        if (tasksOnDay.length > 0 || schedulesOnDay.length > 0) {
          if (schedulesOnDay.length > 0) {
            cellClass += 'bg-green-100 border border-green-300 '; // スケジュール済み
          } else {
            cellClass += 'bg-yellow-100 border border-yellow-300 '; // タスクのみ
          }
        }

        calendarHTML += `
          <div class="${cellClass}" onclick="app.showDayDetail('${dateStr}')">
            <span class="text-sm">${currentDate.getDate()}</span>
            ${schedulesOnDay.length > 0 ? 
              `<span class="text-xs text-green-600">📅${schedulesOnDay.length}</span>` : 
              tasksOnDay.length > 0 ? `<span class="text-xs text-orange-600">●</span>` : ''}
          </div>
        `;

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    calendarHTML += '</div>';
    document.getElementById('calendar').innerHTML = calendarHTML;
  }

  async loadTasks() {
    try {
      const response = await fetch('/api/tasks');
      const data = await response.json();
      this.tasks = data.tasks || [];
    } catch (error) {
      console.error('タスクの読み込みに失敗しました:', error);
      this.tasks = [];
    }
  }

  async loadSchedules() {
    try {
      const response = await fetch('/api/schedules');
      const data = await response.json();
      this.schedules = data.schedules || [];
    } catch (error) {
      console.error('スケジュールの読み込みに失敗しました:', error);
      this.schedules = [];
    }
  }

  renderTaskList() {
    const taskListElement = document.getElementById('taskList');
    
    if (this.tasks.length === 0) {
      taskListElement.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <p>📝 タスクがありません</p>
          <p class="text-sm mt-2">「新しいタスクを追加」ボタンでタスクを作成しましょう</p>
        </div>
      `;
      return;
    }

    let html = '';
    this.tasks.forEach(task => {
      const priorityIcon = this.getPriorityIcon(task.priority);
      const statusIcon = this.getStatusIcon(task.status);
      const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'completed';
      
      html += `
        <div class="border-b last:border-b-0 py-3 ${isOverdue ? 'bg-red-50' : ''}">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h4 class="font-semibold ${task.status === 'completed' ? 'line-through text-gray-500' : ''}">${task.name}</h4>
              <div class="flex items-center space-x-2 mt-1 text-sm text-gray-600">
                <span>${priorityIcon} ${task.priority}</span>
                <span>📅 ${this.formatDate(task.deadline)}</span>
                <span>⏱️ ${task.estimated_duration}分</span>
              </div>
              ${isOverdue ? '<span class="text-red-600 text-xs font-semibold">⚠️ 期限超過</span>' : ''}
            </div>
            <div class="flex items-center space-x-2">
              <span>${statusIcon}</span>
              ${task.status === 'pending' ? 
                `<button onclick="app.startStopwatch(${task.id}, '${task.name}', ${task.estimated_duration})" class="text-green-600 hover:text-green-800 text-sm">
                  ⏱️ 開始
                </button>` : ''}
              <button onclick="app.toggleTaskStatus(${task.id})" class="text-blue-600 hover:text-blue-800 text-sm">
                ${task.status === 'completed' ? '元に戻す' : '完了'}
              </button>
              <button onclick="app.deleteTask(${task.id})" class="text-red-600 hover:text-red-800 text-sm">
                削除
              </button>
            </div>
          </div>
        </div>
      `;
    });

    taskListElement.innerHTML = html;
  }

  showTaskModal() {
    // 明日の日付をデフォルトに設定
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const deadlineInput = document.querySelector('input[name="deadline"]');
    deadlineInput.value = tomorrow.toISOString().split('T')[0];
    
    document.getElementById('taskModal').classList.remove('hidden');
  }

  hideTaskModal() {
    document.getElementById('taskModal').classList.add('hidden');
    document.getElementById('taskForm').reset();
  }

  async addTask() {
    const formData = new FormData(document.getElementById('taskForm'));
    const taskData = {
      name: formData.get('name'),
      priority: formData.get('priority'),
      deadline: formData.get('deadline'),
      estimated_duration: parseInt(formData.get('estimated_duration'))
    };

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData)
      });

      if (response.ok) {
        await this.loadTasks();
        await this.loadSchedules();
        this.renderTaskList();
        this.renderCalendar();
        this.hideTaskModal();
        alert('✅ タスクが追加され、自動的にスケジュールされました！');
      } else {
        alert('❌ タスクの追加に失敗しました');
      }
    } catch (error) {
      console.error('タスク追加エラー:', error);
      alert('❌ エラーが発生しました');
    }
  }

  async toggleTaskStatus(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...task,
          status: newStatus
        })
      });

      if (response.ok) {
        await this.loadTasks();
        await this.loadSchedules();
        this.renderTaskList();
        this.renderCalendar();
      } else {
        alert('❌ タスクの更新に失敗しました');
      }
    } catch (error) {
      console.error('タスク更新エラー:', error);
      alert('❌ エラーが発生しました');
    }
  }

  async deleteTask(taskId) {
    if (!confirm('本当にこのタスクを削除しますか？')) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await this.loadTasks();
        await this.loadSchedules();
        this.renderTaskList();
        this.renderCalendar();
        alert('✅ タスクが削除されました');
      } else {
        alert('❌ タスクの削除に失敗しました');
      }
    } catch (error) {
      console.error('タスク削除エラー:', error);
      alert('❌ エラーが発生しました');
    }
  }

  async showDayDetail(dateStr) {
    const date = new Date(dateStr);
    const tasksOnDay = this.getTasksForDate(dateStr);
    const schedulesOnDay = this.getSchedulesForDate(dateStr);
    
    document.getElementById('dayModalTitle').textContent = 
      `${date.getMonth() + 1}月${date.getDate()}日の予定`;

    let content = '';
    
    // スケジュールされたタスクを表示
    if (schedulesOnDay.length > 0) {
      content += '<div class="mb-4"><h4 class="font-semibold text-green-600 mb-2">📅 スケジュール済み</h4><div class="space-y-2">';
      schedulesOnDay.forEach(schedule => {
        const priorityIcon = this.getPriorityIcon(schedule.priority);
        
        content += `
          <div class="border border-green-200 rounded-lg p-3 bg-green-50">
            <div class="flex justify-between items-start">
              <h5 class="font-semibold text-sm">${schedule.task_name}</h5>
              <span class="text-xs text-green-600">${schedule.start_time}-${schedule.end_time}</span>
            </div>
            <div class="flex items-center space-x-2 mt-1 text-xs text-gray-600">
              <span>${priorityIcon} ${schedule.priority}</span>
              <span>⏱️ ${schedule.duration_minutes}分</span>
            </div>
          </div>
        `;
      });
      content += '</div></div>';
    }
    
    // 期限のタスク（スケジュールされていない）を表示
    const unscheduledTasks = tasksOnDay.filter(task => 
      !schedulesOnDay.some(schedule => schedule.task_id === task.id)
    );
    
    if (unscheduledTasks.length > 0) {
      content += '<div class="mb-4"><h4 class="font-semibold text-orange-600 mb-2">⚠️ 未スケジュール</h4><div class="space-y-2">';
      unscheduledTasks.forEach(task => {
        const priorityIcon = this.getPriorityIcon(task.priority);
        const statusIcon = this.getStatusIcon(task.status);
        
        content += `
          <div class="border border-orange-200 rounded-lg p-3 bg-orange-50">
            <h5 class="font-semibold text-sm ${task.status === 'completed' ? 'line-through text-gray-500' : ''}">${task.name}</h5>
            <div class="flex items-center space-x-2 mt-1 text-xs text-gray-600">
              <span>${priorityIcon} ${task.priority}</span>
              <span>⏱️ ${task.estimated_duration}分</span>
              <span>${statusIcon}</span>
            </div>
          </div>
        `;
      });
      content += '</div></div>';
    }
    
    if (schedulesOnDay.length === 0 && tasksOnDay.length === 0) {
      content = `
        <div class="text-center text-gray-500 py-8">
          <p>📝 この日に予定はありません</p>
        </div>
      `;
    }
    
    // 再スケジュールボタンを追加
    content += `
      <div class="mt-4 pt-4 border-t">
        <button onclick="app.rescheduleAllTasks()" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm">
          🔄 全タスクを再スケジュール
        </button>
      </div>
    `;

    document.getElementById('dayModalContent').innerHTML = content;
    document.getElementById('dayModal').classList.remove('hidden');
  }

  hideDayModal() {
    document.getElementById('dayModal').classList.add('hidden');
  }

  // ユーティリティメソッド
  isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  getTasksForDate(dateStr) {
    return this.tasks.filter(task => task.deadline === dateStr);
  }

  getSchedulesForDate(dateStr) {
    return this.schedules.filter(schedule => schedule.scheduled_date === dateStr);
  }

  async rescheduleAllTasks() {
    if (!confirm('全てのタスクを再スケジュールしますか？既存のスケジュールは削除されます。')) return;

    try {
      const response = await fetch('/api/reschedule', {
        method: 'POST'
      });

      if (response.ok) {
        await this.loadTasks();
        await this.loadSchedules();
        this.renderTaskList();
        this.renderCalendar();
        this.hideDayModal();
        alert('✅ 全タスクが再スケジュールされました！');
      } else {
        alert('❌ 再スケジュールに失敗しました');
      }
    } catch (error) {
      console.error('再スケジュールエラー:', error);
      alert('❌ エラーが発生しました');
    }
  }

  // ストップウォッチ機能
  startStopwatch(taskId, taskName, estimatedDuration) {
    this.stopwatch.taskId = taskId;
    this.stopwatch.taskName = taskName;
    this.stopwatch.estimatedDuration = estimatedDuration;
    this.stopwatch.startTime = new Date();
    this.stopwatch.elapsedTime = 0;
    this.stopwatch.isPaused = false;

    // UI更新
    document.getElementById('stopwatchTaskName').textContent = taskName;
    document.getElementById('stopwatchModal').classList.remove('hidden');
    document.getElementById('pauseStopwatchBtn').textContent = '一時停止';

    // タスクステータス更新
    this.updateTaskStatus(taskId, 'in_progress');

    // タイマー開始
    this.stopwatch.interval = setInterval(() => {
      if (!this.stopwatch.isPaused) {
        this.stopwatch.elapsedTime = Math.floor((new Date() - this.stopwatch.startTime) / 1000);
        this.updateStopwatchDisplay();
        
        // 想定時間を超えた場合の警告
        if (this.stopwatch.elapsedTime > this.stopwatch.estimatedDuration * 60) {
          document.getElementById('stopwatchDisplay').classList.add('text-red-600');
          document.getElementById('stopwatchDisplay').classList.remove('text-blue-600');
        }
      }
    }, 1000);
  }

  toggleStopwatch() {
    this.stopwatch.isPaused = !this.stopwatch.isPaused;
    const btn = document.getElementById('pauseStopwatchBtn');
    
    if (this.stopwatch.isPaused) {
      btn.textContent = '再開';
      btn.className = 'flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors';
    } else {
      btn.textContent = '一時停止';
      btn.className = 'flex-1 bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors';
    }
  }

  async completeTask() {
    const actualDurationMinutes = Math.ceil(this.stopwatch.elapsedTime / 60);
    
    try {
      const response = await fetch(`/api/tasks/${this.stopwatch.taskId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actual_duration: actualDurationMinutes
        })
      });

      if (response.ok) {
        const result = await response.json();
        this.stopStopwatch();
        
        await this.loadTasks();
        await this.loadSchedules();
        this.renderTaskList();
        this.renderCalendar();
        
        if (result.timeOverrun) {
          alert(`✅ タスクが完了しました！\n⚠️ 想定時間を${actualDurationMinutes - this.stopwatch.estimatedDuration}分オーバーしたため、他のタスクを調整しました。`);
        } else {
          alert('✅ タスクが完了しました！');
        }
      } else {
        alert('❌ タスクの完了処理に失敗しました');
      }
    } catch (error) {
      console.error('タスク完了エラー:', error);
      alert('❌ エラーが発生しました');
    }
  }

  cancelStopwatch() {
    if (confirm('作業を中止しますか？経過時間は保存されません。')) {
      // タスクステータスを元に戻す
      this.updateTaskStatus(this.stopwatch.taskId, 'pending');
      this.stopStopwatch();
    }
  }

  stopStopwatch() {
    if (this.stopwatch.interval) {
      clearInterval(this.stopwatch.interval);
      this.stopwatch.interval = null;
    }
    
    document.getElementById('stopwatchModal').classList.add('hidden');
    document.getElementById('stopwatchDisplay').classList.remove('text-red-600');
    document.getElementById('stopwatchDisplay').classList.add('text-blue-600');
    
    // リセット
    this.stopwatch = {
      taskId: null,
      taskName: '',
      estimatedDuration: 0,
      startTime: null,
      elapsedTime: 0,
      interval: null,
      isPaused: false
    };
  }

  updateStopwatchDisplay() {
    const hours = Math.floor(this.stopwatch.elapsedTime / 3600);
    const minutes = Math.floor((this.stopwatch.elapsedTime % 3600) / 60);
    const seconds = this.stopwatch.elapsedTime % 60;
    
    const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('stopwatchDisplay').textContent = display;
  }

  async updateTaskStatus(taskId, status) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...task,
          status: status
        })
      });
    } catch (error) {
      console.error('タスクステータス更新エラー:', error);
    }
  }

  getPriorityIcon(priority) {
    switch (priority) {
      case '高い': return '🔴';
      case '中': return '🟡';
      case '低い': return '🟢';
      default: return '⚪';
    }
  }

  getStatusIcon(status) {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '⏳';
      case 'pending': return '📝';
      default: return '📝';
    }
  }

  formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
}

// アプリケーション初期化
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new TaskCalendar();
});