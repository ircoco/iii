/**
 * V3数据查询系统 - 主脚本
 * 应用程序入口点，负责初始化和协调其他模块
 */

// 使用立即执行函数表达式(IIFE)创建主应用模块
const App = (function() {
    'use strict';
    
    // 应用状态
    let appState = {
        initialized: false,
        browserCompatible: true,
        performanceMode: 'normal', // normal, high-performance, low-resource
        darkMode: false,
        debug: false
    };
    
    // 性能监控数据
    const performanceMetrics = {
        initTime: 0,
        loadTime: 0,
        apiCallTimes: [],
        renderTimes: [],
        memoryUsage: []
    };
    
    /**
     * 初始化应用
     */
    function init() {
        // 记录初始化开始时间
        const startTime = performance.now();
        
        try {
            // 检查浏览器兼容性
            checkBrowserCompatibility();
            
            // 如果浏览器不兼容，显示警告并返回
            if (!appState.browserCompatible) {
                showBrowserCompatibilityWarning();
                return;
            }
            
            // 检测性能模式
            detectPerformanceMode();
            
            // 加载用户首选项
            loadUserPreferences();
            
            // 初始化调试模式
            initDebugMode();
            
            // 设置全局错误处理
            setupErrorHandling();
            
            // 记录初始化完成时间
            performanceMetrics.initTime = performance.now() - startTime;
            performanceMetrics.loadTime = performance.now();
            
            // 标记应用为已初始化
            appState.initialized = true;
            
            // 记录内存使用情况
            if (window.performance && window.performance.memory) {
                performanceMetrics.memoryUsage.push({
                    timestamp: Date.now(),
                    value: window.performance.memory.usedJSHeapSize
                });
            }
            
            // 如果在调试模式下，输出初始化信息
            if (appState.debug) {
                console.log('应用初始化完成', {
                    state: appState,
                    performance: performanceMetrics
                });
            }
        } catch (error) {
            // 处理初始化错误
            handleInitError(error);
        }
    }
    
    /**
     * 检查浏览器兼容性
     */
    function checkBrowserCompatibility() {
        // 检查必要的浏览器功能
        const requiredFeatures = [
            'Promise' in window,
            'fetch' in window,
            'localStorage' in window,
            'Map' in window,
            'Array.prototype.forEach' in window,
            'JSON' in window
        ];
        
        // 如果有任何必要功能缺失，标记为不兼容
        appState.browserCompatible = requiredFeatures.every(feature => feature);
        
        // 检查浏览器版本
        const userAgent = navigator.userAgent;
        const browserInfo = {
            isIE: /MSIE|Trident/.test(userAgent),
            isEdgeLegacy: /Edge\/\d+/.test(userAgent),
            isChrome: /Chrome\/\d+/.test(userAgent) && !/Edg\//.test(userAgent),
            isFirefox: /Firefox\/\d+/.test(userAgent),
            isSafari: /Safari\/\d+/.test(userAgent) && !/Chrome\//.test(userAgent),
            isOpera: /OPR\/\d+/.test(userAgent)
        };
        
        // IE和旧版Edge不兼容
        if (browserInfo.isIE || browserInfo.isEdgeLegacy) {
            appState.browserCompatible = false;
        }
        
        // 保存浏览器信息
        appState.browserInfo = browserInfo;
    }
    
    /**
     * 显示浏览器兼容性警告
     */
    function showBrowserCompatibilityWarning() {
        // 创建警告元素
        const warningElement = document.createElement('div');
        warningElement.className = 'browser-compatibility-warning';
        warningElement.innerHTML = `
            <div class="container mx-auto px-4 py-8 text-center">
                <svg class="w-16 h-16 mx-auto text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <h1 class="text-2xl font-bold mt-4">浏览器不兼容</h1>
                <p class="mt-2">您的浏览器版本过低或不受支持，可能导致功能无法正常使用。</p>
                <p class="mt-4">请使用以下浏览器的最新版本：</p>
                <div class="flex justify-center mt-4 space-x-4">
                    <div class="text-center">
                        <img src="https://cdn.jsdelivr.net/npm/browser-logos/src/chrome/chrome.png" alt="Chrome" class="w-12 h-12 mx-auto">
                        <p class="mt-2">Chrome</p>
                    </div>
                    <div class="text-center">
                        <img src="https://cdn.jsdelivr.net/npm/browser-logos/src/firefox/firefox.png" alt="Firefox" class="w-12 h-12 mx-auto">
                        <p class="mt-2">Firefox</p>
                    </div>
                    <div class="text-center">
                        <img src="https://cdn.jsdelivr.net/npm/browser-logos/src/edge/edge.png" alt="Edge" class="w-12 h-12 mx-auto">
                        <p class="mt-2">Edge</p>
                    </div>
                    <div class="text-center">
                        <img src="https://cdn.jsdelivr.net/npm/browser-logos/src/safari/safari.png" alt="Safari" class="w-12 h-12 mx-auto">
                        <p class="mt-2">Safari</p>
                    </div>
                </div>
                <button id="continue-anyway" class="mt-6 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors">仍然继续</button>
            </div>
        `;
        
        // 添加到页面
        document.body.appendChild(warningElement);
        
        // 添加"仍然继续"按钮事件
        document.getElementById('continue-anyway').addEventListener('click', function() {
            warningElement.remove();
            appState.browserCompatible = true; // 强制继续
            init(); // 重新初始化
        });
    }
    
    /**
     * 检测性能模式
     */
    function detectPerformanceMode() {
        // 检测设备性能
        const deviceMemory = navigator.deviceMemory || 4; // 默认4GB
        const hardwareConcurrency = navigator.hardwareConcurrency || 4; // 默认4核
        
        // 根据设备性能设置模式
        if (deviceMemory <= 2 || hardwareConcurrency <= 2) {
            // 低资源模式
            appState.performanceMode = 'low-resource';
            
            // 应用低资源模式优化
            applyLowResourceMode();
        } else if (deviceMemory >= 8 && hardwareConcurrency >= 8) {
            // 高性能模式
            appState.performanceMode = 'high-performance';
        }
    }
    
    /**
     * 应用低资源模式优化
     */
    function applyLowResourceMode() {
        // 减少动画
        document.body.classList.add('reduce-motion');
        
        // 减少缓存大小
        CONFIG.PERFORMANCE.CACHE_SIZE = Math.floor(CONFIG.PERFORMANCE.CACHE_SIZE / 2);
        
        // 增加节流和防抖时间
        CONFIG.PERFORMANCE.DEBOUNCE_DELAY *= 1.5;
        CONFIG.PERFORMANCE.THROTTLE_DELAY *= 1.5;
    }
    
    /**
     * 加载用户首选项
     */
    function loadUserPreferences() {
        // 从本地存储加载暗色模式设置
        const darkModeSetting = CONFIG.UTILS.storage.get('dark_mode');
        if (darkModeSetting === 'true') {
            appState.darkMode = true;
            document.documentElement.classList.add('dark');
        } else if (darkModeSetting === null) {
            // 如果没有保存的设置，检查系统首选项
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                appState.darkMode = true;
                document.documentElement.classList.add('dark');
                CONFIG.UTILS.storage.set('dark_mode', 'true');
            }
        }
        
        // 从本地存储加载调试模式设置
        const debugModeSetting = CONFIG.UTILS.storage.get('debug_mode');
        if (debugModeSetting === 'true') {
            appState.debug = true;
        }
    }
    
    /**
     * 初始化调试模式
     */
    function initDebugMode() {
        if (appState.debug) {
            // 添加调试面板
            createDebugPanel();
            
            // 启用性能监控
            startPerformanceMonitoring();
        }
    }
    
    /**
     * 创建调试面板
     */
    function createDebugPanel() {
        // 创建调试面板元素
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.className = 'fixed bottom-0 right-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 shadow-lg p-4 m-4 rounded-lg z-50 text-sm';
        debugPanel.style.maxHeight = '300px';
        debugPanel.style.overflowY = 'auto';
        debugPanel.style.display = 'none';
        
        // 添加调试面板内容
        debugPanel.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <h3 class="font-bold">调试面板</h3>
                <button id="close-debug-panel" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div id="debug-content" class="space-y-2">
                <div>
                    <span class="font-medium">应用状态:</span>
                    <pre id="app-state" class="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto"></pre>
                </div>
                <div>
                    <span class="font-medium">性能指标:</span>
                    <pre id="performance-metrics" class="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto"></pre>
                </div>
                <div>
                    <span class="font-medium">最近API调用:</span>
                    <pre id="recent-api-calls" class="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto"></pre>
                </div>
            </div>
            <div class="mt-4 flex space-x-2">
                <button id="clear-cache-btn" class="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors">清除缓存</button>
                <button id="refresh-metrics-btn" class="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors">刷新指标</button>
            </div>
        `;
        
        // 添加到页面
        document.body.appendChild(debugPanel);
        
        // 添加调试按钮
        const debugButton = document.createElement('button');
        debugButton.id = 'debug-button';
        debugButton.className = 'fixed bottom-4 right-4 bg-gray-800 dark:bg-gray-700 text-white rounded-full p-2 shadow-lg z-50';
        debugButton.innerHTML = `
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
        `;
        
        // 添加到页面
        document.body.appendChild(debugButton);
        
        // 添加事件监听器
        debugButton.addEventListener('click', function() {
            const panel = document.getElementById('debug-panel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            updateDebugPanel();
        });
        
        document.getElementById('close-debug-panel').addEventListener('click', function() {
            document.getElementById('debug-panel').style.display = 'none';
        });
        
        document.getElementById('clear-cache-btn').addEventListener('click', function() {
            // 清除API缓存
            API.clearCache();
            
            // 清除计算缓存
            CalculationService.clearCache();
            
            // 显示通知
            UI.showNotification('success', '缓存已清除', '所有缓存数据已被清除');
            
            // 更新调试面板
            updateDebugPanel();
        });
        
        document.getElementById('refresh-metrics-btn').addEventListener('click', function() {
            updateDebugPanel();
        });
    }
    
    /**
     * 更新调试面板
     */
    function updateDebugPanel() {
        // 更新应用状态
        document.getElementById('app-state').textContent = JSON.stringify(appState, null, 2);
        
        // 更新性能指标
        document.getElementById('performance-metrics').textContent = JSON.stringify(performanceMetrics, null, 2);
        
        // 更新最近API调用
        const recentCalls = API.getRecentCalls ? API.getRecentCalls() : '未实现';
        document.getElementById('recent-api-calls').textContent = typeof recentCalls === 'string' ? recentCalls : JSON.stringify(recentCalls, null, 2);
    }
    
    /**
     * 启动性能监控
     */
    function startPerformanceMonitoring() {
        // 每30秒记录一次内存使用情况
        setInterval(function() {
            if (window.performance && window.performance.memory) {
                performanceMetrics.memoryUsage.push({
                    timestamp: Date.now(),
                    value: window.performance.memory.usedJSHeapSize
                });
                
                // 只保留最近10条记录
                if (performanceMetrics.memoryUsage.length > 10) {
                    performanceMetrics.memoryUsage.shift();
                }
            }
        }, 30000);
    }
    
    /**
     * 设置全局错误处理
     */
    function setupErrorHandling() {
        // 捕获未处理的Promise错误
        window.addEventListener('unhandledrejection', function(event) {
            handleError(event.reason, 'Unhandled Promise Rejection');
        });
        
        // 捕获全局JavaScript错误
        window.addEventListener('error', function(event) {
            handleError(event.error, 'JavaScript Error');
        });
    }
    
    /**
     * 处理错误
     * @param {Error} error - 错误对象
     * @param {string} source - 错误来源
     */
    function handleError(error, source) {
        // 构建错误信息
        const errorInfo = {
            message: error.message || '未知错误',
            stack: error.stack,
            source: source,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        // 在调试模式下输出错误
        if (appState.debug) {
            console.error('应用错误:', errorInfo);
        }
        
        // 如果UI已初始化，显示通知
        if (appState.initialized && typeof UI !== 'undefined' && UI.showNotification) {
            UI.showNotification('error', '应用错误', errorInfo.message);
        }
        
        // 记录错误到本地存储
        logErrorToStorage(errorInfo);
    }
    
    /**
     * 处理初始化错误
     * @param {Error} error - 错误对象
     */
    function handleInitError(error) {
        console.error('初始化错误:', error);
        
        // 显示错误消息
        const errorElement = document.createElement('div');
        errorElement.className = 'init-error-message';
        errorElement.innerHTML = `
            <div class="container mx-auto px-4 py-8 text-center">
                <svg class="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <h1 class="text-2xl font-bold mt-4">初始化失败</h1>
                <p class="mt-2">${error.message || '应用程序初始化过程中发生错误'}</p>
                <button id="retry-init" class="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">重试</button>
            </div>
        `;
        
        // 添加到页面
        document.body.appendChild(errorElement);
        
        // 添加重试按钮事件
        document.getElementById('retry-init').addEventListener('click', function() {
            errorElement.remove();
            init(); // 重新初始化
        });
    }
    
    /**
     * 记录错误到本地存储
     * @param {Object} errorInfo - 错误信息
     */
    function logErrorToStorage(errorInfo) {
        try {
            // 获取现有错误日志
            let errorLog = JSON.parse(localStorage.getItem('error_log') || '[]');
            
            // 添加新错误
            errorLog.push(errorInfo);
            
            // 只保留最近10条错误
            if (errorLog.length > 10) {
                errorLog = errorLog.slice(-10);
            }
            
            // 保存回本地存储
            localStorage.setItem('error_log', JSON.stringify(errorLog));
        } catch (e) {
            // 本地存储操作失败，忽略
            console.error('无法记录错误到本地存储:', e);
        }
    }
    
    /**
     * 切换暗色模式
     */
    function toggleDarkMode() {
        appState.darkMode = !appState.darkMode;
        
        if (appState.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        
        // 保存设置到本地存储
        CONFIG.UTILS.storage.set('dark_mode', appState.darkMode.toString());
        
        return appState.darkMode;
    }
    
    /**
     * 切换调试模式
     */
    function toggleDebugMode() {
        appState.debug = !appState.debug;
        
        // 保存设置到本地存储
        CONFIG.UTILS.storage.set('debug_mode', appState.debug.toString());
        
        if (appState.debug) {
            // 创建调试面板
            if (!document.getElementById('debug-panel')) {
                createDebugPanel();
            }
            
            // 显示调试按钮
            const debugButton = document.getElementById('debug-button');
            if (debugButton) {
                debugButton.style.display = 'block';
            }
            
            // 启动性能监控
            startPerformanceMonitoring();
        } else {
            // 隐藏调试面板和按钮
            const debugPanel = document.getElementById('debug-panel');
            const debugButton = document.getElementById('debug-button');
            
            if (debugPanel) {
                debugPanel.style.display = 'none';
            }
            
            if (debugButton) {
                debugButton.style.display = 'none';
            }
        }
        
        return appState.debug;
    }
    
    /**
     * 记录API调用性能
     * @param {string} endpoint - API端点
     * @param {number} duration - 调用持续时间(毫秒)
     */
    function logApiPerformance(endpoint, duration) {
        performanceMetrics.apiCallTimes.push({
            endpoint,
            duration,
            timestamp: Date.now()
        });
        
        // 只保留最近10条记录
        if (performanceMetrics.apiCallTimes.length > 10) {
            performanceMetrics.apiCallTimes.shift();
        }
    }
    
    /**
     * 记录渲染性能
     * @param {string} component - 组件名称
     * @param {number} duration - 渲染持续时间(毫秒)
     */
    function logRenderPerformance(component, duration) {
        performanceMetrics.renderTimes.push({
            component,
            duration,
            timestamp: Date.now()
        });
        
        // 只保留最近10条记录
        if (performanceMetrics.renderTimes.length > 10) {
            performanceMetrics.renderTimes.shift();
        }
    }
    
    /**
     * 获取应用状态
     * @returns {Object} 应用状态
     */
    function getAppState() {
        return { ...appState };
    }
    
    /**
     * 获取性能指标
     * @returns {Object} 性能指标
     */
    function getPerformanceMetrics() {
        return { ...performanceMetrics };
    }
    
    // 返回公共API
    return {
        init,
        toggleDarkMode,
        toggleDebugMode,
        logApiPerformance,
        logRenderPerformance,
        getAppState,
        getPerformanceMetrics,
        handleError
    };
})();

// 当DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', App.init);

// 添加暗色模式切换按钮事件
document.addEventListener('DOMContentLoaded', function() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function() {
            const isDarkMode = App.toggleDarkMode();
            
            // 更新按钮图标
            this.innerHTML = isDarkMode
                ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>'
                : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>';
        });
    }
});

// 添加调试模式切换快捷键
document.addEventListener('keydown', function(event) {
    // Ctrl+Shift+D 切换调试模式
    if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        App.toggleDebugMode();
    }
});