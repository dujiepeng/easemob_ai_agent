# 环信发送前回调服务

## 项目说明

这是一个基于 Node.js 的环信发送前回调服务，用于在消息发送前进行内容审核和处理。

## 功能特性

- 环信发送前回调处理
- 签名验证确保安全性
- 消息内容审核
- **实时日志监控界面**
- **WebSocket 实时推送**
- **SQLite 数据库存储**
- Docker 容器化部署
- 完整的日志记录和统计

## 环境要求

- Node.js >= 16.0.0
- Docker (可选)

## 快速开始

### 方式一：一键部署（推荐）

使用一键部署脚本自动完成代码拉取和部署：

```bash
# 从 GitHub 直接执行（推荐）
bash <(curl -sSL https://raw.githubusercontent.com/dujiepeng/easemob_ai_agent/main/install.sh)

# 或者先下载脚本后执行
curl -sSL https://raw.githubusercontent.com/dujiepeng/easemob_ai_agent/main/install.sh -o install.sh
bash < install.sh

# 指定安装目录（可选）
bash < install.sh /path/to/install/dir
```

脚本会自动完成：
- 检查系统依赖（Git，以及根据选择的部署方式检查 Node.js 或 Docker）
- 从 GitHub 克隆或更新代码
- 配置环境变量（会提示输入 EASEMOB_SECRET）
- 根据选择的部署方式启动服务

**部署方式选择：**
- **本地部署（默认）**：使用 Node.js 直接运行，无需 Docker
  - 需要 Node.js >= 16.0.0 和 npm
  - 服务将在后台运行，PID 保存在 `.pid` 文件中
- **Docker 部署**：使用 Docker Compose 容器化部署
  - 需要 Docker 和 Docker Compose
  - 服务在容器中运行，端口映射为 9999:3000

运行脚本时会提示选择部署方式（默认选择本地部署）。

### 方式二：手动部署

#### 1. 安装依赖

```bash
npm install
```

#### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并配置相关参数：

```bash
cp .env.example .env
```

#### 3. 启动服务

开发环境：
```bash
npm run dev
```

生产环境：
```bash
npm start
```

#### 4. Docker 部署

```bash
docker build -t easemob-callback .
docker run -p 9999:3000 -d easemob-callback
```

## 前端界面

启动服务后，访问 `http://localhost:9999` 即可查看实时日志监控界面。

### 界面功能

- **实时监控**: WebSocket 实时推送新的回调请求
- **日志查看**: 查看所有回调请求的详细信息
- **统计分析**: 显示总请求数、成功率、错误率等统计信息
- **搜索过滤**: 支持按 CallId、IP 地址搜索，按状态过滤
- **详情查看**: 点击日志条目查看完整的请求和响应信息
- **自动刷新**: 可开启自动刷新统计数据

### 界面截图

界面包含以下主要区域：
- 顶部导航栏：显示连接状态和实时监控状态
- 统计卡片：显示总请求数、成功请求、错误请求、平均响应时间
- 控制面板：搜索、过滤、刷新功能
- 日志列表：显示所有回调请求的详细信息

## API 接口

### POST /easemob/callback

环信发送前回调接口

**请求体：**
```json
{
  "callId": "string",
  "timestamp": "number",
  "security": "string",
  "payload": {
    "from": "string",
    "to": "string",
    "msgId": "string",
    "chatType": "string",
    "msgType": "string",
    "payload": "object"
  }
}
```

**响应：**
```json
{
  "valid": true,
  "code": "HX:10000",
  "payload": {}
}
```

### GET /api/logs

获取回调日志列表

**查询参数：**
- `limit`: 每页数量 (默认: 100)
- `offset`: 偏移量 (默认: 0)

**响应：**
```json
{
  "logs": [
    {
      "id": 1,
      "callId": "string",
      "timestamp": "number",
      "ip": "string",
      "userAgent": "string",
      "method": "string",
      "path": "string",
      "requestBody": "object",
      "responseBody": "object",
      "statusCode": "number",
      "processingTime": "number",
      "createdAt": "string"
    }
  ]
}
```

### GET /api/logs/:id

获取指定日志详情

### GET /api/stats

获取统计信息

**响应：**
```json
{
  "stats": {
    "totalRequests": "number",
    "successRequests": "number", 
    "errorRequests": "number",
    "avgProcessingTime": "number"
  }
}
```

### GET /health

健康检查接口

## 配置说明

在环信控制台中配置回调 URL：
- URL: `http://your-domain:9999/easemob/callback`
- Secret: 在 `.env` 文件中配置的 `EASEMOB_SECRET`

## CI/CD 自动部署

本项目配置了 GitHub Actions 自动部署功能，当代码推送到 `dev` 分支时会自动部署到服务器。

### 配置说明

1. **设置 GitHub Secrets**
   - `SSH_HOST`: 服务器地址
   - `SSH_USER`: SSH 用户名
   - `SSH_PASSWORD`: SSH 密码（或使用 SSH 密钥）
   - `SSH_PORT`: SSH 端口（可选，默认 22）
   - `SSH_PROJECT_DIR`: 部署目录（可选，默认 `$HOME/easemob_ai_agent`）
   - `SSH_DEPLOY_TYPE`: 部署方式，`local` 或 `docker`（可选，默认 `local`）

2. **详细配置说明**
   
   查看 [部署配置指南](.github/DEPLOYMENT_GUIDE.md) 了解详细的配置步骤。

3. **使用方法**
   
   推送代码到 `dev` 分支即可自动触发部署：
   ```bash
   git checkout dev
   git add .
   git commit -m "Update code"
   git push origin dev
   ```

4. **查看部署状态**
   
   进入 GitHub 仓库的 `Actions` 标签查看部署状态和日志。

## 测试

```bash
npm test
```

## 许可证

MIT
