# V3数据查询系统

## 项目概述

V3数据查询系统是一个高性能、低资源消耗的数据查询应用，专为低配置服务器环境优化设计。系统集成了Playwright自动化浏览器技术，能够高效地从目标网站获取数据，并提供友好的用户界面展示查询结果。

### 核心特性

- **一键式自动安装**：提供全自动化安装脚本，自动检测环境并配置
- **Playwright集成**：使用最新的浏览器自动化技术，提高数据获取稳定性
- **智能性能优化**：根据服务器资源自动调整性能参数，适应不同配置环境
- **低资源消耗模式**：针对低配置服务器优化，最小化CPU和内存占用
- **现代化用户界面**：基于Tailwind CSS和DaisyUI构建的响应式界面
- **完善的错误处理**：多层次错误捕获和恢复机制，提高系统稳定性
- **Docker部署支持**：提供容器化部署方案，简化运维流程

## 技术栈

- **后端**：Python 3.11, Flask, Gunicorn, Playwright
- **前端**：HTML5, CSS3, JavaScript (ES6+), Tailwind CSS, DaisyUI
- **容器化**：Docker, Docker Compose
- **浏览器自动化**：Playwright, Chrome
- **性能优化**：缓存机制, 资源自适应, 请求合并

## 快速开始

### 自动安装（推荐）

系统提供了一键式安装脚本，可以自动完成环境检测、依赖安装和配置：

```bash
python install_v3_auto.py
```

安装完成后，运行以下命令启动应用：

```bash
python start_app_v3.py
```

### Docker安装

如果您的环境支持Docker，可以使用Docker Compose进行部署：

```bash
docker-compose up -d
```

这将构建并启动V3数据查询系统容器，应用将在`http://localhost:5003`上可用。

### 手动安装

1. 确保您的系统已安装Python 3.11及以上版本

2. 安装依赖包：

```bash
pip install -r requirements_v3.txt
```

3. 安装Chrome浏览器（如果尚未安装）

4. 安装Playwright浏览器：

```bash
python -m playwright install chromium
```

5. 启动应用：

```bash
python start_app_v3.py
```

## 配置说明

系统配置位于`config_v3.py`文件中，主要配置项包括：

- **基础路径配置**：应用根目录、静态文件目录等
- **Flask配置**：端口、调试模式、密钥等
- **性能配置**：工作进程数、线程数、缓存大小等
- **Playwright配置**：浏览器选项、超时设置等
- **日志配置**：日志级别、轮转策略等

对于低配置服务器，系统会自动检测并应用优化配置，您也可以手动设置`LOW_RESOURCE_MODE=true`环境变量启用低资源模式。

## API接口

### 数据查询接口

```
GET/POST /api/query
```

参数：
- `project_id`: 项目ID（必填）
- `uk_code`: UK代码（必填）
- `start_date`: 开始日期，格式YYYY-MM-DD（必填）
- `end_date`: 结束日期，格式YYYY-MM-DD（必填）

返回示例：

```json
{
  "status": "success",
  "data": [
    {
      "id": "12345",
      "date": "2023-05-01",
      "amount": "1000.00",
      "status": "成功",
      "details": "交易详情"
    }
  ],
  "stats": {
    "total_count": 1,
    "total_amount": 1000.00,
    "average_amount": 1000.00,
    "success_rate": 1.0
  },
  "query_info": {
    "project_id": "PRJ001",
    "uk_code": "UK001",
    "start_date": "2023-05-01",
    "end_date": "2023-05-31",
    "timestamp": "2023-05-31T12:00:00Z"
  }
}
```

### 健康检查接口

```
GET /health
```

返回示例：

```json
{
  "status": "healthy",
  "version": "3.0.0",
  "playwright_status": "running",
  "uptime": 3600
}
```

## 性能优化

V3数据查询系统针对低配置服务器环境进行了多方面优化：

1. **动态资源分配**：根据服务器CPU和内存自动调整工作进程和线程数
2. **浏览器优化**：禁用GPU加速、共享内存和沙箱，降低资源消耗
3. **缓存机制**：实现多级缓存，减少重复查询和计算
4. **请求合并**：合并短时间内的相似请求，减少浏览器实例数量
5. **延迟加载**：非关键资源延迟加载，加快页面响应速度

## 故障排除

### 常见问题

1. **安装失败**
   - 检查Python版本是否为3.11或以上
   - 确保网络连接正常，能够访问pip源
   - 查看`logs/install.log`获取详细错误信息

2. **启动失败**
   - 检查端口5003是否被占用
   - 确认Chrome浏览器安装正确
   - 查看`logs/app.log`获取详细错误信息

3. **查询超时**
   - 检查网络连接是否稳定
   - 增加`config_v3.py`中的`PLAYWRIGHT_TIMEOUT`值
   - 考虑启用`DISABLE_DEV_SHM`选项（在内存较小的系统上）

### 日志位置

- 安装日志：`logs/install.log`
- 应用日志：`logs/app.log`
- 错误日志：`logs/error.log`
- Playwright日志：`logs/playwright.log`

## 项目结构

```
v3/
├── app_v3.py              # Flask应用主文件
├── config_v3.py           # 配置文件
├── install_v3_auto.py     # 自动安装脚本
├── requirements_v3.txt    # Python依赖列表
├── start_app_v3.py        # 应用启动脚本
├── Dockerfile             # Docker构建文件
├── docker-compose.yml     # Docker Compose配置
├── .dockerignore          # Docker构建忽略文件
├── static/                # 静态资源目录
│   ├── css/               # CSS样式文件
│   │   └── style.css      # 主样式文件
│   └── js/                # JavaScript文件
│       ├── api.js         # API交互模块
│       ├── calculationService.js  # 计算服务模块
│       ├── config.js      # 前端配置文件
│       ├── script.js      # 主脚本文件
│       └── ui.js          # UI交互模块
├── templates/             # 模板目录
│   └── index.html         # 主页模板
├── logs/                  # 日志目录
└── temp/                  # 临时文件目录
```

## 技术支持

如遇到问题，请查看日志文件获取详细错误信息。如需进一步支持，请联系系统管理员。

---

© 2023 V3数据查询系统 | 版本 3.0.0