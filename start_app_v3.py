#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V3应用启动脚本
智能性能分析和环境变量设置
根据系统资源自动调整应用参数
"""

import os
import sys
import time
import json
import logging
import platform
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Union, Any

# 尝试导入psutil，用于系统资源监控
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False
    print("警告: psutil未安装，将使用基本系统信息")

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(Path(__file__).parent / 'logs' / 'startup.log')
    ]
)

logger = logging.getLogger("启动器")

# 常量
APP_SCRIPT = "app_v3.py"
DEFAULT_PORT = 5000
DEFAULT_HOST = "0.0.0.0"

# 系统信息分析
def analyze_system():
    """分析系统资源并返回系统信息"""
    system_info = {
        "os": platform.system(),
        "os_version": platform.version(),
        "python_version": platform.python_version(),
        "cpu_count": os.cpu_count() or 1,
        "is_docker": is_running_in_docker(),
    }
    
    # 使用psutil获取更详细的系统信息
    if HAS_PSUTIL:
        # 获取CPU信息
        system_info["cpu_percent"] = psutil.cpu_percent(interval=1)
        
        # 获取内存信息
        memory = psutil.virtual_memory()
        system_info["total_memory_gb"] = memory.total / (1024 ** 3)
        system_info["available_memory_gb"] = memory.available / (1024 ** 3)
        system_info["memory_percent"] = memory.percent
        
        # 获取磁盘信息
        disk = psutil.disk_usage('/')
        system_info["disk_total_gb"] = disk.total / (1024 ** 3)
        system_info["disk_free_gb"] = disk.free / (1024 ** 3)
        system_info["disk_percent"] = disk.percent
    else:
        # 基本估计
        system_info["total_memory_gb"] = 4.0  # 默认假设4GB内存
        system_info["available_memory_gb"] = 2.0  # 默认假设2GB可用
    
    return system_info

# 检测是否在Docker中运行
def is_running_in_docker():
    """检测应用是否在Docker容器中运行"""
    # 方法1: 检查cgroup
    try:
        with open('/proc/1/cgroup', 'r') as f:
            return 'docker' in f.read() or 'kubepods' in f.read()
    except:
        pass
    
    # 方法2: 检查.dockerenv文件
    if Path('/.dockerenv').exists():
        return True
    
    # 方法3: 检查环境变量
    if os.environ.get('DOCKER_CONTAINER', '') == 'true':
        return True
    
    return False

# 根据系统资源设置环境变量
def set_environment_variables(system_info):
    """根据系统资源设置最佳环境变量"""
    env_vars = {}
    
    # 设置工作线程数
    cpu_count = system_info["cpu_count"]
    if cpu_count <= 1:
        workers = 1
    elif cpu_count <= 4:
        workers = cpu_count
    else:
        workers = cpu_count * 2
    
    # 如果内存较少，限制工作线程数
    if HAS_PSUTIL and system_info["available_memory_gb"] < 2.0:
        workers = min(workers, 2)
    
    env_vars["GUNICORN_WORKERS"] = str(workers)
    
    # 设置线程数
    env_vars["GUNICORN_THREADS"] = str(2)
    
    # 设置超时
    env_vars["GUNICORN_TIMEOUT"] = str(120)
    
    # 设置Playwright配置
    if HAS_PSUTIL and system_info["available_memory_gb"] < 1.5:
        # 低内存模式
        env_vars["PLAYWRIGHT_HEADLESS"] = "true"
        env_vars["CHROME_DISABLE_GPU"] = "true"
        env_vars["CHROME_DISABLE_EXTENSIONS"] = "true"
        env_vars["CHROME_NO_SANDBOX"] = "true"
        env_vars["CHROME_DISABLE_DEV_SHM"] = "true"
        env_vars["LOW_MEMORY_MODE"] = "true"
    
    # 设置缓存配置
    if HAS_PSUTIL and system_info["available_memory_gb"] > 4.0:
        env_vars["CACHE_SIZE"] = "1000"
        env_vars["CACHE_TIMEOUT"] = "3600"
    else:
        env_vars["CACHE_SIZE"] = "100"
        env_vars["CACHE_TIMEOUT"] = "1800"
    
    # 设置日志级别
    env_vars["LOG_LEVEL"] = "INFO"
    
    # 设置端口
    env_vars["PORT"] = str(DEFAULT_PORT)
    
    # 设置主机
    env_vars["HOST"] = DEFAULT_HOST
    
    # 设置环境
    if 'ENVIRONMENT' not in os.environ:
        if system_info["is_docker"]:
            env_vars["ENVIRONMENT"] = "production"
        else:
            env_vars["ENVIRONMENT"] = "development"
    
    return env_vars

# 启动应用
def start_app(env_vars):
    """使用优化的环境变量启动应用"""
    # 更新环境变量
    os.environ.update(env_vars)
    
    # 构建应用路径
    app_path = Path(__file__).parent / APP_SCRIPT
    
    # 检查应用脚本是否存在
    if not app_path.exists():
        logger.error(f"应用脚本不存在: {app_path}")
        sys.exit(1)
    
    # 打印启动信息
    logger.info("正在启动V3应用...")
    logger.info(f"环境: {os.environ.get('ENVIRONMENT', 'development')}")
    logger.info(f"主机: {os.environ.get('HOST', DEFAULT_HOST)}")
    logger.info(f"端口: {os.environ.get('PORT', DEFAULT_PORT)}")
    logger.info(f"工作线程: {os.environ.get('GUNICORN_WORKERS', '1')}")
    
    # 构建命令
    if os.environ.get('ENVIRONMENT') == 'production':
        # 生产环境使用gunicorn
        try:
            import gunicorn
            cmd = [
                sys.executable, '-m', 'gunicorn',
                f"--workers={os.environ.get('GUNICORN_WORKERS', '1')}",
                f"--threads={os.environ.get('GUNICORN_THREADS', '2')}",
                f"--timeout={os.environ.get('GUNICORN_TIMEOUT', '120')}",
                f"--bind={os.environ.get('HOST', DEFAULT_HOST)}:{os.environ.get('PORT', DEFAULT_PORT)}",
                "app_v3:app"
            ]
        except ImportError:
            logger.warning("gunicorn未安装，使用Flask内置服务器")
            cmd = [sys.executable, str(app_path)]
    else:
        # 开发环境使用Flask内置服务器
        cmd = [sys.executable, str(app_path)]
    
    # 启动应用
    try:
        logger.info(f"执行命令: {' '.join(cmd)}")
        process = subprocess.Popen(
            cmd,
            env=os.environ.copy(),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True
        )
        
        # 实时输出日志
        for line in process.stdout:
            print(line, end='')
        
        # 等待进程结束
        process.wait()
        return process.returncode
    except KeyboardInterrupt:
        logger.info("接收到中断信号，正在关闭应用...")
        return 0
    except Exception as e:
        logger.error(f"启动应用时出错: {e}")
        return 1

# 主函数
def main():
    """主函数"""
    try:
        # 创建日志目录
        log_dir = Path(__file__).parent / 'logs'
        log_dir.mkdir(exist_ok=True)
        
        # 分析系统
        logger.info("正在分析系统资源...")
        system_info = analyze_system()
        
        # 打印系统信息
        logger.info("系统信息:")
        for key, value in system_info.items():
            logger.info(f"  {key}: {value}")
        
        # 设置环境变量
        logger.info("正在设置最佳环境变量...")
        env_vars = set_environment_variables(system_info)
        
        # 打印环境变量
        logger.info("环境变量:")
        for key, value in env_vars.items():
            logger.info(f"  {key}: {value}")
        
        # 启动应用
        return start_app(env_vars)
    except Exception as e:
        logger.error(f"启动器出错: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return 1

# 入口点
if __name__ == "__main__":
    sys.exit(main())