// 全局变量
let socket;
let logs = [];
let currentOffset = 0;
let isLoading = false;
let autoRefreshInterval = null;
let autoRefreshEnabled = false;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeSocket();
    loadStats();
    loadLogs();
    setupEventListeners();
});

// 初始化 WebSocket 连接
function initializeSocket() {
    socket = io();
    
    socket.on('connect', function() {
        updateConnectionStatus(true);
        console.log('WebSocket 连接已建立');
    });
    
    socket.on('disconnect', function() {
        updateConnectionStatus(false);
        console.log('WebSocket 连接已断开');
    });
    
    socket.on('newLog', function(logData) {
        console.log('收到新日志:', logData);
        addNewLogToUI(logData);
        updateStats();
    });
}

// 更新连接状态
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    if (connected) {
        statusElement.className = 'badge bg-success me-2';
        statusElement.innerHTML = '<i class="bi bi-wifi"></i> 已连接';
    } else {
        statusElement.className = 'badge bg-danger me-2';
        statusElement.innerHTML = '<i class="bi bi-wifi-off"></i> 已断开';
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 搜索功能
    document.getElementById('searchInput').addEventListener('input', function() {
        filterLogs();
    });
    
    // 状态过滤
    document.getElementById('statusFilter').addEventListener('change', function() {
        filterLogs();
    });
    
    // 限制选择
    document.getElementById('limitSelect').addEventListener('change', function() {
        refreshLogs();
    });
}

// 加载统计数据
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        updateStatsDisplay(data.stats);
    } catch (error) {
        console.error('加载统计数据失败:', error);
    }
}

// 更新统计显示
function updateStatsDisplay(stats) {
    document.getElementById('totalRequests').textContent = stats.totalRequests || 0;
    document.getElementById('successRequests').textContent = stats.successRequests || 0;
    document.getElementById('errorRequests').textContent = stats.errorRequests || 0;
    
    const avgTime = stats.avgProcessingTime ? Math.round(stats.avgProcessingTime) : 0;
    document.getElementById('avgProcessingTime').textContent = avgTime + 'ms';
}

// 加载日志
async function loadLogs(append = false) {
    if (isLoading) return;
    
    isLoading = true;
    showLoading(true);
    
    try {
        const limit = document.getElementById('limitSelect').value;
        const offset = append ? currentOffset : 0;
        
        const response = await fetch(`/api/logs?limit=${limit}&offset=${offset}`);
        const data = await response.json();
        
        if (!append) {
            logs = data.logs;
            currentOffset = 0;
        } else {
            logs = logs.concat(data.logs);
        }
        
        currentOffset += data.logs.length;
        displayLogs();
        
        // 更新加载更多按钮状态
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        loadMoreBtn.style.display = data.logs.length < limit ? 'none' : 'inline-block';
        
    } catch (error) {
        console.error('加载日志失败:', error);
        showAlert('加载日志失败: ' + error.message, 'danger');
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

// 显示加载状态
function showLoading(show) {
    const spinner = document.querySelector('.loading-spinner');
    if (show) {
        spinner.classList.add('show');
    } else {
        spinner.classList.remove('show');
    }
}

// 显示日志
function displayLogs() {
    const container = document.getElementById('logsContainer');
    const filteredLogs = getFilteredLogs();
    
    if (filteredLogs.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-4">暂无日志数据</div>';
        return;
    }
    
    // 创建表格
    const tableHTML = `
        <div class="table-responsive">
            <table class="table table-hover table-sm">
                <thead class="table-light">
                    <tr>
                        <th style="width: 80px;">状态</th>
                        <th style="width: 120px;">消息ID</th>
                        <th style="width: 100px;">From</th>
                        <th style="width: 100px;">To</th>
                        <th style="width: 80px;">类型</th>
                        <th style="width: 200px;">Payload</th>
                        <th style="width: 200px;">Body</th>
                        <th style="width: 150px;">Ext</th>
                        <th style="width: 80px;">耗时</th>
                        <th style="width: 150px;">时间</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredLogs.map(log => createLogElement(log)).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = tableHTML;
}

// 获取过滤后的日志
function getFilteredLogs() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    
    return logs.filter(log => {
        // 搜索过滤（支持搜索多个字段）
        const matchesSearch = !searchTerm || 
            (log.callId && log.callId.toLowerCase().includes(searchTerm)) ||
            (log.ip && log.ip.toLowerCase().includes(searchTerm)) ||
            (log.msg_id && log.msg_id.toLowerCase().includes(searchTerm)) ||
            (log.from_user && log.from_user.toLowerCase().includes(searchTerm)) ||
            (log.to_user && log.to_user.toLowerCase().includes(searchTerm)) ||
            (log.body && log.body.toLowerCase().includes(searchTerm)) ||
            (log.chatType && log.chatType.toLowerCase().includes(searchTerm));
        
        // 状态过滤
        let matchesStatus = true;
        if (statusFilter === 'success') {
            matchesStatus = log.statusCode >= 200 && log.statusCode < 300;
        } else if (statusFilter === 'error') {
            matchesStatus = log.statusCode >= 400;
        }
        
        return matchesSearch && matchesStatus;
    });
}

// 创建日志元素（表格行）
function createLogElement(log) {
    const statusClass = getStatusClass(log.statusCode);
    const statusText = getStatusText(log.statusCode);
    const timestamp = new Date(log.createdAt).toLocaleString('zh-CN');
    
    // 获取 payload（完整的 payload 对象）
    const payload = log.requestBody?.payload || {};
    const payloadStr = JSON.stringify(payload);
    
    // 截断过长的内容以便显示
    const truncateText = (text, maxLength = 50) => {
        if (!text) return '-';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };
    
    return `
        <tr class="log-entry ${statusClass}" onclick="showLogDetail(${log.id})" style="cursor: pointer;">
            <td>
                <span class="badge status-badge ${statusClass}">${statusText}</span>
            </td>
            <td>
                <small title="${log.msg_id || '-'}">${truncateText(log.msg_id, 20)}</small>
            </td>
            <td><small>${log.from_user || '-'}</small></td>
            <td><small>${log.to_user || '-'}</small></td>
            <td>
                <span class="badge bg-info">${log.chatType || '-'}</span>
            </td>
            <td>
                <small title="${payloadStr}">${truncateText(payloadStr, 30)}</small>
            </td>
            <td>
                <small title="${log.body || '-'}">${truncateText(log.body, 30)}</small>
            </td>
            <td>
                <small title="${log.ext || '-'}">${truncateText(log.ext, 20)}</small>
            </td>
            <td><small>${log.processingTime}ms</small></td>
            <td><small class="text-muted">${timestamp}</small></td>
        </tr>
    `;
}

// 获取状态样式类
function getStatusClass(statusCode) {
    if (statusCode >= 200 && statusCode < 300) return 'success';
    if (statusCode >= 400) return 'error';
    return 'warning';
}

// 获取状态文本
function getStatusText(statusCode) {
    if (statusCode >= 200 && statusCode < 300) return '成功';
    if (statusCode >= 400 && statusCode < 500) return '客户端错误';
    if (statusCode >= 500) return '服务器错误';
    return '未知';
}

// 添加新日志到界面
function addNewLogToUI(logData) {
    // 将新日志添加到数组开头
    logs.unshift({
        id: Date.now(), // 临时ID
        ...logData,
        createdAt: logData.timestamp
    });
    
    // 限制日志数量
    if (logs.length > 1000) {
        logs = logs.slice(0, 1000);
    }
    
    // 重新显示日志
    displayLogs();
    
    // 显示实时指示器
    showRealTimeIndicator();
}

// 显示实时指示器
function showRealTimeIndicator() {
    const indicator = document.getElementById('realTimeIndicator');
    indicator.classList.add('real-time-indicator');
    
    setTimeout(() => {
        indicator.classList.remove('real-time-indicator');
    }, 2000);
}

// 显示日志详情
async function showLogDetail(logId) {
    try {
        const response = await fetch(`/api/logs/${logId}`);
        const data = await response.json();
        
        if (data.log) {
            // 显示提取的字段
            document.getElementById('detailMsgId').textContent = data.log.msg_id || '-';
            document.getElementById('detailFrom').textContent = data.log.from_user || '-';
            document.getElementById('detailTo').textContent = data.log.to_user || '-';
            document.getElementById('detailChatType').textContent = data.log.chatType || '-';
            document.getElementById('detailBody').textContent = data.log.body || '-';
            document.getElementById('detailExt').textContent = data.log.ext || '-';
            
            // 显示完整请求和响应
            document.getElementById('requestDetails').textContent = 
                JSON.stringify(data.log.requestBody, null, 2);
            document.getElementById('responseDetails').textContent = 
                JSON.stringify(data.log.responseBody, null, 2);
            
            const modal = new bootstrap.Modal(document.getElementById('logDetailModal'));
            modal.show();
        }
    } catch (error) {
        console.error('加载日志详情失败:', error);
        showAlert('加载日志详情失败: ' + error.message, 'danger');
    }
}

// 刷新日志
function refreshLogs() {
    loadLogs(false);
}

// 加载更多日志
function loadMoreLogs() {
    loadLogs(true);
}

// 过滤日志
function filterLogs() {
    displayLogs();
}

// 切换自动刷新
function toggleAutoRefresh() {
    const icon = document.getElementById('autoRefreshIcon');
    const text = document.getElementById('autoRefreshText');
    
    if (autoRefreshEnabled) {
        clearInterval(autoRefreshInterval);
        icon.className = 'bi bi-play-circle';
        text.textContent = '自动刷新';
        autoRefreshEnabled = false;
    } else {
        autoRefreshInterval = setInterval(() => {
            loadStats();
        }, 5000);
        icon.className = 'bi bi-pause-circle';
        text.textContent = '停止刷新';
        autoRefreshEnabled = true;
    }
}

// 更新统计数据
async function updateStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        updateStatsDisplay(data.stats);
    } catch (error) {
        console.error('更新统计数据失败:', error);
    }
}

// 显示警告消息
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.insertBefore(alertDiv, document.body.firstChild);
    
    // 3秒后自动消失
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 3000);
}
