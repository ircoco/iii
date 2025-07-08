#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V3版本一键自动安装脚本
自动检测环境、安装依赖、配置Playwright、设置Docker环境
适用于低配置服务器，自动使用国内镜像源
"""

import os
import sys
import platform
import subprocess
import shutil
import json
import re
import time
import logging
import tempfile
import urllib.request
from pathlib import Path
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('install_v3_log.txt', encoding='utf-8')
    ]
)
logger = logging.getLogger('install_v3')

# 全局变量
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
VENV_DIR = os.path.join(PROJECT_ROOT, 'venv')
PIP_CONF_PATH = os.path.expanduser('~/.pip/pip.conf')
IS_WINDOWS = platform.system().lower() == 'windows'
IS_LINUX = platform.system().lower() == 'linux'
IS_MAC = platform.system().lower() == 'darwin'
PYTHON_CMD = 'python' if IS_WINDOWS else 'python3'
PIP_CMD = f'{PYTHON_CMD} -m pip'

# 国内镜像源
PIP_MIRRORS = {
    'aliyun': 'https://mirrors.aliyun.com/pypi/simple/',
    'tencent': 'https://mirrors.cloud.tencent.com/pypi/simple/',
    'douban': 'https://pypi.doubanio.com/simple/',
    'tsinghua': 'https://pypi.tuna.tsinghua.edu.cn/simple/',
    'default': 'https://pypi.org/simple/'
}

# 系统信息
SYSTEM_INFO = {
    'os': platform.system(),
    'os_version': platform.version(),
    'python_version': platform.python_version(),
    'cpu_count': os.cpu_count() or 1,
    'memory_gb': None,  # 将在后面计算
    'is_docker': False,  # 将在后面检测
    'is_low_spec': False  # 将在后面检测
}

# ANSI颜色代码
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# 如果是Windows且不在终端中运行，禁用颜色
if IS_WINDOWS and not sys.stdout.isatty():
    for attr in dir(Colors):
        if not attr.startswith('__'):
            setattr(Colors, attr, '')

# 辅助函数
def print_banner():
    banner = f"""
{Colors.BLUE}╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║  {Colors.YELLOW}Flask应用 V3版本 - 一键自动化安装{Colors.BLUE}                         ║
║                                                               ║
║  {Colors.GREEN}✓ 自动检测环境{Colors.BLUE}                                           ║
║  {Colors.GREEN}✓ 自动配置国内镜像源{Colors.BLUE}                                     ║
║  {Colors.GREEN}✓ 自动安装依赖{Colors.BLUE}                                           ║
║  {Colors.GREEN}✓ 自动配置Playwright{Colors.BLUE}                                    ║
║  {Colors.GREEN}✓ 自动设置Docker环境{Colors.BLUE}                                    ║
║                                                               ║
║  {Colors.YELLOW}适用于低配置服务器 (1核2G){Colors.BLUE}                               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝{Colors.ENDC}
"""
    print(banner)

def print_step(step_num, total_steps, message):
    print(f"\n{Colors.BLUE}[{step_num}/{total_steps}] {Colors.YELLOW}{message}{Colors.ENDC}")

def print_success(message):
    print(f"{Colors.GREEN}✓ {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.RED}✗ {message}{Colors.ENDC}")

def run_command(command, shell=True, check=True, cwd=None, env=None):
    """运行命令并返回结果"""
    try:
        logger.info(f"执行命令: {command}")
        result = subprocess.run(
            command,
            shell=shell,
            check=check,
            cwd=cwd,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8'
        )
        return result
    except subprocess.CalledProcessError as e:
        logger.error(f"命令执行失败: {e}")
        logger.error(f"错误输出: {e.stderr}")
        return e

def get_system_memory():
    """获取系统内存大小（GB）"""
    try:
        if IS_WINDOWS:
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
        elif IS_LINUX:
            with open('/proc/meminfo', 'r') as f:
                for line in f:
                    if 'MemTotal' in line:
                        return int(line.split()[1]) / (1024**2)
        elif IS_MAC:
            result = run_command('sysctl -n hw.memsize')
            if result.returncode == 0:
                return int(result.stdout.strip()) / (1024**3)
    except Exception as e:
        logger.error(f"获取内存信息失败: {e}")
    
    # 如果无法获取，返回默认值
    return 4.0

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

def check_python_version():
    """检查Python版本是否满足要求"""
    python_version = tuple(map(int, platform.python_version().split('.')[:2]))
    if python_version < (3, 8):
        print_error(f"Python版本过低: {platform.python_version()}")
        print_warning("需要Python 3.8或更高版本")
        return False
    print_success(f"Python版本检查通过: {platform.python_version()}")
    return True

def setup_pip_mirror():
    """设置pip国内镜像源"""
    try:
        # 测试各个镜像源的速度
        fastest_mirror = None
        best_time = float('inf')
        
        for name, url in PIP_MIRRORS.items():
            if name == 'default':
                continue
                
            start_time = time.time()
            try:
                with urllib.request.urlopen(url, timeout=3) as response:
                    if response.status == 200:
                        elapsed = time.time() - start_time
                        logger.info(f"镜像源 {name} 响应时间: {elapsed:.2f}秒")
                        if elapsed < best_time:
                            best_time = elapsed
                            fastest_mirror = name
            except Exception as e:
                logger.warning(f"镜像源 {name} 测试失败: {e}")
        
        if fastest_mirror:
            mirror_url = PIP_MIRRORS[fastest_mirror]
            print_success(f"选择最快的镜像源: {fastest_mirror} ({mirror_url})")
        else:
            mirror_url = PIP_MIRRORS['aliyun']  # 默认使用阿里云
            print_warning(f"无法测试镜像源速度，使用默认镜像: 阿里云 ({mirror_url})")
        
        # 创建pip配置目录
        os.makedirs(os.path.dirname(PIP_CONF_PATH), exist_ok=True)
        
        # 写入pip配置文件
        with open(PIP_CONF_PATH, 'w', encoding='utf-8') as f:
            f.write(f"[global]\nindex-url = {mirror_url}\ntrusted-host = {mirror_url.split('/')[2]}\n")
        
        print_success(f"已配置pip镜像源: {mirror_url}")
        return True
    except Exception as e:
        logger.error(f"设置pip镜像源失败: {e}")
        print_warning("无法设置pip镜像源，将使用默认源")
        return False

def create_virtual_env():
    """创建虚拟环境"""
    try:
        if os.path.exists(VENV_DIR):
            print_warning(f"虚拟环境已存在: {VENV_DIR}")
            choice = input("是否重新创建? (y/n): ").strip().lower()
            if choice == 'y':
                shutil.rmtree(VENV_DIR)
                print_success("已删除旧的虚拟环境")
            else:
                print_warning("将使用现有虚拟环境")
                return True
        
        print_step(3, 10, "创建Python虚拟环境...")
        result = run_command(f"{PYTHON_CMD} -m venv {VENV_DIR}")
        
        if result.returncode == 0:
            print_success(f"虚拟环境创建成功: {VENV_DIR}")
            return True
        else:
            print_error(f"虚拟环境创建失败: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"创建虚拟环境失败: {e}")
        print_error(f"创建虚拟环境时出错: {e}")
        return False

def get_venv_python():
    """获取虚拟环境中的Python路径"""
    if IS_WINDOWS:
        return os.path.join(VENV_DIR, 'Scripts', 'python.exe')
    else:
        return os.path.join(VENV_DIR, 'bin', 'python')

def get_venv_pip():
    """获取虚拟环境中的pip命令"""
    venv_python = get_venv_python()
    return f'"{venv_python}" -m pip'

def install_dependencies():
    """安装项目依赖"""
    try:
        venv_pip = get_venv_pip()
        
        # 升级pip
        print_step(4, 10, "升级pip...")
        run_command(f"{venv_pip} install --upgrade pip")
        print_success("pip升级完成")
        
        # 安装依赖
        requirements_path = os.path.join(PROJECT_ROOT, 'requirements_v3.txt')
        if not os.path.exists(requirements_path):
            print_error(f"依赖文件不存在: {requirements_path}")
            return False
        
        print_step(5, 10, "安装项目依赖...")
        result = run_command(f"{venv_pip} install -r {requirements_path}")
        
        if result.returncode == 0:
            print_success("依赖安装完成")
            return True
        else:
            print_error(f"依赖安装失败: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"安装依赖失败: {e}")
        print_error(f"安装依赖时出错: {e}")
        return False

def install_playwright():
    """安装Playwright及浏览器"""
    try:
        venv_python = get_venv_python()
        
        print_step(6, 10, "安装Playwright...")
        
        # 安装Playwright
        result = run_command(f"{venv_python} -m playwright install chromium")
        
        if result.returncode == 0:
            print_success("Playwright安装成功")
            
            # 安装系统依赖
            if not IS_WINDOWS:
                print_step(7, 10, "安装Playwright系统依赖...")
                result = run_command(f"{venv_python} -m playwright install-deps chromium")
                
                if result.returncode == 0:
                    print_success("Playwright系统依赖安装成功")
                else:
                    print_warning(f"Playwright系统依赖安装失败，可能需要手动安装: {result.stderr}")
            
            return True
        else:
            print_error(f"Playwright安装失败: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"安装Playwright失败: {e}")
        print_error(f"安装Playwright时出错: {e}")
        return False

def format_code():
    """使用Black格式化代码"""
    try:
        venv_pip = get_venv_pip()
        
        # 安装Black
        print_step(8, 10, "安装Black代码格式化工具...")
        run_command(f"{venv_pip} install black")
        
        # 格式化代码
        venv_python = get_venv_python()
        print_step(9, 10, "格式化代码...")
        
        python_files = [f for f in os.listdir(PROJECT_ROOT) if f.endswith('.py')]
        for py_file in python_files:
            file_path = os.path.join(PROJECT_ROOT, py_file)
            run_command(f'"{venv_python}" -m black "{file_path}"')
        
        print_success("代码格式化完成")
        return True
    except Exception as e:
        logger.error(f"格式化代码失败: {e}")
        print_warning(f"格式化代码时出错: {e}")
        return True  # 非关键步骤，失败也继续

def check_docker_environment():
    """检查Docker环境"""
    try:
        print_step(10, 10, "检查Docker环境...")
        
        # 检查Docker是否安装
        docker_result = run_command("docker --version", check=False)
        docker_compose_result = run_command("docker-compose --version", check=False)
        
        if docker_result.returncode == 0:
            print_success(f"Docker已安装: {docker_result.stdout.strip()}")
            SYSTEM_INFO['docker_version'] = docker_result.stdout.strip()
            
            # 检查Docker Compose
            if docker_compose_result.returncode == 0:
                print_success(f"Docker Compose已安装: {docker_compose_result.stdout.strip()}")
                SYSTEM_INFO['docker_compose_version'] = docker_compose_result.stdout.strip()
            else:
                print_warning("Docker Compose未安装或不在PATH中")
            
            # 检查Docker服务状态
            if IS_LINUX:
                service_result = run_command("systemctl is-active docker", check=False)
                if service_result.returncode == 0 and service_result.stdout.strip() == 'active':
                    print_success("Docker服务正在运行")
                else:
                    print_warning("Docker服务未运行，请手动启动: sudo systemctl start docker")
            
            return True
        else:
            print_warning("Docker未安装或不在PATH中")
            if IS_LINUX:
                print_warning("可以使用以下命令安装Docker:")
                print("curl -fsSL https://get.docker.com | sh")
            elif IS_WINDOWS:
                print_warning("请从Docker官网下载安装Docker Desktop:")
                print("https://www.docker.com/products/docker-desktop")
            
            return False
    except Exception as e:
        logger.error(f"检查Docker环境失败: {e}")
        print_warning(f"检查Docker环境时出错: {e}")
        return False

def generate_summary():
    """生成安装摘要"""
    SYSTEM_INFO['memory_gb'] = get_system_memory()
    SYSTEM_INFO['is_docker'] = is_running_in_docker()
    SYSTEM_INFO['is_low_spec'] = SYSTEM_INFO['cpu_count'] <= 1 or SYSTEM_INFO['memory_gb'] < 4
    
    summary = f"""
{Colors.BLUE}╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║  {Colors.YELLOW}安装完成摘要{Colors.BLUE}                                             ║
║                                                               ║
║  {Colors.GREEN}系统信息:{Colors.BLUE}                                                 ║
║    操作系统: {SYSTEM_INFO['os']} {SYSTEM_INFO['os_version']}                      ║
║    Python版本: {platform.python_version()}                                ║
║    CPU核心数: {SYSTEM_INFO['cpu_count']}                                      ║
║    内存大小: {SYSTEM_INFO['memory_gb']:.1f} GB                                ║
║    Docker环境: {'已安装' if SYSTEM_INFO.get('docker_version') else '未安装'}                                    ║
║    低配置模式: {'是' if SYSTEM_INFO['is_low_spec'] else '否'}                                      ║
║                                                               ║
║  {Colors.GREEN}安装路径:{Colors.BLUE}                                                 ║
║    项目目录: {PROJECT_ROOT}                    ║
║    虚拟环境: {VENV_DIR}                        ║
║                                                               ║
║  {Colors.GREEN}启动应用:{Colors.BLUE}                                                 ║
║    {Colors.YELLOW}python start_app_v3.py{Colors.BLUE}                                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝{Colors.ENDC}
"""
    print(summary)

def main():
    """主函数"""
    print_banner()
    
    # 步骤1: 检查Python版本
    print_step(1, 10, "检查Python版本...")
    if not check_python_version():
        sys.exit(1)
    
    # 步骤2: 设置pip镜像源
    print_step(2, 10, "设置pip国内镜像源...")
    setup_pip_mirror()
    
    # 步骤3: 创建虚拟环境
    if not create_virtual_env():
        sys.exit(1)
    
    # 步骤4-5: 安装依赖
    if not install_dependencies():
        sys.exit(1)
    
    # 步骤6-7: 安装Playwright
    if not install_playwright():
        print_warning("Playwright安装失败，但将继续安装过程")
    
    # 步骤8-9: 格式化代码
    format_code()
    
    # 步骤10: 检查Docker环境
    check_docker_environment()
    
    # 生成安装摘要
    generate_summary()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}安装被用户中断{Colors.ENDC}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"安装过程中出现错误: {e}", exc_info=True)
        print(f"\n{Colors.RED}安装过程中出现错误: {e}{Colors.ENDC}")
        print(f"\n{Colors.YELLOW}请查看日志文件 'install_v3_log.txt' 获取详细信息{Colors.ENDC}")
        sys.exit(1)