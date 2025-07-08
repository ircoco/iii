/**
 * V3数据查询系统 - UI交互模块
 * 负责处理用户界面的交互
 */

// 使用立即执行函数表达式(IIFE)创建UI模块
const UI = (function() {
    'use strict';
    
    // 缓存DOM元素
    const elements = {};
    
    // 当前查询状态
    let queryState = {
        isLoading: false,
        lastQuery: null,
        lastResult: null,
        error: null
    };
    
    /**
     * 初始化UI模块
     */
    function init() {
        // 缓存常用DOM元素
        cacheElements();
        
        // 绑定事件监听器
        bindEventListeners();
        
        // 初始化UI状态
        updateUIState();
        
        // 检查系统健康状态
        checkSystemHealth();
    }
    
    /**
     * 缓存常用DOM元素
     */
    function cacheElements() {
        elements.queryForm = document.getElementById('queryForm');
        elements.queryInput = document.getElementById('queryInput');
        elements.submitButton = document.getElementById('submitButton');
        elements.resetButton = document.getElementById('resetButton');
        elements.resultsContainer = document.getElementById('resultsContainer');
        elements.loadingIndicator = document.getElementById('loadingIndicator');
        elements.errorContainer = document.getElementById('errorContainer');
        elements.resultsTable = document.getElementById('resultsTable');
        elements.resultsTableBody = document.getElementById('resultsTableBody');
        elements.noResultsMessage = document.getElementById('noResultsMessage');
        elements.statsContainer = document.getElementById('statsContainer');
        elements.exportButton = document.getElementById('exportButton');
        elements.printButton = document.getElementById('printButton');
        elements.systemStatus = document.getElementById('systemStatus');
        elements.notificationContainer = document.getElementById('notificationContainer');
    }
    
    /**
     * 绑定事件监听器
     */
    function bindEventListeners() {
        // 查询表单提交
        if (elements.queryForm) {
            elements.queryForm.addEventListener('submit', handleFormSubmit);
        }
        
        // 重置按钮
        if (elements.resetButton) {
            elements.resetButton.addEventListener('click', handleFormReset);
        }
        
        // 导出按钮
        if (elements.exportButton) {
            elements.exportButton.addEventListener('click', handleExport);
        }
        
        // 打印按钮
        if (elements.printButton) {
            elements.printButton.addEventListener('click', handlePrint);
        }
    }
    
    /**
     * 处理表单提交
     * @param {Event} event - 提交事件
     */
    async function handleFormSubmit(event) {
        event.preventDefault();
        
        // 如果正在加载，忽略
        if (queryState.isLoading) return;
        
        // 获取查询参数
        const queryParams = getFormData();
        
        // 验证表单
        const validationResult = validateForm(queryParams);
        if (!validationResult.isValid) {
            showError(validationResult.message);
            return;
        }
        
        // 更新状态为加载中
        setLoadingState(true);
        
        try {
            // 发送查询请求
            const result = await API.queryData(queryParams);
            
            // 处理响应
            handleQueryResponse(result, queryParams);
        } catch (error) {
            // 处理错误
            handleQueryError(error);
        } finally {
            // 更新状态为加载完成
            setLoadingState(false);
        }
    }
    
    /**
     * 获取表单数据
     * @returns {Object} 表单数据
     */
    function getFormData() {
        const formData = new FormData(elements.queryForm);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            data[key] = value.trim();
        }
        
        return data;
    }
    
    /**
     * 验证表单数据
     * @param {Object} data - 表单数据
     * @returns {Object} 验证结果
     */
    function validateForm(data) {
        // 检查必填字段
        if (!data.queryInput || data.queryInput.trim() === '') {
            return {
                isValid: false,
                message: CONFIG.ERROR_MESSAGES.EMPTY_QUERY
            };
        }
        
        // 检查查询长度
        if (data.queryInput.length > CONFIG.VALIDATION.MAX_QUERY_LENGTH) {
            return {
                isValid: false,
                message: CONFIG.ERROR_MESSAGES.QUERY_TOO_LONG
            };
        }
        
        return { isValid: true };
    }
    
    /**
     * 设置加载状态
     * @param {boolean} isLoading - 是否正在加载
     */
    function setLoadingState(isLoading) {
        queryState.isLoading = isLoading;
        
        // 更新UI元素
        if (elements.loadingIndicator) {
            elements.loadingIndicator.style.display = isLoading ? 'block' : 'none';
        }
        
        if (elements.submitButton) {
            elements.submitButton.disabled = isLoading;
            elements.submitButton.innerHTML = isLoading ? 
                '<span class="loading loading-spinner loading-sm"></span> 查询中...' : 
                '查询';
        }
        
        updateUIState();
    }
    
    /**
     * 处理查询响应
     * @param {Object} result - 查询结果
     * @param {Object} queryParams - 查询参数
     */
    function handleQueryResponse(result, queryParams) {
        // 保存最近的查询和结果
        queryState.lastQuery = queryParams;
        queryState.lastResult = result;
        queryState.error = null;
        
        // 检查是否有错误
        if (result.status === 'error') {
            handleQueryError(result);
            return;
        }
        
        // 显示结果
        displayResults(result);
        
        // 更新统计信息
        updateStats(result);
        
        // 显示成功通知
        showNotification('查询成功', 'success');
    }
    
    /**
     * 处理查询错误
     * @param {Object|Error} error - 错误对象
     */
    function handleQueryError(error) {
        // 保存错误状态
        queryState.error = error;
        
        // 显示错误消息
        const errorMessage = error.message || CONFIG.ERROR_MESSAGES.QUERY_ERROR;
        showError(errorMessage);
        
        // 清空结果
        clearResults();
        
        // 显示错误通知
        showNotification(errorMessage, 'error');
    }
    
    /**
     * 显示错误消息
     * @param {string} message - 错误消息
     */
    function showError(message) {
        if (elements.errorContainer) {
            elements.errorContainer.textContent = message;
            elements.errorContainer.style.display = 'block';
            
            // 5秒后自动隐藏
            setTimeout(() => {
                elements.errorContainer.style.display = 'none';
            }, 5000);
        }
    }
    
    /**
     * 显示查询结果
     * @param {Object} result - 查询结果
     */
    function displayResults(result) {
        // 清空之前的结果
        clearResults();
        
        // 显示结果容器
        if (elements.resultsContainer) {
            elements.resultsContainer.style.display = 'block';
        }
        
        // 检查是否有数据
        if (!result.data || result.data.length === 0) {
            if (elements.noResultsMessage) {
                elements.noResultsMessage.style.display = 'block';
            }
            return;
        }
        
        // 填充表格
        populateTable(result.data);
        
        // 启用导出和打印按钮
        if (elements.exportButton) {
            elements.exportButton.disabled = false;
        }
        
        if (elements.printButton) {
            elements.printButton.disabled = false;
        }
    }
    
    /**
     * 填充结果表格
     * @param {Array} data - 结果数据
     */
    function populateTable(data) {
        if (!elements.resultsTableBody || !data || data.length === 0) return;
        
        // 清空表格
        elements.resultsTableBody.innerHTML = '';
        
        // 获取表头
        const headers = Object.keys(data[0]);
        
        // 填充表格行
        data.forEach((item, index) => {
            const row = document.createElement('tr');
            
            // 添加行号
            const indexCell = document.createElement('td');
            indexCell.textContent = index + 1;
            row.appendChild(indexCell);
            
            // 添加数据列
            headers.forEach(header => {
                const cell = document.createElement('td');
                
                // 格式化单元格内容
                let cellContent = item[header];
                
                // 根据列类型格式化内容
                if (typeof cellContent === 'number') {
                    // 数字格式化
                    cellContent = formatNumber(cellContent);
                } else if (cellContent instanceof Date) {
                    // 日期格式化
                    cellContent = formatDate(cellContent);
                } else if (typeof cellContent === 'boolean') {
                    // 布尔值格式化
                    cellContent = cellContent ? '是' : '否';
                }
                
                cell.textContent = cellContent;
                row.appendChild(cell);
            });
            
            // 添加行到表格
            elements.resultsTableBody.appendChild(row);
        });
        
        // 显示表格
        if (elements.resultsTable) {
            elements.resultsTable.style.display = 'table';
        }
    }
    
    /**
     * 更新统计信息
     * @param {Object} result - 查询结果
     */
    function updateStats(result) {
        if (!elements.statsContainer || !result.stats) return;
        
        // 清空统计容器
        elements.statsContainer.innerHTML = '';
        
        // 创建统计卡片
        Object.entries(result.stats).forEach(([key, value]) => {
            // 创建统计卡片
            const statCard = document.createElement('div');
            statCard.className = 'stat-card';
            
            // 创建标题
            const title = document.createElement('div');
            title.className = 'stat-title';
            title.textContent = formatStatTitle(key);
            
            // 创建值
            const valueElement = document.createElement('div');
            valueElement.className = 'stat-value';
            valueElement.textContent = formatStatValue(key, value);
            
            // 添加到卡片
            statCard.appendChild(title);
            statCard.appendChild(valueElement);
            
            // 添加到统计容器
            elements.statsContainer.appendChild(statCard);
        });
        
        // 显示统计容器
        elements.statsContainer.style.display = 'flex';
    }
    
    /**
     * 格式化统计标题
     * @param {string} key - 统计键
     * @returns {string} 格式化的标题
     */
    function formatStatTitle(key) {
        // 将驼峰命名转换为空格分隔的标题
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
    
    /**
     * 格式化统计值
     * @param {string} key - 统计键
     * @param {*} value - 统计值
     * @returns {string} 格式化的值
     */
    function formatStatValue(key, value) {
        // 根据键类型格式化值
        if (typeof value === 'number') {
            // 检查是否是百分比
            if (key.toLowerCase().includes('percent') || key.toLowerCase().includes('rate')) {
                return `${(value * 100).toFixed(2)}%`;
            }
            
            // 检查是否是货币
            if (key.toLowerCase().includes('profit') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('price')) {
                return formatCurrency(value);
            }
            
            // 普通数字
            return formatNumber(value);
        }
        
        // 日期
        if (value instanceof Date) {
            return formatDate(value);
        }
        
        // 默认返回字符串
        return String(value);
    }
    
    /**
     * 格式化数字
     * @param {number} num - 数字
     * @returns {string} 格式化的数字
     */
    function formatNumber(num) {
        return new Intl.NumberFormat(CONFIG.UI.LOCALE).format(num);
    }
    
    /**
     * 格式化货币
     * @param {number} amount - 金额
     * @returns {string} 格式化的货币
     */
    function formatCurrency(amount) {
        return new Intl.NumberFormat(CONFIG.UI.LOCALE, {
            style: 'currency',
            currency: CONFIG.UI.CURRENCY
        }).format(amount);
    }
    
    /**
     * 格式化日期
     * @param {Date} date - 日期
     * @returns {string} 格式化的日期
     */
    function formatDate(date) {
        return new Intl.DateTimeFormat(CONFIG.UI.LOCALE, CONFIG.UI.DATE_FORMAT).format(date);
    }
    
    /**
     * 清空结果
     */
    function clearResults() {
        // 隐藏结果容器
        if (elements.resultsContainer) {
            elements.resultsContainer.style.display = 'none';
        }
        
        // 隐藏无结果消息
        if (elements.noResultsMessage) {
            elements.noResultsMessage.style.display = 'none';
        }
        
        // 清空表格
        if (elements.resultsTableBody) {
            elements.resultsTableBody.innerHTML = '';
        }
        
        // 隐藏表格
        if (elements.resultsTable) {
            elements.resultsTable.style.display = 'none';
        }
        
        // 清空统计
        if (elements.statsContainer) {
            elements.statsContainer.innerHTML = '';
            elements.statsContainer.style.display = 'none';
        }
        
        // 禁用导出和打印按钮
        if (elements.exportButton) {
            elements.exportButton.disabled = true;
        }
        
        if (elements.printButton) {
            elements.printButton.disabled = true;
        }
    }
    
    /**
     * 处理表单重置
     */
    function handleFormReset() {
        // 重置表单
        if (elements.queryForm) {
            elements.queryForm.reset();
        }
        
        // 清空结果
        clearResults();
        
        // 隐藏错误
        if (elements.errorContainer) {
            elements.errorContainer.style.display = 'none';
        }
        
        // 重置查询状态
        queryState.lastQuery = null;
        queryState.lastResult = null;
        queryState.error = null;
        
        // 更新UI状态
        updateUIState();
    }
    
    /**
     * 处理导出功能
     */
    function handleExport() {
        if (!queryState.lastResult || !queryState.lastResult.data) {
            showNotification('没有可导出的数据', 'warning');
            return;
        }
        
        try {
            // 使用计算服务生成CSV
            const csvContent = CalculationService.generateCSV(queryState.lastResult.data);
            
            // 创建Blob对象
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            
            // 创建下载链接
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            // 设置下载属性
            link.setAttribute('href', url);
            link.setAttribute('download', `查询结果_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            
            // 添加到文档并触发点击
            document.body.appendChild(link);
            link.click();
            
            // 清理
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            // 显示成功通知
            showNotification('导出成功', 'success');
        } catch (error) {
            console.error('导出错误:', error);
            showNotification('导出失败: ' + error.message, 'error');
        }
    }
    
    /**
     * 处理打印功能
     */
    function handlePrint() {
        if (!queryState.lastResult || !queryState.lastResult.data) {
            showNotification('没有可打印的数据', 'warning');
            return;
        }
        
        // 打印前准备
        const originalTitle = document.title;
        document.title = `查询结果_${new Date().toISOString().slice(0, 10)}`;
        
        // 添加打印样式类
        document.body.classList.add('printing');
        
        // 调用打印
        window.print();
        
        // 打印后恢复
        document.body.classList.remove('printing');
        document.title = originalTitle;
    }
    
    /**
     * 更新UI状态
     */
    function updateUIState() {
        // 根据查询状态更新UI元素
        const hasResults = queryState.lastResult && queryState.lastResult.data;
        
        // 更新导出和打印按钮状态
        if (elements.exportButton) {
            elements.exportButton.disabled = !hasResults || queryState.isLoading;
        }
        
        if (elements.printButton) {
            elements.printButton.disabled = !hasResults || queryState.isLoading;
        }
    }
    
    /**
     * 显示通知
     * @param {string} message - 通知消息
     * @param {string} type - 通知类型 (success, error, warning, info)
     */
    function showNotification(message, type = 'info') {
        if (!elements.notificationContainer) return;
        
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">
                ${getNotificationIcon(type)}
            </div>
            <div class="notification-content">
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        // 添加关闭事件
        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            notification.classList.add('notification-hiding');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
        
        // 添加到容器
        elements.notificationContainer.appendChild(notification);
        
        // 添加显示类
        setTimeout(() => {
            notification.classList.add('notification-visible');
        }, 10);
        
        // 自动关闭
        setTimeout(() => {
            notification.classList.add('notification-hiding');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, CONFIG.UI.NOTIFICATION_TIMEOUT);
    }
    
    /**
     * 获取通知图标
     * @param {string} type - 通知类型
     * @returns {string} 图标HTML
     */
    function getNotificationIcon(type) {
        switch (type) {
            case 'success':
                return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>';
            case 'error':
                return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path></svg>';
            case 'warning':
                return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"></path></svg>';
            case 'info':
            default:
                return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path></svg>';
        }
    }
    
    /**
     * 检查系统健康状态
     */
    async function checkSystemHealth() {
        try {
            const healthStatus = await API.checkHealth();
            updateSystemStatus(healthStatus);
        } catch (error) {
            console.error('健康检查错误:', error);
            updateSystemStatus({ status: 'error', message: '系统状态检查失败' });
        }
    }
    
    /**
     * 更新系统状态指示器
     * @param {Object} status - 状态对象
     */
    function updateSystemStatus(status) {
        if (!elements.systemStatus) return;
        
        // 移除所有状态类
        elements.systemStatus.classList.remove('status-ok', 'status-warning', 'status-error');
        
        // 设置状态文本和类
        let statusText = '系统状态: ';
        let statusClass = '';
        
        if (status.status === 'ok') {
            statusText += '正常';
            statusClass = 'status-ok';
        } else if (status.status === 'warning') {
            statusText += '警告';
            statusClass = 'status-warning';
        } else {
            statusText += '错误';
            statusClass = 'status-error';
        }
        
        elements.systemStatus.textContent = statusText;
        elements.systemStatus.classList.add(statusClass);
        
        // 设置提示信息
        if (status.message) {
            elements.systemStatus.setAttribute('title', status.message);
        }
    }
    
    // 返回公共API
    return {
        init,
        showNotification,
        updateSystemStatus,
        clearResults
    };
})();

// 当DOM加载完成后初始化UI
document.addEventListener('DOMContentLoaded', UI.init);