/**
 * V3数据查询系统 - 计算服务模块
 * 负责处理数据计算、分析和报表生成
 */

// 使用立即执行函数表达式(IIFE)创建计算服务模块
const CalculationService = (function() {
    'use strict';
    
    // 缓存计算结果
    const calculationCache = new Map();
    
    // 利润系数配置
    const profitCoefficients = CONFIG.PROFIT_COEFFICIENTS;
    
    /**
     * 计算数据集的利润
     * @param {Array} data - 数据集
     * @returns {Array} 带有利润计算的数据集
     */
    function calculateProfit(data) {
        if (!data || !Array.isArray(data)) {
            return [];
        }
        
        // 生成缓存键
        const cacheKey = generateCacheKey(data);
        
        // 检查缓存
        if (calculationCache.has(cacheKey)) {
            return calculationCache.get(cacheKey);
        }
        
        // 计算每条记录的利润
        const result = data.map(item => {
            // 深拷贝以避免修改原始数据
            const newItem = CONFIG.UTILS.deepClone(item);
            
            // 基于状态和金额计算利润
            newItem.profit = calculateItemProfit(newItem);
            
            return newItem;
        });
        
        // 缓存结果
        calculationCache.set(cacheKey, result);
        
        return result;
    }
    
    /**
     * 计算单条记录的利润
     * @param {Object} item - 数据记录
     * @returns {number} 计算的利润
     */
    function calculateItemProfit(item) {
        // 获取基础系数
        let coefficient = profitCoefficients.BASE;
        
        // 根据状态调整系数
        if (item.status === '成功') {
            coefficient *= profitCoefficients.STATUS.SUCCESS;
        } else if (item.status === '失败') {
            coefficient *= profitCoefficients.STATUS.FAILED;
        } else if (item.status === '已退款') {
            coefficient *= profitCoefficients.STATUS.REFUNDED;
        } else {
            coefficient *= profitCoefficients.STATUS.OTHER;
        }
        
        // 根据金额范围调整系数
        const amount = parseFloat(item.amount);
        if (amount >= profitCoefficients.AMOUNT_TIERS.TIER3) {
            coefficient *= profitCoefficients.AMOUNT_MULTIPLIERS.TIER3;
        } else if (amount >= profitCoefficients.AMOUNT_TIERS.TIER2) {
            coefficient *= profitCoefficients.AMOUNT_MULTIPLIERS.TIER2;
        } else if (amount >= profitCoefficients.AMOUNT_TIERS.TIER1) {
            coefficient *= profitCoefficients.AMOUNT_MULTIPLIERS.TIER1;
        }
        
        // 计算最终利润
        return amount * coefficient;
    }
    
    /**
     * 生成缓存键
     * @param {Array} data - 数据集
     * @returns {string} 缓存键
     */
    function generateCacheKey(data) {
        if (!data || data.length === 0) {
            return 'empty';
        }
        
        // 使用数据的哈希值作为缓存键
        return CONFIG.UTILS.generateUUID(JSON.stringify(data));
    }
    
    /**
     * 计算统计数据
     * @param {Array} data - 数据集
     * @returns {Object} 统计结果
     */
    function calculateStats(data) {
        if (!data || !Array.isArray(data) || data.length === 0) {
            return {
                total_count: 0,
                total_amount: 0,
                average_amount: 0,
                success_rate: 0,
                total_profit: 0,
                average_profit: 0
            };
        }
        
        // 计算总记录数
        const totalCount = data.length;
        
        // 计算总金额和总利润
        let totalAmount = 0;
        let totalProfit = 0;
        let successCount = 0;
        
        data.forEach(item => {
            const amount = parseFloat(item.amount) || 0;
            const profit = parseFloat(item.profit) || 0;
            
            totalAmount += amount;
            totalProfit += profit;
            
            if (item.status === '成功') {
                successCount++;
            }
        });
        
        // 计算平均金额和平均利润
        const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;
        const averageProfit = totalCount > 0 ? totalProfit / totalCount : 0;
        
        // 计算成功率
        const successRate = totalCount > 0 ? successCount / totalCount : 0;
        
        return {
            total_count: totalCount,
            total_amount: totalAmount,
            average_amount: averageAmount,
            success_rate: successRate,
            total_profit: totalProfit,
            average_profit: averageProfit
        };
    }
    
    /**
     * 分析数据趋势
     * @param {Array} data - 数据集
     * @returns {Object} 趋势分析结果
     */
    function analyzeTrends(data) {
        if (!data || !Array.isArray(data) || data.length === 0) {
            return {
                daily_totals: [],
                trend_direction: 'neutral',
                peak_day: null,
                lowest_day: null
            };
        }
        
        // 按日期分组
        const dailyData = {};
        
        data.forEach(item => {
            const date = item.date;
            const amount = parseFloat(item.amount) || 0;
            
            if (!dailyData[date]) {
                dailyData[date] = {
                    date: date,
                    total_amount: 0,
                    count: 0,
                    success_count: 0,
                    total_profit: 0
                };
            }
            
            dailyData[date].total_amount += amount;
            dailyData[date].count += 1;
            dailyData[date].total_profit += (parseFloat(item.profit) || 0);
            
            if (item.status === '成功') {
                dailyData[date].success_count += 1;
            }
        });
        
        // 转换为数组并计算每日平均值和成功率
        const dailyTotals = Object.values(dailyData).map(day => {
            return {
                ...day,
                average_amount: day.count > 0 ? day.total_amount / day.count : 0,
                success_rate: day.count > 0 ? day.success_count / day.count : 0,
                average_profit: day.count > 0 ? day.total_profit / day.count : 0
            };
        });
        
        // 按日期排序
        dailyTotals.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // 确定趋势方向
        let trendDirection = 'neutral';
        if (dailyTotals.length > 1) {
            const firstDay = dailyTotals[0].total_amount;
            const lastDay = dailyTotals[dailyTotals.length - 1].total_amount;
            
            if (lastDay > firstDay * 1.1) { // 10%以上的增长
                trendDirection = 'up';
            } else if (lastDay < firstDay * 0.9) { // 10%以上的下降
                trendDirection = 'down';
            }
        }
        
        // 找出峰值和最低点
        let peakDay = dailyTotals[0];
        let lowestDay = dailyTotals[0];
        
        dailyTotals.forEach(day => {
            if (day.total_amount > peakDay.total_amount) {
                peakDay = day;
            }
            if (day.total_amount < lowestDay.total_amount) {
                lowestDay = day;
            }
        });
        
        return {
            daily_totals: dailyTotals,
            trend_direction: trendDirection,
            peak_day: peakDay,
            lowest_day: lowestDay
        };
    }
    
    /**
     * 生成CSV报表
     * @param {Array} data - 数据集
     * @param {Object} queryInfo - 查询信息
     * @returns {string} CSV内容
     */
    function generateCSVReport(data, queryInfo) {
        if (!data || !Array.isArray(data)) {
            return '';
        }
        
        // 添加报表头部信息
        let csvContent = '# 数据查询报表\n';
        csvContent += `# 项目ID: ${queryInfo.project_id}\n`;
        csvContent += `# UK代码: ${queryInfo.uk_code}\n`;
        csvContent += `# 日期范围: ${queryInfo.start_date} 至 ${queryInfo.end_date}\n`;
        csvContent += `# 生成时间: ${new Date().toLocaleString()}\n\n`;
        
        // 添加表头
        csvContent += '数据ID,日期,金额,状态,详情,利润\n';
        
        // 添加数据行
        data.forEach(item => {
            const row = [
                item.id,
                item.date,
                item.amount,
                item.status,
                item.details.replace(/"/g, '""'), // 转义双引号
                item.profit
            ];
            
            csvContent += `"${row.join('","')}"\n`;
        });
        
        // 添加统计信息
        const stats = calculateStats(data);
        csvContent += '\n# 统计信息\n';
        csvContent += `# 总记录数: ${stats.total_count}\n`;
        csvContent += `# 总金额: ${stats.total_amount.toFixed(2)}\n`;
        csvContent += `# 平均金额: ${stats.average_amount.toFixed(2)}\n`;
        csvContent += `# 成功率: ${(stats.success_rate * 100).toFixed(2)}%\n`;
        csvContent += `# 总利润: ${stats.total_profit.toFixed(2)}\n`;
        csvContent += `# 平均利润: ${stats.average_profit.toFixed(2)}\n`;
        
        return csvContent;
    }
    
    /**
     * 清除计算缓存
     */
    function clearCache() {
        calculationCache.clear();
    }
    
    /**
     * 处理API响应数据
     * @param {Object} response - API响应
     * @returns {Object} 处理后的数据
     */
    function processApiResponse(response) {
        if (!response || response.status === 'error') {
            return response;
        }
        
        // 计算利润
        const dataWithProfit = calculateProfit(response.data);
        
        // 计算统计数据
        const stats = calculateStats(dataWithProfit);
        
        // 分析趋势
        const trends = analyzeTrends(dataWithProfit);
        
        // 返回处理后的数据
        return {
            ...response,
            data: dataWithProfit,
            stats: stats,
            trends: trends
        };
    }
    
    // 返回公共API
    return {
        calculateProfit,
        calculateStats,
        analyzeTrends,
        generateCSVReport,
        processApiResponse,
        clearCache
    };
})();