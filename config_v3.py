#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V3版本配置文件
包含应用配置、Flask配置、Playwright配置、性能优化参数等
"""

import os
import platform
import socket
import multiprocessing
from pathlib import Path

# 基础路径配置
BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / 'templates'
STATIC_DIR = BASE_DIR / 'static'
LOGS_DIR = BASE_DIR / 'logs'
TEMP_DIR = BASE_DIR / 'temp'

# 确保目录存在
for dir_path in [LOGS_DIR, TEMP_DIR]:
    dir_path.mkdir(exist_ok=True)

# 核心配置
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-here')
BASE_URL = os.environ.get('BASE_URL', 'https://example.com')
DEFAULT_AUTH_KEY = os.environ.get('DEFAULT_AUTH_KEY', 'your-auth-key')
DEFAULT_APP_ID = os.environ.get('DEFAULT_APP_ID', 'your-app-id')

# Flask配置
FLASK_CONFIG = {
    'SECRET_KEY': SECRET_KEY,
    'TEMPLATES_AUTO_RELOAD': True,
    'SEND_FILE_MAX_AGE_DEFAULT': 31536000,  # 1年缓存
    'MAX_CONTENT_LENGTH': 16 * 1024 * 1024,  # 16MB上传限制
    'JSON_AS_ASCII': False,  # 允许JSON包含非ASCII字符
    'JSON_SORT_KEYS': False,  # 不对JSON键排序
    'JSONIFY_PRETTYPRINT_REGULAR': False,  # 不美化JSON输出
    'TEMPLATES_FOLDER': str(TEMPLATES_DIR),
    'STATIC_FOLDER': str(STATIC_DIR),
}

# 项目路径配置
PROJECT_PATHS = {
    'base_dir': str(BASE_DIR),
    'templates_dir': str(TEMPLATES_DIR),
    'static_dir': str(STATIC_DIR),
    'logs_dir': str(LOGS_DIR),
    'temp_dir': str(TEMP_DIR),
}

# 性能配置
def get_system_memory_gb():
    """获取系统内存大小（GB）"""
    try:
        if platform.system().lower() == 'windows':
            import ctypes
            kernel32 = ctypes.windll.kernel32
            c_ulonglong = ctypes.c_ulonglong
            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [
                    ('dwLength', ctypes.c_ulong),
                    ('dwMemoryLoad', ctypes.c_ulong),
                    ('ullTotalPhys', c_ulonglong),
                    ('ullAvailPhys', c_ulonglong),
                    ('ullTotalPageFile', c_ulonglong),
                    ('ullAvailPageFile', c_ulonglong),
                    ('ullTotalVirtual', c_ulonglong),
                    ('ullAvailVirtual', c_ulonglong),
                    ('ullAvailExtendedVirtual', c_ulonglong),
                ]
            
            memory_status = MEMORYSTATUSEX()
            memory_status.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            kernel32.GlobalMemoryStatusEx(ctypes.byref(memory_status))
            return memory_status.ullTotalPhys / (1024**3)
        elif platform.system().lower() == 'linux':
            with open('/proc/meminfo', 'r') as f:
                for line in f:
                    if 'MemTotal' in line:
                        return int(line.split()[1]) / (1024**2)
        elif platform.system().lower() == 'darwin':
            import subprocess
            result = subprocess.run(['sysctl', '-n', 'hw.memsize'], capture_output=True, text=True)
            if result.returncode == 0:
                return int(result.stdout.strip()) / (1024**3)
    except Exception:
        pass
    
    # 如果无法获取，返回默认值
    return 4.0

# 检测是否在Docker容器中运行
def is_running_in_docker():
    """检测是否在Docker容器中运行"""
    try:
        with open('/proc/1/cgroup', 'r') as f:
            return any('docker' in line for line in f)
    except:
        try:
            return os.path.exists('/.dockerenv')
        except:
            return False

# 系统信息
SYSTEM_INFO = {
    'os': platform.system(),
    'os_version': platform.version(),
    'python_version': platform.python_version(),
    'hostname': socket.gethostname(),
    'cpu_count': multiprocessing.cpu_count(),
    'memory_gb': get_system_memory_gb(),
    'is_docker': is_running_in_docker(),
}

# 根据系统资源自动调整性能参数
IS_LOW_SPEC = SYSTEM_INFO['cpu_count'] <= 1 or SYSTEM_INFO['memory_gb'] < 4

# 性能配置
PERFORMANCE = {
    'max_workers': 1 if IS_LOW_SPEC else min(4, SYSTEM_INFO['cpu_count']),
    'request_timeout': 60,  # 请求超时时间（秒）
    'cache_timeout': 300,  # 缓存超时时间（秒）
    'max_retries': 3,  # 最大重试次数
    'connection_pool_size': 10 if IS_LOW_SPEC else 20,  # 连接池大小
    'low_spec_mode': IS_LOW_SPEC,  # 低配置模式标志
}

# 浏览器配置
BROWSER_CONFIG = {
    'browser_type': 'chromium',  # 浏览器类型：chromium, firefox, webkit
    'headless': True,  # 无头模式
    'slow_mo': 50 if IS_LOW_SPEC else 0,  # 操作延迟（毫秒）
    'timeout': 30000,  # 超时时间（毫秒）
    'viewport': {'width': 1280, 'height': 720},  # 视口大小
    'ignore_https_errors': True,  # 忽略HTTPS错误
    'java_script_enabled': True,  # 启用JavaScript
    'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',  # 用户代理
}

# Playwright配置
PLAYWRIGHT_CONFIG = {
    'browser_type': BROWSER_CONFIG['browser_type'],
    'headless': BROWSER_CONFIG['headless'],
    'slow_mo': BROWSER_CONFIG['slow_mo'],
    'timeout': BROWSER_CONFIG['timeout'],
    'viewport': BROWSER_CONFIG['viewport'],
    'ignore_https_errors': BROWSER_CONFIG['ignore_https_errors'],
    'java_script_enabled': BROWSER_CONFIG['java_script_enabled'],
    'user_agent': BROWSER_CONFIG['user_agent'],
    'downloads_path': str(TEMP_DIR / 'downloads'),
    'proxy': None,  # 代理配置，格式：{'server': 'http://myproxy.com:3128', 'username': 'user', 'password': 'pass'}
}

# Chrome选项
CHROME_OPTIONS = [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-infobars',
    '--disable-notifications',
    '--disable-popup-blocking',
    '--disable-translate',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-default-apps',
    '--disable-breakpad',
    '--disable-client-side-phishing-detection',
    '--disable-hang-monitor',
    '--disable-prompt-on-repost',
    '--disable-domain-reliability',
    '--disable-component-update',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    '--disable-ipc-flooding-protection',
    '--disable-features=TranslateUI,BlinkGenPropertyTrees',
    '--disable-site-isolation-trials',
    '--metrics-recording-only',
    '--mute-audio',
    '--no-first-run',
    '--no-default-browser-check',
    '--no-pings',
    '--password-store=basic',
    '--use-mock-keychain',
    '--enable-automation',
    '--enable-logging',
    '--log-level=0',
    '--window-size=1280,720',
]

# 如果是低配置模式，添加额外的优化选项
if IS_LOW_SPEC:
    CHROME_OPTIONS.extend([
        '--js-flags=--expose-gc',
        '--single-process',
        '--memory-pressure-off',
        '--disable-software-rasterizer',
        '--disable-logging',
        '--disable-3d-apis',
        '--disable-canvas-aa',
        '--disable-2d-canvas-clip-aa',
        '--disable-gl-drawing-for-tests',
    ])

# 利润系数配置
PROFIT_COEFFICIENTS = {
    'default': 1.0,
    'high_value': 1.2,
    'low_value': 0.8,
    'special_case': 1.5,
}

# 日志配置
LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
        },
        'detailed': {
            'format': '%(asctime)s [%(levelname)s] %(name)s:%(lineno)d: %(message)s'
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'level': 'INFO',
            'formatter': 'standard',
            'stream': 'ext://sys.stdout',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'level': 'DEBUG',
            'formatter': 'detailed',
            'filename': str(LOGS_DIR / 'app.log'),
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
            'encoding': 'utf8',
        },
        'error_file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'level': 'ERROR',
            'formatter': 'detailed',
            'filename': str(LOGS_DIR / 'error.log'),
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
            'encoding': 'utf8',
        },
    },
    'loggers': {
        '': {  # root logger
            'handlers': ['console', 'file', 'error_file'],
            'level': 'DEBUG',
            'propagate': True
        },
        'werkzeug': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False
        },
        'playwright': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False
        },
    }
}

# 缓存配置
CACHE_CONFIG = {
    'type': 'simple',  # simple, redis, memcached
    'timeout': PERFORMANCE['cache_timeout'],
    'threshold': 500,  # 最大缓存项数
    'key_prefix': 'flask_cache_',
    'redis_url': 'redis://localhost:6379/0',  # 如果使用Redis
}

# 环境特定配置
ENV_CONFIGS = {
    'development': {
        'DEBUG': True,
        'TESTING': False,
        'BROWSER_CONFIG': {
            'headless': False,
            'slow_mo': 100,
        },
        'PERFORMANCE': {
            'max_workers': 1,
            'cache_timeout': 60,
        },
        'LOGGING_LEVEL': 'DEBUG',
    },
    'testing': {
        'DEBUG': False,
        'TESTING': True,
        'BROWSER_CONFIG': {
            'headless': True,
            'slow_mo': 0,
        },
        'PERFORMANCE': {
            'max_workers': 1,
            'cache_timeout': 0,  # 禁用缓存
        },
        'LOGGING_LEVEL': 'INFO',
    },
    'production': {
        'DEBUG': False,
        'TESTING': False,
        'BROWSER_CONFIG': {
            'headless': True,
            'slow_mo': 0,
        },
        'PERFORMANCE': {
            'max_workers': PERFORMANCE['max_workers'],
            'cache_timeout': PERFORMANCE['cache_timeout'],
        },
        'LOGGING_LEVEL': 'WARNING',
    },
}

# 根据环境变量加载对应配置
ENV = os.environ.get('FLASK_ENV', 'production')
CURRENT_ENV_CONFIG = ENV_CONFIGS.get(ENV, ENV_CONFIGS['production'])

# 更新配置
if ENV != 'production':
    # 更新浏览器配置
    for key, value in CURRENT_ENV_CONFIG.get('BROWSER_CONFIG', {}).items():
        BROWSER_CONFIG[key] = value
        PLAYWRIGHT_CONFIG[key] = value
    
    # 更新性能配置
    for key, value in CURRENT_ENV_CONFIG.get('PERFORMANCE', {}).items():
        PERFORMANCE[key] = value

# 导出配置
__all__ = [
    'SECRET_KEY',
    'BASE_URL',
    'DEFAULT_AUTH_KEY',
    'DEFAULT_APP_ID',
    'FLASK_CONFIG',
    'PROJECT_PATHS',
    'SYSTEM_INFO',
    'PERFORMANCE',
    'BROWSER_CONFIG',
    'PLAYWRIGHT_CONFIG',
    'CHROME_OPTIONS',
    'PROFIT_COEFFICIENTS',
    'LOGGING_CONFIG',
    'CACHE_CONFIG',
    'ENV',
    'CURRENT_ENV_CONFIG',
    'IS_LOW_SPEC',
]