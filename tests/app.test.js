const request = require('supertest');
const crypto = require('crypto');
const app = require('../src/app');

// 测试用的密钥
const TEST_SECRET = 'test_secret_key';

// 生成测试签名
function generateSignature(callId, timestamp, secret) {
  return crypto.createHash('md5').update(callId + secret + timestamp).digest('hex');
}

describe('Easemob Callback API', () => {
  beforeEach(() => {
    // 设置测试环境变量
    process.env.EASEMOB_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    // 清理环境变量
    delete process.env.EASEMOB_SECRET;
  });

  describe('POST /easemob/callback', () => {
    it('应该成功处理有效的回调请求', async () => {
      const callId = 'test_call_id_123';
      const timestamp = Date.now();
      const security = generateSignature(callId, timestamp, TEST_SECRET);
      
      const payload = {
        callId,
        timestamp,
        security,
        payload: {
          from: 'user1',
          to: 'user2',
          msgId: 'msg_123',
          chatType: 'chat',
          msgType: 'txt',
          payload: {
            msg: 'Hello, world!'
          }
        }
      };

      const response = await request(app)
        .post('/easemob/callback')
        .send(payload)
        .expect(200);

      expect(response.body).toEqual({
        valid: true,
        code: 'HX:10000',
        message: 'Message approved'
      });
    });

    it('应该拒绝包含敏感词的消息', async () => {
      const callId = 'test_call_id_456';
      const timestamp = Date.now();
      const security = generateSignature(callId, timestamp, TEST_SECRET);
      
      const payload = {
        callId,
        timestamp,
        security,
        payload: {
          from: 'user1',
          to: 'user2',
          msgId: 'msg_456',
          chatType: 'chat',
          msgType: 'txt',
          payload: {
            msg: '这是垃圾广告信息'
          }
        }
      };

      const response = await request(app)
        .post('/easemob/callback')
        .send(payload)
        .expect(200);

      expect(response.body).toEqual({
        valid: false,
        code: 'HX:10001',
        message: '包含敏感内容'
      });
    });

    it('应该拒绝无效签名的请求', async () => {
      const callId = 'test_call_id_789';
      const timestamp = Date.now();
      const invalidSecurity = 'invalid_signature';
      
      const payload = {
        callId,
        timestamp,
        security: invalidSecurity,
        payload: {
          from: 'user1',
          to: 'user2',
          msgId: 'msg_789',
          chatType: 'chat',
          msgType: 'txt',
          payload: {
            msg: 'Hello, world!'
          }
        }
      };

      const response = await request(app)
        .post('/easemob/callback')
        .send(payload)
        .expect(403);

      expect(response.body).toEqual({
        valid: false,
        code: 'HX:40301',
        message: 'Invalid signature'
      });
    });

    it('应该拒绝缺少必要参数的请求', async () => {
      const payload = {
        callId: 'test_call_id',
        // 缺少 timestamp, security, payload
      };

      const response = await request(app)
        .post('/easemob/callback')
        .send(payload)
        .expect(400);

      expect(response.body).toEqual({
        valid: false,
        code: 'HX:40001',
        message: 'Missing required parameters'
      });
    });

    it('应该处理服务器配置错误', async () => {
      // 删除环境变量模拟配置错误
      delete process.env.EASEMOB_SECRET;
      
      const callId = 'test_call_id_error';
      const timestamp = Date.now();
      const security = generateSignature(callId, timestamp, TEST_SECRET);
      
      const payload = {
        callId,
        timestamp,
        security,
        payload: {
          from: 'user1',
          to: 'user2',
          msgId: 'msg_error',
          chatType: 'chat',
          msgType: 'txt',
          payload: {
            msg: 'Hello, world!'
          }
        }
      };

      const response = await request(app)
        .post('/easemob/callback')
        .send(payload)
        .expect(500);

      expect(response.body).toEqual({
        valid: false,
        code: 'HX:50001',
        message: 'Server configuration error'
      });
    });
  });

  describe('GET /health', () => {
    it('应该返回健康状态', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('404 处理', () => {
    it('应该返回 404 对于不存在的路由', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Not found',
        code: 'HX:40400'
      });
    });
  });
});
