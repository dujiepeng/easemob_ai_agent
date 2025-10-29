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

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并配置相关参数：

```bash
cp .env.example .env
```

### 3. 启动服务

开发环境：
```bash
npm run dev
```

生产环境：
```bash
npm start
```

### 4. Docker 部署

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

## 测试

```bash
npm test
```

## 许可证

MIT
