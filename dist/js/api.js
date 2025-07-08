/**
 * V3数据查询系统 - API交互模块
 * 负责处理与后端的通信
 */

// 使用立即执行函数表达式(IIFE)创建API模块
const API = (function() {
    'use strict';
    
    // 请求缓存
    const requestCache = new Map();
    
    // 最近的API调用记录（用于调试）
    const recentCalls = [];
    
    // 当前正在进行的请求
    const pendingRequests = new Map();
    
    /**
     * 获取CSRF令牌
     * @returns {string} CSRF令牌
     */
    function getCsrfToken() {
        // 从meta标签获取CSRF令牌
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        return csrfMeta ? csrfMeta.getAttribute('content') : '';
    }
    
    /**
     * 生成缓存键
     * @param {string} endpoint - API端点
     * @param {Object} params - 请求参数
     * @returns {string} 缓存键
     */
    function generateCacheKey(endpoint, params) {
        return `${endpoint}:${JSON.stringify(params)}`;
    }
    
    /**
     * 从缓存获取响应
     * @param {string} endpoint - API端点
     * @param {Object} params - 请求参数
     * @returns {Object|null} 缓存的响应或null
     */
    function getFromCache(endpoint, params) {
        const cacheKey = generateCacheKey(endpoint, params);
        
        if (requestCache.has(cacheKey)) {
            const cachedData = requestCache.get(cacheKey);
            
            // 检查缓存是否过期
            if (Date.now() < cachedData.expiry) {
                // 记录缓存命中
                if (App && App.getAppState && App.getAppState().debug) {
                    console.log(`缓存命中: ${cacheKey}`);
                }
                
                return cachedData.data;
            } else {
                // 缓存已过期，删除
                requestCache.delete(cacheKey);
            }
        }
        
        return null;
    }
    
    /**
     * 保存响应到缓存
     * @param {string} endpoint - API端点
     * @param {Object} params - 请求参数
     * @param {Object} data - 响应数据
     * @param {number} ttl - 缓存生存时间(毫秒)
     */
    function saveToCache(endpoint, params, data, ttl) {
        const cacheKey = generateCacheKey(endpoint, params);
        
        requestCache.set(cacheKey, {
            data: data,
            expiry: Date.now() + ttl
        });
        
        // 如果缓存大小超过限制，删除最旧的缓存
        if (requestCache.size > CONFIG.PERFORMANCE.CACHE_SIZE) {
            const oldestKey = requestCache.keys().next().value;
            requestCache.delete(oldestKey);
        }
    }
    
    /**
     * 清除缓存
     */
    function clearCache() {
        requestCache.clear();
    }
    
    /**
     * 处理API错误
     * @param {Error} error - 错误对象
     * @param {string} endpoint - API端点
     * @returns {Object} 格式化的错误对象
     */
    function handleError(error, endpoint) {
        // 记录错误
        console.error(`API错误 (${endpoint}):`, error);
        
        // 如果App模块已初始化，记录错误
        if (window.App && App.handleError) {
            App.handleError(error, 'API Error');
        }
        
        // 返回格式化的错误对象
        return {
            status: 'error',
            message: error.message || CONFIG.ERROR_MESSAGES.API_ERROR,
            endpoint: endpoint,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * 发送API请求
     * @param {string} endpoint - API端点
     * @param {Object} params - 请求参数
     * @param {Object} options - 请求选项
     * @returns {Promise<Object>} 响应数据
     */
    async function sendRequest(endpoint, params = {}, options = {}) {
        // 默认选项
        const defaultOptions = {
            method: 'GET',
            useCache: true,
            cacheTTL: CONFIG.PERFORMANCE.CACHE_TTL || 300000,
            retries: CONFIG.API.MAX_RETRIES,
            retryDelay: CONFIG.API.RETRY_DELAY,
            timeout: CONFIG.API.REQUEST_TIMEOUT || 30000
        };
        
        // 合并选项
        const requestOptions = { ...defaultOptions, ...options };
        
        // 检查是否有相同的请求正在进行中
        const cacheKey = generateCacheKey(endpoint, params);
        if (pendingRequests.has(cacheKey)) {
            // 返回正在进行的请求
            return pendingRequests.get(cacheKey);
        }
        
        // 如果启用缓存，尝试从缓存获取
        if (requestOptions.useCache) {
            const cachedResponse = getFromCache(endpoint, params);
            if (cachedResponse) {
                return cachedResponse;
            }
        }
        
        // 创建请求Promise
        const requestPromise = (async () => {
            const startTime = performance.now();
            let retries = 0;
            
            while (retries <= requestOptions.retries) {
                try {
                    // 构建请求URL和选项
                    const url = endpoint.startsWith('http') ? endpoint : `${CONFIG.API.BASE_URL || ''}${endpoint}`;
                    const fetchOptions = {
                        method: requestOptions.method,
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        credentials: 'same-origin'
                    };
                    
                    // 添加CSRF令牌
                    const csrfToken = getCsrfToken();
                    if (csrfToken) {
                        fetchOptions.headers['X-CSRFToken'] = csrfToken;
                    }
                    
                    // 添加请求体
                    if (requestOptions.method !== 'GET' && params) {
                        fetchOptions.body = JSON.stringify(params);
                    }
                    
                    // 创建URL（GET请求将参数添加到URL）
                    let requestUrl = url;
                    if (requestOptions.method === 'GET' && Object.keys(params).length > 0) {
                        const queryString = Object.entries(params)
                            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                            .join('&');
                        requestUrl = `${url}?${queryString}`;
                    }
                    
                    // 创建AbortController用于超时
                    const controller = new AbortController();
                    fetchOptions.signal = controller.signal;
                    
                    // 设置超时
                    const timeoutId = setTimeout(() => {
                        controller.abort();
                    }, requestOptions.timeout);
                    
                    // 发送请求
                    const response = await fetch(requestUrl, fetchOptions);
                    
                    // 清除超时
                    clearTimeout(timeoutId);
                    
                    // 检查响应状态
                    if (!response.ok) {
                        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
                    }
                    
                    // 解析响应
                    const data = await response.json();
                    
                    // 计算请求时间
                    const duration = performance.now() - startTime;
                    
                    // 记录API调用
                    logApiCall(endpoint, params, data, duration, retries);
                    
                    // 如果App模块已初始化，记录API性能
                    if (window.App && App.logApiPerformance) {
                        App.logApiPerformance(endpoint, duration);
                    }
                    
                    // 如果启用缓存，保存到缓存
                    if (requestOptions.useCache) {
                        saveToCache(endpoint, params, data, requestOptions.cacheTTL);
                    }
                    
                    return data;
                } catch (error) {
                    // 如果是最后一次重试，抛出错误
                    if (retries === requestOptions.retries) {
                        throw error;
                    }
                    
                    // 否则，等待后重试
                    retries++;
                    await new Promise(resolve => setTimeout(resolve, requestOptions.retryDelay * retries));
                }
            }
        })();
        
        // 将请求添加到正在进行的请求中
        pendingRequests.set(cacheKey, requestPromise);
        
        try {
            // 等待请求完成
            const result = await requestPromise;
            return result;
        } catch (error) {
            return handleError(error, endpoint);
        } finally {
            // 从正在进行的请求中移除
            pendingRequests.delete(cacheKey);
        }
    }
    
    /**
     * 记录API调用
     * @param {string} endpoint - API端点
     * @param {Object} params - 请求参数
     * @param {Object} response - 响应数据
     * @param {number} duration - 请求持续时间(毫秒)
     * @param {number} retries - 重试次数
     */
    function logApiCall(endpoint, params, response, duration, retries) {
        // 创建调用记录
        const callRecord = {
            endpoint,
            params,
            status: response.status || 'unknown',
            duration,
            retries,
            timestamp: new Date().toISOString()
        };
        
        // 添加到最近调用记录
        recentCalls.unshift(callRecord);
        
        // 只保留最近10条记录
        if (recentCalls.length > 10) {
            recentCalls.pop();
        }
        
        // 如果在调试模式下，输出到控制台
        if (window.App && App.getAppState && App.getAppState().debug) {
            console.log('API调用:', callRecord);
        }
    }
    
    /**
     * 查询数据
     * @param {Object} params - 查询参数
     * @returns {Promise<Object>} 查询结果
     */
    async function queryData(params) {
        try {
            // 发送查询请求
            const response = await sendRequest('/api/query', params, {
                method: 'POST',
                useCache: true,
                cacheTTL: CONFIG.PERFORMANCE.CACHE_TTL
            });
            
            // 如果响应状态为错误，直接返回
            if (response.status === 'error') {
                return response;
            }
            
            // 使用计算服务处理响应数据
            return CalculationService.processApiResponse(response);
        } catch (error) {
            return handleError(error, '/api/query');
        }
    }
    
    /**
     * 检查系统健康状态
     * @returns {Promise<Object>} 健康状态
     */
    async function checkHealth() {
        try {
            // 发送健康检查请求
            return await sendRequest('/health', {}, {
                useCache: false,
                retries: 0
            });
        } catch (error) {
            return handleError(error, '/health');
        }
    }
    
    /**
     * 获取最近的API调用记录
     * @returns {Array} 最近的API调用记录
     */
    function getRecentCalls() {
        return [...recentCalls];
    }
    
    // 返回公共API
    return {
        queryData,
        checkHealth,
        clearCache,
        getRecentCalls
    };
})();