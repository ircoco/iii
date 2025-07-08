/**
 * V3数据查询系统 - 配置文件
 * 定义全局配置和常量
 */

// 使用立即执行函数表达式(IIFE)创建配置模块
const CONFIG = (function() {
    'use strict';
    
    // API配置
    const API = {
        // API端点
        ENDPOINTS: {
            QUERY: '/api/query',
            HEALTH: '/health'
        },
        // 请求超时时间(毫秒)
        TIMEOUT: 30000,
        // 重试次数
        MAX_RETRIES: 3,
        // 重试延迟(毫秒)
        RETRY_DELAY: 1000,
        // 默认请求头
        HEADERS: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        // 默认认证信息
        AUTH: {
            APP_ID: 'v3_client',
            AUTH_KEY: 'default_auth_key'
        }
    };
    
    // UI配置
    const UI = {
        // 动画持续时间(毫秒)
        ANIMATION_DURATION: 300,
        // 通知显示时间(毫秒)
        NOTIFICATION_DURATION: 5000,
        // 状态刷新间隔(毫秒)
        STATUS_REFRESH_INTERVAL: 60000,
        // 日期格式
        DATE_FORMAT: 'YYYY-MM-DD',
        // 货币格式
        CURRENCY_FORMAT: {
            style: 'currency',
            currency: 'CNY',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        },
        // 表格每页显示行数
        TABLE_ROWS_PER_PAGE: 10,
        // 移动端断点(像素)
        MOBILE_BREAKPOINT: 768,
        // 加载状态消息
        LOADING_MESSAGES: [
            '正在查询数据，请稍候...',
            '正在处理您的请求...',
            '数据查询中，请耐心等待...',
            '正在连接服务器...',
            '正在获取最新数据...'
        ]
    };
    
    // 验证规则
    const VALIDATION = {
        // 项目ID验证
        PROJECT_ID: {
            PATTERN: /^[A-Za-z0-9_-]{3,20}$/,
            MIN_LENGTH: 3,
            MAX_LENGTH: 20
        },
        // UK代码验证
        UK_CODE: {
            PATTERN: /^[A-Za-z0-9_-]{5,30}$/,
            MIN_LENGTH: 5,
            MAX_LENGTH: 30
        },
        // 日期验证
        DATE: {
            MIN_DATE: '2000-01-01',
            MAX_DATE: new Date().toISOString().split('T')[0], // 今天
            MAX_RANGE_DAYS: 365 // 最大日期范围(天)
        }
    };
    
    // 错误消息
    const ERROR_MESSAGES = {
        NETWORK_ERROR: '网络连接错误，请检查您的网络连接后重试。',
        SERVER_ERROR: '服务器内部错误，请稍后重试。',
        TIMEOUT_ERROR: '请求超时，服务器响应时间过长。',
        VALIDATION_ERROR: '请检查输入数据是否正确。',
        AUTH_ERROR: '认证失败，请检查您的访问权限。',
        NOT_FOUND: '请求的资源不存在。',
        UNKNOWN_ERROR: '发生未知错误，请重试或联系技术支持。',
        // 字段验证错误
        FIELD_ERRORS: {
            PROJECT_ID_REQUIRED: '项目ID不能为空',
            PROJECT_ID_INVALID: '项目ID格式不正确，应为3-20位字母、数字、下划线或连字符',
            UK_CODE_REQUIRED: 'UK代码不能为空',
            UK_CODE_INVALID: 'UK代码格式不正确，应为5-30位字母、数字、下划线或连字符',
            START_DATE_REQUIRED: '开始日期不能为空',
            START_DATE_INVALID: '开始日期格式不正确',
            END_DATE_REQUIRED: '结束日期不能为空',
            END_DATE_INVALID: '结束日期格式不正确',
            DATE_RANGE_INVALID: '结束日期必须晚于或等于开始日期',
            DATE_RANGE_TOO_LARGE: `日期范围不能超过${VALIDATION.DATE.MAX_RANGE_DAYS}天`
        }
    };
    
    // 性能优化配置
    const PERFORMANCE = {
        // 防抖延迟(毫秒)
        DEBOUNCE_DELAY: 300,
        // 节流延迟(毫秒)
        THROTTLE_DELAY: 300,
        // 懒加载偏移量(像素)
        LAZY_LOAD_OFFSET: 100,
        // 批处理大小(用于大数据渲染)
        BATCH_SIZE: 50,
        // 批处理延迟(毫秒)
        BATCH_DELAY: 10,
        // 缓存过期时间(毫秒)
        CACHE_EXPIRY: 5 * 60 * 1000, // 5分钟
        // 是否启用请求缓存
        ENABLE_REQUEST_CACHE: true,
        // 是否启用虚拟滚动
        ENABLE_VIRTUAL_SCROLL: true,
        // 虚拟滚动缓冲区大小
        VIRTUAL_SCROLL_BUFFER: 10
    };
    
    // 默认值
    const DEFAULTS = {
        // 默认日期范围(天)
        DEFAULT_DATE_RANGE: 30,
        // 默认项目ID
        DEFAULT_PROJECT_ID: '',
        // 默认UK代码
        DEFAULT_UK_CODE: '',
        // 默认排序字段
        DEFAULT_SORT_FIELD: 'date',
        // 默认排序方向
        DEFAULT_SORT_DIRECTION: 'desc',
        // 默认页码
        DEFAULT_PAGE: 1
    };
    
    // 环境配置
    const ENV = {
        // 当前环境
        CURRENT: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'development' : 'production',
        // 是否启用调试
        DEBUG: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
        // 版本号
        VERSION: 'v3.0.0',
        // 构建时间
        BUILD_TIME: '2023-07-01'
    };
    
    // 浏览器兼容性检查配置
    const BROWSER_COMPATIBILITY = {
        // 最低支持的浏览器版本
        MIN_VERSIONS: {
            'chrome': 70,
            'firefox': 68,
            'safari': 12,
            'edge': 79,
            'opera': 60,
            'ie': null // 不支持IE
        },
        // 功能检测列表
        REQUIRED_FEATURES: [
            'Promise',
            'fetch',
            'localStorage',
            'Intl',
            'Map',
            'Set',
            'Array.prototype.includes',
            'Object.assign'
        ]
    };
    
    // 安全配置
    const SECURITY = {
        // XSS过滤器
        XSS_FILTER: {
            ENABLED: true,
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
            ALLOWED_ATTR: ['href', 'target', 'rel']
        },
        // CSRF保护
        CSRF: {
            ENABLED: true,
            HEADER_NAME: 'X-CSRF-Token',
            COOKIE_NAME: 'csrf_token'
        },
        // 内容安全策略
        CSP: {
            ENABLED: true,
            REPORT_URI: '/api/csp-report'
        }
    };
    
    // 工具函数
    const UTILS = {
        /**
         * 防抖函数
         * @param {Function} func - 要执行的函数
         * @param {number} wait - 等待时间(毫秒)
         * @returns {Function} - 防抖处理后的函数
         */
        debounce: function(func, wait = PERFORMANCE.DEBOUNCE_DELAY) {
            let timeout;
            return function(...args) {
                const context = this;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), wait);
            };
        },
        
        /**
         * 节流函数
         * @param {Function} func - 要执行的函数
         * @param {number} limit - 限制时间(毫秒)
         * @returns {Function} - 节流处理后的函数
         */
        throttle: function(func, limit = PERFORMANCE.THROTTLE_DELAY) {
            let inThrottle;
            return function(...args) {
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },
        
        /**
         * 格式化日期
         * @param {Date|string} date - 日期对象或日期字符串
         * @param {string} format - 格式化模式
         * @returns {string} - 格式化后的日期字符串
         */
        formatDate: function(date, format = UI.DATE_FORMAT) {
            if (!date) return '';
            
            const d = typeof date === 'string' ? new Date(date) : date;
            if (isNaN(d.getTime())) return '';
            
            // 简单的格式化实现，实际项目中可以使用日期库如dayjs
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            
            return format
                .replace('YYYY', year)
                .replace('MM', month)
                .replace('DD', day);
        },
        
        /**
         * 格式化货币
         * @param {number} amount - 金额
         * @param {Object} options - 格式化选项
         * @returns {string} - 格式化后的货币字符串
         */
        formatCurrency: function(amount, options = UI.CURRENCY_FORMAT) {
            if (amount === null || amount === undefined) return '';
            
            try {
                return new Intl.NumberFormat('zh-CN', options).format(amount);
            } catch (e) {
                return `¥${amount.toFixed(2)}`;
            }
        },
        
        /**
         * 生成UUID
         * @returns {string} - UUID字符串
         */
        generateUUID: function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },
        
        /**
         * 深拷贝对象
         * @param {Object} obj - 要拷贝的对象
         * @returns {Object} - 拷贝后的新对象
         */
        deepClone: function(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            try {
                return JSON.parse(JSON.stringify(obj));
            } catch (e) {
                console.error('深拷贝失败:', e);
                return obj;
            }
        },
        
        /**
         * 本地存储操作
         */
        storage: {
            /**
             * 保存数据到本地存储
             * @param {string} key - 键名
             * @param {*} value - 要存储的值
             * @param {number} expiry - 过期时间(毫秒)，可选
             */
            set: function(key, value, expiry = null) {
                try {
                    const item = {
                        value: value,
                        timestamp: Date.now()
                    };
                    
                    if (expiry) {
                        item.expiry = expiry;
                    }
                    
                    localStorage.setItem(key, JSON.stringify(item));
                    return true;
                } catch (e) {
                    console.error('存储数据失败:', e);
                    return false;
                }
            },
            
            /**
             * 从本地存储获取数据
             * @param {string} key - 键名
             * @returns {*} - 存储的值，如果不存在或已过期则返回null
             */
            get: function(key) {
                try {
                    const itemStr = localStorage.getItem(key);
                    if (!itemStr) return null;
                    
                    const item = JSON.parse(itemStr);
                    const now = Date.now();
                    
                    // 检查是否过期
                    if (item.expiry && now - item.timestamp > item.expiry) {
                        localStorage.removeItem(key);
                        return null;
                    }
                    
                    return item.value;
                } catch (e) {
                    console.error('获取数据失败:', e);
                    return null;
                }
            },
            
            /**
             * 从本地存储删除数据
             * @param {string} key - 键名
             */
            remove: function(key) {
                try {
                    localStorage.removeItem(key);
                    return true;
                } catch (e) {
                    console.error('删除数据失败:', e);
                    return false;
                }
            },
            
            /**
             * 清除所有本地存储数据
             */
            clear: function() {
                try {
                    localStorage.clear();
                    return true;
                } catch (e) {
                    console.error('清除数据失败:', e);
                    return false;
                }
            }
        }
    };
    
    // 返回公共API
    return {
        API,
        UI,
        VALIDATION,
        ERROR_MESSAGES,
        PERFORMANCE,
        DEFAULTS,
        ENV,
        BROWSER_COMPATIBILITY,
        SECURITY,
        UTILS
    };
})();

// 如果在开发环境，将配置暴露到全局以便调试
if (CONFIG.ENV.DEBUG) {
    window._CONFIG = CONFIG;
}