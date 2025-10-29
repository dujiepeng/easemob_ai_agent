const express = require('express');
const crypto = require('crypto');
const helmet = require('helmet');
const cors = require('cors');
const winston = require('winston');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

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
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志中间件
app.use((req, res, next) => {
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

// 启动服务器
app.listen(port, () => {
  logger.info(`Easemob callback server started on port ${port}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
