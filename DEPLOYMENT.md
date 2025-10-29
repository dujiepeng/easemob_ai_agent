# 部署指南

## 本地开发部署

### 1. 环境准备

确保已安装以下软件：
- Node.js 16+ 
- npm 或 yarn
- Git

### 2. 项目配置

```bash
# 克隆项目
git clone <repository-url>
cd easemob_ai_agent

# 安装依赖
npm install

# 配置环境变量
cp env.example .env
# 编辑 .env 文件，设置 EASEMOB_SECRET
```

### 3. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start

# 或使用启动脚本
./start.sh
```

服务将在 `http://localhost:3000` 启动

## Docker 部署

### 1. 构建镜像

```bash
docker build -t easemob-callback .
```

### 2. 运行容器

```bash
# 使用环境变量
docker run -p 9999:3000 \
  -e EASEMOB_SECRET=your_secret_here \
  -e NODE_ENV=production \
  easemob-callback

# 使用环境文件
docker run -p 9999:3000 \
  --env-file .env \
  easemob-callback
```

### 3. 使用 Docker Compose

```bash
# 设置环境变量
export EASEMOB_SECRET=your_secret_here

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 环信控制台配置

### 1. 开通回调服务

1. 登录环信控制台
2. 进入应用管理
3. 选择对应应用
4. 开通消息回调服务

### 2. 配置发送前回调

1. 在回调配置中设置：
   - **回调 URL**: `http://your-domain:9999/easemob/callback`
   - **Secret**: 与 `.env` 文件中的 `EASEMOB_SECRET` 保持一致
   - **回调规则**: 根据需要配置消息类型和用户范围

### 3. 回调规则示例

```json
{
  "callbackUrl": "http://your-domain:9999/easemob/callback",
  "callbackSecret": "your_secret_here",
  "callbackRules": [
    {
      "msgType": ["txt", "img", "audio", "video"],
      "chatType": ["chat", "groupchat"],
      "from": "*",
      "to": "*"
    }
  ]
}
```

## 监控和日志

### 1. 健康检查

```bash
curl http://localhost:9999/health
```

### 2. 查看日志

```bash
# Docker 部署
docker logs -f <container_id>

# 本地部署
tail -f logs/app.log
```

### 3. 监控指标

- 服务状态：`/health` 接口
- 日志文件：`logs/app.log`
- 容器健康检查：Docker 自动监控

## 故障排除

### 1. 常见问题

**问题**: 回调请求被拒绝
- 检查 `EASEMOB_SECRET` 配置是否正确
- 验证签名计算逻辑
- 查看日志中的错误信息

**问题**: 服务无法启动
- 检查端口是否被占用
- 验证环境变量配置
- 查看启动日志

**问题**: Docker 容器启动失败
- 检查 Dockerfile 语法
- 验证镜像构建过程
- 查看容器日志

### 2. 调试模式

```bash
# 启用调试日志
export LOG_LEVEL=debug
npm run dev
```

### 3. 测试回调

```bash
# 使用测试脚本
npm test

# 手动测试
curl -X POST http://localhost:9999/easemob/callback \
  -H "Content-Type: application/json" \
  -d @tests/testcases.json
```

## 安全注意事项

1. **密钥管理**: 妥善保管 `EASEMOB_SECRET`，不要提交到代码仓库
2. **网络安全**: 建议使用 HTTPS 部署生产环境
3. **访问控制**: 配置防火墙规则，限制回调接口访问
4. **日志安全**: 避免在日志中记录敏感信息

## 性能优化

1. **连接池**: 配置数据库连接池（如需要）
2. **缓存**: 添加 Redis 缓存敏感词库
3. **负载均衡**: 使用 Nginx 或负载均衡器
4. **监控**: 集成 APM 工具监控性能
