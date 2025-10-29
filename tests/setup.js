// Jest 测试设置文件
const winston = require('winston');

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // 测试时减少日志输出

// 配置测试用的日志
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console()
  ]
});

// 全局测试超时
jest.setTimeout(10000);
