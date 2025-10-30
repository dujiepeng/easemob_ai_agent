const express = require('express');
const crypto = require('crypto');
const helmet = require('helmet');
const cors = require('cors');
const winston = require('winston');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const LogStorage = require('./logStorage');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const port = process.env.PORT || 3000;

// 初始化日志存储
const logStorage = new LogStorage();

// 配置日志
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new winston.transports.File({ 
      filename: process.env.LOG_FILE || 'logs/app.log' 
    })
  ]
});

// 中间件配置
app.use(helmet({
  contentSecurityPolicy: false // 允许内联脚本用于前端
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// 请求日志中间件
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // 保存原始响应方法
  const originalSend = res.send;
  
  res.send = function(data) {
    const processingTime = Date.now() - startTime;
    
    // 记录到数据库
    if (req.path === '/easemob/callback') {
      // 提取消息相关信息
      const payload = req.body.payload || {};
      const msgPayload = payload.payload || {};
      
      // 提取 from, to, chatType, msgId
      const from_user = payload.from || null;
      const to_user = payload.to || null;
      const chatType = payload.chatType || null;
      const msg_id = payload.msgId || null;
      
      // 提取 body (消息内容) - 从 payload.bodies 提取整个数组
      let body = null;
      if (msgPayload.bodies && Array.isArray(msgPayload.bodies)) {
        // 提取整个 bodies 数组
        body = JSON.stringify(msgPayload.bodies);
      } else if (msgPayload.msg) {
        // 兼容旧格式
        body = msgPayload.msg;
      } else if (msgPayload.url) {
        // 兼容旧格式
        body = msgPayload.url;
      } else if (msgPayload) {
        // 其他类型消息，转换为 JSON 字符串
        body = typeof msgPayload === 'string' ? msgPayload : JSON.stringify(msgPayload);
      }
      
      // 提取 ext (扩展字段) - 从 payload.ext 提取
      const ext = payload.ext ? (typeof payload.ext === 'string' ? payload.ext : JSON.stringify(payload.ext)) : null;
      
      logStorage.logRequest({
        callId: req.body.callId || 'unknown',
        timestamp: req.body.timestamp || Date.now(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
        requestBody: req.body,
        responseBody: data,
        statusCode: res.statusCode,
        processingTime: processingTime,
        from_user: from_user,
        to_user: to_user,
        chatType: chatType,
        msg_id: msg_id,
        body: body,
        ext: ext
      }).then(() => {
        // 通过 WebSocket 推送实时日志
        io.emit('newLog', {
          callId: req.body.callId || 'unknown',
          timestamp: new Date().toISOString(),
          ip: req.ip,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          processingTime: processingTime,
          requestBody: req.body,
          responseBody: data,
          from_user: from_user,
          to_user: to_user,
          chatType: chatType,
          msg_id: msg_id,
          body: body,
          ext: ext
        });
      }).catch(err => {
        logger.error('Failed to log request:', err);
      });
    }
    
    // 调用原始发送方法
    originalSend.call(this, data);
  };
  
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method === 'POST' ? req.body : undefined
  });
  next();
});

// 签名验证函数
function verifySignature(callId, timestamp, security, secret) {
  const expectedSecurity = crypto
    .createHash('md5')
    .update(callId + secret + timestamp)
    .digest('hex');
  
  return security === expectedSecurity;
}

// 消息内容审核函数
function validateMessage(payload) {
  // 这里可以添加你的消息审核逻辑
  // 例如：敏感词检测、内容过滤等
  
  const { msgType, payload: msgPayload } = payload;
  
  // 示例：检查文本消息内容
  if (msgType === 'txt' && msgPayload && msgPayload.msg) {
    const content = msgPayload.msg.toLowerCase();
    
    // 简单的敏感词检测示例
    const sensitiveWords = ['spam', '广告', '垃圾'];
    const hasSensitiveContent = sensitiveWords.some(word => 
      content.includes(word.toLowerCase())
    );
    
    if (hasSensitiveContent) {
      return {
        valid: false,
        reason: '包含敏感内容'
      };
    }
  }
  
  return { valid: true };
}

// 环信发送前回调处理
app.post('/easemob/callback', (req, res) => {
  try {
    const { callId, timestamp, security, payload } = req.body;
    
    // 验证必要参数
    if (!callId || !timestamp || !security || !payload) {
      logger.warn('Missing required parameters', { callId, timestamp, security });
      return res.status(400).json({
        valid: false,
        code: 'HX:40001',
        message: 'Missing required parameters'
      });
    }
    
    // 验证签名
    const secret = process.env.EASEMOB_SECRET;
    if (!secret) {
      logger.error('EASEMOB_SECRET not configured');
      return res.status(500).json({
        valid: false,
        code: 'HX:50001',
        message: 'Server configuration error'
      });
    }
    
    if (!verifySignature(callId, timestamp, security, secret)) {
      logger.warn('Invalid signature', { callId, timestamp });
      return res.status(403).json({
        valid: false,
        code: 'HX:40301',
        message: 'Invalid signature'
      });
    }
    
    // 消息内容审核
    const validationResult = validateMessage(payload);
    
    if (!validationResult.valid) {
      logger.info('Message validation failed', {
        callId,
        reason: validationResult.reason,
        payload
      });
      
      return res.json({
        valid: false,
        code: 'HX:10001',
        message: validationResult.reason || 'Message validation failed'
      });
    }
    
    // 消息通过审核
    logger.info('Message validation passed', { callId, payload });
    
    res.json({
      valid: true,
      code: 'HX:10000',
      message: 'Message approved'
    });
    
  } catch (error) {
    logger.error('Callback processing error', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    res.status(500).json({
      valid: false,
      code: 'HX:50000',
      message: 'Internal server error'
    });
  }
});

// API 接口
app.get('/api/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const logs = await logStorage.getLogs(limit, offset);
    res.json({ logs });
  } catch (error) {
    logger.error('Failed to get logs:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

app.get('/api/logs/:id', async (req, res) => {
  try {
    const log = await logStorage.getLogById(req.params.id);
    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }
    res.json({ log });
  } catch (error) {
    logger.error('Failed to get log:', error);
    res.status(500).json({ error: 'Failed to get log' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await logStorage.getStats();
    res.json({ stats });
  } catch (error) {
    logger.error('Failed to get stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({
    error: 'Internal server error',
    code: 'HX:50000'
  });
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    code: 'HX:40400'
  });
});

// WebSocket 连接处理
io.on('connection', (socket) => {
  logger.info('Client connected to WebSocket');
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected from WebSocket');
  });
});

// 启动服务器
server.listen(port, () => {
  logger.info(`Easemob callback server started on port ${port}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Frontend available at: http://localhost:${port}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logStorage.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logStorage.close();
    process.exit(0);
  });
});

module.exports = app;
