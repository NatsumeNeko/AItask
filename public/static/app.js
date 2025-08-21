// タスクカレンダーアプリ - JavaScript

class TaskCalendar {
  constructor() {
    this.currentDate = new Date();
    this.selectedDate = null;
    this.tasks = [];
    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.renderCalendar();
    await this.loadTasks();
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

        // タスクがある日は背景色を変更
        if (tasksOnDay.length > 0) {
          cellClass += 'bg-yellow-100 border border-yellow-300 ';
        }

        calendarHTML += `
          <div class="${cellClass}" onclick="app.showDayDetail('${dateStr}')">
            <span class="text-sm">${currentDate.getDate()}</span>
            ${tasksOnDay.length > 0 ? `<span class="text-xs text-orange-600">●</span>` : ''}
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
        this.renderTaskList();
        this.renderCalendar();
        this.hideTaskModal();
        alert('✅ タスクが追加されました！');
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

  showDayDetail(dateStr) {
    const date = new Date(dateStr);
    const tasksOnDay = this.getTasksForDate(dateStr);
    
    document.getElementById('dayModalTitle').textContent = 
      `${date.getMonth() + 1}月${date.getDate()}日の予定`;

    let content = '';
    if (tasksOnDay.length === 0) {
      content = `
        <div class="text-center text-gray-500 py-8">
          <p>📝 この日にタスクはありません</p>
        </div>
      `;
    } else {
      content = '<div class="space-y-3">';
      tasksOnDay.forEach(task => {
        const priorityIcon = this.getPriorityIcon(task.priority);
        const statusIcon = this.getStatusIcon(task.status);
        
        content += `
          <div class="border rounded-lg p-3 ${task.status === 'completed' ? 'bg-gray-50' : 'bg-white'}">
            <h4 class="font-semibold ${task.status === 'completed' ? 'line-through text-gray-500' : ''}">${task.name}</h4>
            <div class="flex items-center space-x-2 mt-2 text-sm text-gray-600">
              <span>${priorityIcon} ${task.priority}</span>
              <span>⏱️ ${task.estimated_duration}分</span>
              <span>${statusIcon}</span>
            </div>
          </div>
        `;
      });
      content += '</div>';
    }

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