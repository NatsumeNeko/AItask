// タスクカレンダーアプリ - JavaScript

class TaskCalendar {
  constructor() {
    this.currentDate = new Date();
    this.selectedDate = null;
    this.tasks = [];
    this.schedules = [];
    this.settings = {};
    this.holidays = [];
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
    
    // データを先に読み込み
    await this.loadTasks();
    await this.loadSchedules();
    await this.loadSettings();
    await this.loadHolidays();
    
    // データ読み込み完了後にUI描画
    this.renderCalendar();
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

    // 設定モーダル
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.showSettingsModal();
    });

    document.getElementById('closeSettingsModal').addEventListener('click', () => {
      this.hideSettingsModal();
    });

    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
      this.saveSettings();
    });

    document.getElementById('cancelSettingsBtn').addEventListener('click', () => {
      this.hideSettingsModal();
    });

    document.getElementById('addHolidayBtn').addEventListener('click', () => {
      this.addHoliday();
    });

    document.getElementById('settingsModal').addEventListener('click', (e) => {
      if (e.target.id === 'settingsModal') {
        this.hideSettingsModal();
      }
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
    console.log('Rendering calendar with data:', { 
      tasks: this.tasks.length, 
      schedules: this.schedules.length, 
      holidays: this.holidays.length 
    });
    
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
        const dateStr = currentDate.getFullYear() + '-' + 
                      (currentDate.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                      currentDate.getDate().toString().padStart(2, '0');
        const tasksOnDay = this.getTasksForDate(dateStr);

        let cellClass = 'h-12 flex flex-col items-center justify-center cursor-pointer rounded transition-colors ';
        if (isCurrentMonth) {
          cellClass += isToday ? 'bg-blue-100 text-blue-800 font-bold ' : 'hover:bg-gray-100 ';
        } else {
          cellClass += 'text-gray-400 ';
        }

        // 休日チェックとスケジュール確認
        const isHoliday = this.isHoliday(dateStr);
        const schedulesOnDay = this.getSchedulesForDate(dateStr);
        
        if (isHoliday && isCurrentMonth) {
          cellClass += 'bg-red-100 border border-red-300 text-red-700 '; // 休日
        } else {
          // タスクやスケジュールがある日は背景色を変更
          if (tasksOnDay.length > 0 || schedulesOnDay.length > 0) {
            if (schedulesOnDay.length > 0) {
              cellClass += 'bg-green-100 border border-green-300 '; // スケジュール済み
            } else {
              cellClass += 'bg-yellow-100 border border-yellow-300 '; // タスクのみ
            }
          }
        }

        calendarHTML += `
          <div class="${cellClass}" onclick="app.showDayDetail('${dateStr}')">
            <span class="text-sm">${currentDate.getDate()}</span>
            ${isHoliday && isCurrentMonth ? 
              `<span class="text-xs text-red-600">🚫</span>` :
              schedulesOnDay.length > 0 ? 
                `<span class="text-xs text-green-600">📅${schedulesOnDay.length}</span>` : 
                tasksOnDay.length > 0 ? `<span class="text-xs text-orange-600">●</span>` : ''}
          </div>
        `;

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    calendarHTML += '</div>';
    const calendarElement = document.getElementById('calendar');
    calendarElement.innerHTML = calendarHTML;
    
    // カレンダー描画完了
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

  async loadSettings() {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      this.settings = data.settings || {};
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
      this.settings = {};
    }
  }

  async loadHolidays() {
    try {
      const response = await fetch('/api/holidays');
      const data = await response.json();
      this.holidays = data.holidays || [];
    } catch (error) {
      console.error('休日の読み込みに失敗しました:', error);
      this.holidays = [];
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

    let html = '<div id="sortable-tasks" class="space-y-2">';
    this.tasks.forEach((task, index) => {
      const priorityIcon = this.getPriorityIcon(task.priority);
      const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'completed';
      
      html += `
        <div class="task-item border rounded-lg p-3 bg-white shadow-sm cursor-move ${isOverdue ? 'border-red-300 bg-red-50' : ''} ${task.status === 'completed' ? 'opacity-60' : ''}" 
             data-task-id="${task.id}" 
             draggable="true">
          <div class="flex items-start space-x-3">
            <!-- ドラッグハンドル -->
            <div class="drag-handle text-gray-400 hover:text-gray-600 cursor-move pt-1">
              <span class="text-lg">≡</span>
            </div>
            
            <!-- チェックボックス -->
            <div class="flex items-center pt-1">
              <input type="checkbox" 
                     class="task-checkbox w-5 h-5 text-blue-600 rounded focus:ring-blue-500" 
                     ${task.status === 'completed' ? 'checked' : ''}
                     onchange="app.toggleTaskStatus(${task.id})">
            </div>
            
            <!-- タスク情報 -->
            <div class="flex-1 min-w-0">
              <div class="task-content" id="task-content-${task.id}">
                <h4 class="font-semibold ${task.status === 'completed' ? 'line-through text-gray-500' : ''} break-words">
                  ${task.name}
                </h4>
                <div class="flex items-center space-x-2 mt-1 text-sm text-gray-600 flex-wrap">
                  <span>${priorityIcon} ${task.priority}</span>
                  <span>📅 ${this.formatDate(task.deadline)}</span>
                  <span>⏱️ ${task.estimated_duration}分</span>
                </div>
                ${isOverdue ? '<div class="text-red-600 text-xs font-semibold mt-1">⚠️ 期限超過</div>' : ''}
              </div>
              
              <!-- 編集フォーム（非表示） -->
              <div class="task-edit-form hidden" id="task-edit-form-${task.id}">
                <div class="space-y-2">
                  <input type="text" 
                         value="${task.name}" 
                         class="task-name-input w-full p-2 border rounded text-sm"
                         placeholder="タスク名">
                  <div class="flex space-x-2">
                    <select class="task-priority-input p-2 border rounded text-sm">
                      <option value="高い" ${task.priority === '高い' ? 'selected' : ''}>🔴 高い</option>
                      <option value="中" ${task.priority === '中' ? 'selected' : ''}>🟡 中</option>
                      <option value="低い" ${task.priority === '低い' ? 'selected' : ''}>🟢 低い</option>
                    </select>
                    <input type="date" 
                           value="${task.deadline}" 
                           class="task-deadline-input p-2 border rounded text-sm">
                    <input type="number" 
                           value="${task.estimated_duration}" 
                           min="1"
                           class="task-duration-input w-20 p-2 border rounded text-sm"
                           placeholder="分">
                  </div>
                  <div class="flex space-x-2">
                    <button onclick="app.saveTaskEdit(${task.id})" 
                            class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                      保存
                    </button>
                    <button onclick="app.cancelTaskEdit(${task.id})" 
                            class="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">
                      キャンセル
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- アクションボタン -->
            <div class="flex flex-col space-y-1">
              ${task.status === 'pending' ? 
                `<button onclick="app.startStopwatch(${task.id}, '${task.name}', ${task.estimated_duration})" 
                         class="text-green-600 hover:text-green-800 text-sm px-2 py-1 rounded hover:bg-green-50">
                    ⏱️
                  </button>` : ''}
              <button onclick="app.editTask(${task.id})" 
                      class="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50">
                ✏️
              </button>
              <button onclick="app.deleteTask(${task.id})" 
                      class="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50">
                🗑️
              </button>
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    taskListElement.innerHTML = html;
    
    // ドラッグ&ドロップ機能を初期化
    this.initializeDragAndDrop();
  }

  showTaskModal() {
    // 明日の日付をデフォルトに設定
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const deadlineInput = document.querySelector('input[name="deadline"]');
    deadlineInput.value = tomorrow.getFullYear() + '-' + 
                      (tomorrow.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                      tomorrow.getDate().toString().padStart(2, '0');
    
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
        const isDailyWork = schedule.status === 'daily';
        const bgColor = isDailyWork ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200';
        const textColor = isDailyWork ? 'text-blue-600' : 'text-green-600';
        
        content += `
          <div class="border rounded-lg p-3 ${bgColor}">
            <div class="flex justify-between items-start">
              <h5 class="font-semibold text-sm ${isDailyWork ? 'text-blue-700' : ''}">${schedule.task_name}</h5>
              <span class="text-xs ${textColor}">${schedule.start_time}-${schedule.end_time}</span>
            </div>
            <div class="flex items-center space-x-2 mt-1 text-xs text-gray-600">
              <span>${isDailyWork ? '🔄' : priorityIcon} ${isDailyWork ? 'デイリー' : schedule.priority}</span>
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

  // 日付をYYYY-MM-DD形式に変換（タイムゾーン問題を避ける）
  formatDateString(date) {
    return date.getFullYear() + '-' + 
           (date.getMonth() + 1).toString().padStart(2, '0') + '-' + 
           date.getDate().toString().padStart(2, '0');
  }

  // ドラッグ&ドロップ機能の初期化（デスクトップ＋モバイル対応）
  initializeDragAndDrop() {
    const taskContainer = document.getElementById('sortable-tasks');
    if (!taskContainer) return;

    let draggedElement = null;
    let draggedIndex = null;
    let touchStartY = 0;
    let touchElement = null;

    // タスクアイテムにイベントを追加
    const taskItems = taskContainer.querySelectorAll('.task-item');
    taskItems.forEach((item, index) => {
      // デスクトップ用ドラッグ
      item.addEventListener('dragstart', (e) => {
        draggedElement = item;
        draggedIndex = index;
        item.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', (e) => {
        item.style.opacity = '1';
        draggedElement = null;
        draggedIndex = null;
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedElement && draggedElement !== item) {
          const dropIndex = Array.from(taskContainer.children).indexOf(item);
          this.reorderTasks(draggedIndex, dropIndex);
        }
      });

      // モバイル用タッチ
      item.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
        touchElement = item;
        draggedIndex = index;
        item.style.opacity = '0.8';
      }, { passive: true });

      item.addEventListener('touchmove', (e) => {
        if (!touchElement) return;
        
        const touch = e.touches[0];
        const currentY = touch.clientY;
        const deltaY = currentY - touchStartY;
        
        // 移動距離が十分な場合のみドラッグ扱い
        if (Math.abs(deltaY) > 20) {
          e.preventDefault();
          touchElement.style.transform = `translateY(${deltaY}px)`;
          
          // ドロップ先を判定
          const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
          const dropTarget = elementBelow?.closest('.task-item');
          
          if (dropTarget && dropTarget !== touchElement) {
            const allItems = Array.from(taskContainer.children);
            const dropIndex = allItems.indexOf(dropTarget);
            
            // ビジュアルフィードバック
            allItems.forEach(el => el.style.borderTop = '');
            if (deltaY > 0) {
              dropTarget.style.borderBottom = '2px solid #3b82f6';
            } else {
              dropTarget.style.borderTop = '2px solid #3b82f6';
            }
          }
        }
      }, { passive: false });

      item.addEventListener('touchend', (e) => {
        if (!touchElement) return;
        
        const touch = e.changedTouches[0];
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const dropTarget = elementBelow?.closest('.task-item');
        
        // スタイルをリセット
        touchElement.style.opacity = '1';
        touchElement.style.transform = '';
        document.querySelectorAll('.task-item').forEach(el => {
          el.style.borderTop = '';
          el.style.borderBottom = '';
        });
        
        if (dropTarget && dropTarget !== touchElement) {
          const dropIndex = Array.from(taskContainer.children).indexOf(dropTarget);
          this.reorderTasks(draggedIndex, dropIndex);
        }
        
        touchElement = null;
        touchStartY = 0;
      });
    });
  }

  // タスクの順序を変更
  async reorderTasks(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;

    // 配列内でタスクを移動
    const taskToMove = this.tasks.splice(fromIndex, 1)[0];
    this.tasks.splice(toIndex, 0, taskToMove);

    // UIを更新
    this.renderTaskList();

    // サーバーに順序変更を送信
    try {
      // 新しい順序配列を作成
      const taskOrders = this.tasks.map((task, index) => ({
        id: task.id,
        order: index
      }));

      const response = await fetch('/api/tasks/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskOrders })
      });

      if (!response.ok) {
        throw new Error('Failed to update task order');
      }

      console.log('タスク順序を更新しました');
      
      // カレンダーを再描画（スケジュールが変更された可能性があるため）
      this.renderCalendar();
      
    } catch (error) {
      console.error('タスク順序の保存に失敗しました:', error);
      // エラーの場合は元の順序に戻す
      this.loadTasks();
    }
  }

  // タスクの編集モードに切り替え
  editTask(taskId) {
    const contentDiv = document.getElementById(`task-content-${taskId}`);
    const editForm = document.getElementById(`task-edit-form-${taskId}`);
    
    if (contentDiv && editForm) {
      contentDiv.classList.add('hidden');
      editForm.classList.remove('hidden');
    }
  }

  // タスク編集をキャンセル
  cancelTaskEdit(taskId) {
    const contentDiv = document.getElementById(`task-content-${taskId}`);
    const editForm = document.getElementById(`task-edit-form-${taskId}`);
    
    if (contentDiv && editForm) {
      contentDiv.classList.remove('hidden');
      editForm.classList.add('hidden');
    }
  }

  // タスク編集を保存
  async saveTaskEdit(taskId) {
    const editForm = document.getElementById(`task-edit-form-${taskId}`);
    if (!editForm) return;

    const nameInput = editForm.querySelector('.task-name-input');
    const priorityInput = editForm.querySelector('.task-priority-input');
    const deadlineInput = editForm.querySelector('.task-deadline-input');
    const durationInput = editForm.querySelector('.task-duration-input');

    const updatedData = {
      name: nameInput.value.trim(),
      priority: priorityInput.value,
      deadline: deadlineInput.value,
      estimated_duration: parseInt(durationInput.value)
    };

    if (!updatedData.name || !updatedData.deadline || !updatedData.estimated_duration) {
      alert('すべての項目を入力してください');
      return;
    }

    try {
      const task = this.tasks.find(t => t.id === taskId);
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...task,
          ...updatedData
        })
      });

      if (response.ok) {
        await this.loadTasks();
        await this.loadSchedules();
        this.renderTaskList();
        this.renderCalendar();
        alert('✅ タスクが更新されました');
      } else {
        alert('❌ タスクの更新に失敗しました');
      }
    } catch (error) {
      console.error('タスク更新エラー:', error);
      alert('❌ エラーが発生しました');
    }
  }

  // タスク配列の保存（簡易実装）
  async saveTasks() {
    // この機能は順序保存のため、実際のAPIが必要な場合は実装
    console.log('タスク順序が変更されました:', this.tasks.map(t => t.name));
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

  // 設定モーダル関連
  showSettingsModal() {
    // 現在の設定値をフォームに設定
    document.getElementById('bufferMinutes').value = this.settings.buffer_minutes || '0';
    document.getElementById('dailyWorkMinutes').value = this.settings.daily_work_minutes || '0';
    document.getElementById('workStartHour').value = this.settings.work_start_hour || '9';
    document.getElementById('workEndHour').value = this.settings.work_end_hour || '18';
    
    this.renderHolidayList();
    document.getElementById('settingsModal').classList.remove('hidden');
  }

  hideSettingsModal() {
    document.getElementById('settingsModal').classList.add('hidden');
    // フォームをリセット
    document.getElementById('holidayDate').value = '';
    document.getElementById('holidayName').value = '';
    document.getElementById('isRecurring').checked = false;
  }

  async saveSettings() {
    try {
      const newSettings = {
        buffer_minutes: document.getElementById('bufferMinutes').value,
        daily_work_minutes: document.getElementById('dailyWorkMinutes').value,
        work_start_hour: document.getElementById('workStartHour').value,
        work_end_hour: document.getElementById('workEndHour').value
      };

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings)
      });

      if (response.ok) {
        await this.loadSettings();
        this.hideSettingsModal();
        alert('✅ 設定が保存されました！既存のタスクを再スケジュールしますか？');
        
        if (confirm('既存のタスクを新しい設定で再スケジュールしますか？')) {
          await this.rescheduleAllTasks();
        }
      } else {
        alert('❌ 設定の保存に失敗しました');
      }
    } catch (error) {
      console.error('設定保存エラー:', error);
      alert('❌ エラーが発生しました');
    }
  }

  async addHoliday() {
    const holidayDate = document.getElementById('holidayDate').value;
    const holidayName = document.getElementById('holidayName').value;
    const isRecurring = document.getElementById('isRecurring').checked;

    if (!holidayDate) {
      alert('日付を選択してください');
      return;
    }

    try {
      const response = await fetch('/api/holidays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holiday_date: holidayDate,
          holiday_name: holidayName,
          is_recurring: isRecurring
        })
      });

      if (response.ok) {
        await this.loadHolidays();
        this.renderHolidayList();
        this.renderCalendar(); // カレンダーを更新
        
        // フォームをクリア
        document.getElementById('holidayDate').value = '';
        document.getElementById('holidayName').value = '';
        document.getElementById('isRecurring').checked = false;
        
        alert('✅ 休日が追加されました！');
      } else {
        alert('❌ 休日の追加に失敗しました');
      }
    } catch (error) {
      console.error('休日追加エラー:', error);
      alert('❌ エラーが発生しました');
    }
  }

  async deleteHoliday(holidayId) {
    if (!confirm('この休日を削除しますか？')) return;

    try {
      const response = await fetch(`/api/holidays/${holidayId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await this.loadHolidays();
        this.renderHolidayList();
        this.renderCalendar(); // カレンダーを更新
        alert('✅ 休日が削除されました');
      } else {
        alert('❌ 休日の削除に失敗しました');
      }
    } catch (error) {
      console.error('休日削除エラー:', error);
      alert('❌ エラーが発生しました');
    }
  }

  renderHolidayList() {
    const holidayListElement = document.getElementById('holidayList');
    
    if (this.holidays.length === 0) {
      holidayListElement.innerHTML = '<p class="text-gray-500 text-sm">設定された休日はありません</p>';
      return;
    }

    let html = '<div class="space-y-2">';
    this.holidays.forEach(holiday => {
      const date = new Date(holiday.holiday_date);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      const yearStr = holiday.is_recurring ? '（毎年）' : `（${date.getFullYear()}年）`;
      
      html += `
        <div class="flex justify-between items-center bg-gray-50 p-2 rounded">
          <div class="flex-1">
            <span class="font-medium">${dateStr}</span>
            <span class="text-sm text-gray-600 ml-2">${holiday.holiday_name || '休日'}${yearStr}</span>
          </div>
          <button onclick="app.deleteHoliday(${holiday.id})" class="text-red-600 hover:text-red-800 text-sm">
            削除
          </button>
        </div>
      `;
    });
    html += '</div>';

    holidayListElement.innerHTML = html;
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

  isHoliday(dateStr) {
    const date = new Date(dateStr);
    
    return this.holidays.some(holiday => {
      if (holiday.holiday_date === dateStr) {
        return true;
      }
      
      // 毎年繰り返す休日の場合
      if (holiday.is_recurring) {
        const holidayDate = new Date(holiday.holiday_date);
        return holidayDate.getMonth() === date.getMonth() && 
               holidayDate.getDate() === date.getDate();
      }
      
      return false;
    });
  }
}

// アプリケーション初期化
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new TaskCalendar();
});