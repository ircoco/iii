#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Flask应用V3版本主程序
集成Playwright浏览器自动化，替代Selenium
优化性能，支持低配置服务器
"""

import os
import sys
import json
import time
import logging
import logging.config
import traceback
from datetime import datetime, timedelta
from functools import wraps
from pathlib import Path
from threading import Lock
from typing import Dict, List, Optional, Union, Any

# 导入Flask相关库
from flask import (
    Flask, request, jsonify, render_template, 
    send_from_directory, abort, Response, g
)

# 导入Playwright
from playwright.sync_api import sync_playwright, Browser, Page, TimeoutError as PlaywrightTimeoutError

# 导入配置
import config_v3 as config

# 配置日志
logging.config.dictConfig(config.LOGGING_CONFIG)
logger = logging.getLogger(__name__)

# 创建Flask应用
app = Flask(
    __name__,
    static_folder=config.PROJECT_PATHS['static_dir'],
    template_folder=config.PROJECT_PATHS['templates_dir']
)

# 应用Flask配置
app.config.update(config.FLASK_CONFIG)

# 全局变量
playwright_instance = None
browser_instance = None
browser_lock = Lock()

# 缓存
query_cache = {}
cache_lock = Lock()

# 初始化Playwright
def init_playwright() -> None:
    """初始化Playwright和浏览器实例"""
    global playwright_instance, browser_instance
    
    if playwright_instance is None:
        try:
            logger.info("初始化Playwright...")
            playwright_instance = sync_playwright().start()
            
            # 创建浏览器实例
            browser_type = getattr(playwright_instance, config.PLAYWRIGHT_CONFIG['browser_type'])
            browser_instance = browser_type.launch(
                headless=config.PLAYWRIGHT_CONFIG['headless'],
                slow_mo=config.PLAYWRIGHT_CONFIG['slow_mo'],
                timeout=config.PLAYWRIGHT_CONFIG['timeout'],
                args=config.CHROME_OPTIONS,
                ignore_default_args=['--enable-automation'],
                downloads_path=config.PLAYWRIGHT_CONFIG['downloads_path'],
            )
            
            logger.info(f"Playwright和{config.PLAYWRIGHT_CONFIG['browser_type']}浏览器初始化成功")
        except Exception as e:
            logger.error(f"初始化Playwright失败: {e}")
            if playwright_instance:
                playwright_instance.stop()
                playwright_instance = None
            raise

# 关闭Playwright
def close_playwright() -> None:
    """关闭Playwright和浏览器实例"""
    global playwright_instance, browser_instance
    
    with browser_lock:
        if browser_instance:
            try:
                browser_instance.close()
            except Exception as e:
                logger.error(f"关闭浏览器实例失败: {e}")
            finally:
                browser_instance = None
        
        if playwright_instance:
            try:
                playwright_instance.stop()
            except Exception as e:
                logger.error(f"关闭Playwright实例失败: {e}")
            finally:
                playwright_instance = None

# 获取浏览器上下文
def get_browser_context():
    """获取浏览器上下文，如果需要则初始化Playwright"""
    global browser_instance
    
    with browser_lock:
        if browser_instance is None or not browser_instance.is_connected():
            init_playwright()
        
        return browser_instance.new_context(
            viewport=config.PLAYWRIGHT_CONFIG['viewport'],
            user_agent=config.PLAYWRIGHT_CONFIG['user_agent'],
            ignore_https_errors=config.PLAYWRIGHT_CONFIG['ignore_https_errors'],
            java_script_enabled=config.PLAYWRIGHT_CONFIG['java_script_enabled'],
        )

# 缓存装饰器
def cache_result(timeout=config.CACHE_CONFIG['timeout']):
    """缓存查询结果的装饰器"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 生成缓存键
            cache_key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            
            with cache_lock:
                # 检查缓存
                if cache_key in query_cache:
                    result, timestamp = query_cache[cache_key]
                    if time.time() - timestamp < timeout:
                        logger.info(f"从缓存返回结果: {cache_key}")
                        return result
            
            # 执行函数
            result = func(*args, **kwargs)
            
            # 更新缓存
            with cache_lock:
                query_cache[cache_key] = (result, time.time())
                
                # 清理过期缓存
                current_time = time.time()
                expired_keys = [k for k, (_, t) in query_cache.items() if current_time - t > timeout]
                for k in expired_keys:
                    del query_cache[k]
            
            return result
        return wrapper
    return decorator

# 错误处理装饰器
def error_handler(func):
    """错误处理装饰器"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except PlaywrightTimeoutError as e:
            logger.error(f"Playwright超时错误: {e}")
            return jsonify({
                'status': 'error',
                'error_type': 'timeout',
                'message': f'浏览器操作超时: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }), 408
        except Exception as e:
            logger.error(f"处理请求时出错: {e}")
            logger.error(traceback.format_exc())
            return jsonify({
                'status': 'error',
                'error_type': 'server_error',
                'message': f'服务器内部错误: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }), 500
    return wrapper

# 验证API密钥
def validate_api_key(auth_key, app_id):
    """验证API密钥"""
    # 在实际应用中，这里应该查询数据库或调用认证服务
    # 这里简化为检查是否与配置中的默认值匹配
    return auth_key == config.DEFAULT_AUTH_KEY and app_id == config.DEFAULT_APP_ID

# 查询数据
@cache_result(timeout=config.CACHE_CONFIG['timeout'])
def query_data(project_id, uk_code, start_date, end_date):
    """使用Playwright查询数据"""
    logger.info(f"查询数据: project_id={project_id}, uk_code={uk_code}, 日期范围={start_date}至{end_date}")
    
    results = []
    total_stats = {
        'total_count': 0,
        'total_amount': 0,
        'average_amount': 0,
        'success_rate': 0
    }
    
    try:
        # 获取浏览器上下文
        with get_browser_context() as context:
            # 创建新页面
            page = context.new_page()
            
            try:
                # 导航到目标网站
                page.goto(config.BASE_URL, timeout=config.PLAYWRIGHT_CONFIG['timeout'])
                
                # 等待页面加载
                page.wait_for_load_state('networkidle')
                
                # 填写查询表单
                page.fill('#project-id-input', project_id)
                page.fill('#uk-code-input', uk_code)
                page.fill('#start-date-input', start_date)
                page.fill('#end-date-input', end_date)
                
                # 提交表单
                page.click('#query-button')
                
                # 等待结果加载
                page.wait_for_selector('#results-table', timeout=config.PLAYWRIGHT_CONFIG['timeout'])
                
                # 提取总计统计信息
                total_count_text = page.text_content('#total-count')
                total_amount_text = page.text_content('#total-amount')
                average_amount_text = page.text_content('#average-amount')
                success_rate_text = page.text_content('#success-rate')
                
                # 解析统计信息
                total_stats = {
                    'total_count': int(total_count_text.strip().replace(',', '')) if total_count_text else 0,
                    'total_amount': float(total_amount_text.strip().replace(',', '').replace('¥', '')) if total_amount_text else 0,
                    'average_amount': float(average_amount_text.strip().replace(',', '').replace('¥', '')) if average_amount_text else 0,
                    'success_rate': float(success_rate_text.strip().replace('%', '')) / 100 if success_rate_text else 0
                }
                
                # 提取表格数据
                rows = page.query_selector_all('#results-table tbody tr')
                
                for row in rows:
                    cells = row.query_selector_all('td')
                    if len(cells) >= 5:
                        result = {
                            'id': cells[0].text_content().strip(),
                            'date': cells[1].text_content().strip(),
                            'amount': float(cells[2].text_content().strip().replace(',', '').replace('¥', '')),
                            'status': cells[3].text_content().strip(),
                            'details': cells[4].text_content().strip()
                        }
                        results.append(result)
                
                logger.info(f"查询成功，获取到{len(results)}条记录")
            finally:
                # 关闭页面
                page.close()
    except Exception as e:
        logger.error(f"查询数据时出错: {e}")
        logger.error(traceback.format_exc())
        raise
    
    # 应用利润系数（示例业务逻辑）
    for result in results:
        if result['amount'] > 10000:
            result['profit'] = result['amount'] * config.PROFIT_COEFFICIENTS['high_value']
        elif result['amount'] < 1000:
            result['profit'] = result['amount'] * config.PROFIT_COEFFICIENTS['low_value']
        else:
            result['profit'] = result['amount'] * config.PROFIT_COEFFICIENTS['default']
    
    return {
        'status': 'success',
        'data': results,
        'stats': total_stats,
        'query_info': {
            'project_id': project_id,
            'uk_code': uk_code,
            'start_date': start_date,
            'end_date': end_date,
            'timestamp': datetime.now().isoformat()
        }
    }

# 路由：首页
@app.route('/')
def index():
    """渲染首页"""
    return render_template('index.html')

# 路由：API查询
@app.route('/api/query', methods=['POST'])
@error_handler
def api_query():
    """API查询接口"""
    # 获取请求数据
    data = request.get_json()
    
    if not data:
        return jsonify({
            'status': 'error',
            'error_type': 'invalid_request',
            'message': '无效的请求数据',
            'timestamp': datetime.now().isoformat()
        }), 400
    
    # 提取参数
    project_id = data.get('project_id')
    uk_code = data.get('uk_code')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    auth_key = data.get('auth_key', config.DEFAULT_AUTH_KEY)
    app_id = data.get('app_id', config.DEFAULT_APP_ID)
    
    # 验证参数
    if not all([project_id, uk_code, start_date, end_date]):
        return jsonify({
            'status': 'error',
            'error_type': 'missing_parameters',
            'message': '缺少必要参数',
            'timestamp': datetime.now().isoformat()
        }), 400
    
    # 验证API密钥
    if not validate_api_key(auth_key, app_id):
        return jsonify({
            'status': 'error',
            'error_type': 'unauthorized',
            'message': '未授权的访问',
            'timestamp': datetime.now().isoformat()
        }), 401
    
    # 查询数据
    try:
        result = query_data(project_id, uk_code, start_date, end_date)
        return jsonify(result)
    except Exception as e:
        logger.error(f"API查询失败: {e}")
        return jsonify({
            'status': 'error',
            'error_type': 'query_failed',
            'message': f'查询失败: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500

# 路由：健康检查
@app.route('/health')
def health_check():
    """健康检查接口"""
    global browser_instance
    
    health_status = {
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': 'v3.0.0',
        'environment': config.ENV,
        'system_info': {
            'os': config.SYSTEM_INFO['os'],
            'python_version': config.SYSTEM_INFO['python_version'],
            'cpu_count': config.SYSTEM_INFO['cpu_count'],
            'memory_gb': config.SYSTEM_INFO['memory_gb'],
        },
        'components': {
            'flask': 'ok',
            'playwright': 'ok' if browser_instance and browser_instance.is_connected() else 'error',
        }
    }
    
    # 如果浏览器实例有问题，尝试重新初始化
    if health_status['components']['playwright'] == 'error':
        try:
            with browser_lock:
                close_playwright()
                init_playwright()
            health_status['components']['playwright'] = 'recovered'
        except Exception as e:
            health_status['status'] = 'degraded'
            health_status['components']['playwright'] = f'failed: {str(e)}'
    
    status_code = 200 if health_status['status'] == 'healthy' else 500
    return jsonify(health_status), status_code

# 应用启动和关闭事件
@app.before_first_request
def before_first_request():
    """应用首次请求前的初始化"""
    logger.info("应用启动，初始化资源...")
    try:
        init_playwright()
    except Exception as e:
        logger.error(f"初始化Playwright失败: {e}")

@app.teardown_appcontext
def teardown_appcontext(exception):
    """应用上下文结束时的清理"""
    pass

# 应用关闭时的清理
def cleanup():
    """应用关闭时的资源清理"""
    logger.info("应用关闭，清理资源...")
    close_playwright()

# 注册清理函数
import atexit
atexit.register(cleanup)

# 主函数
if __name__ == '__main__':
    try:
        # 初始化Playwright
        init_playwright()
        
        # 启动Flask应用
        app.run(
            host='0.0.0.0',
            port=int(os.environ.get('PORT', 5000)),
            debug=config.CURRENT_ENV_CONFIG.get('DEBUG', False)
        )
    except Exception as e:
        logger.error(f"应用启动失败: {e}")
        logger.error(traceback.format_exc())
    finally:
        # 清理资源
        cleanup()