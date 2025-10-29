# 环信发送前回调服务

## 项目说明

这是一个基于 Node.js 的环信发送前回调服务，用于在消息发送前进行内容审核和处理。

## 功能特性

- 环信发送前回调处理
- 签名验证确保安全性
- 消息内容审核
- Docker 容器化部署
- 完整的日志记录

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
