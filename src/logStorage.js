const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class LogStorage {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    const dbPath = path.join(__dirname, '../data/logs.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('Connected to SQLite database');
        this.createTable();
      }
    });
  }

  createTable() {
    // 创建表，如果不存在
    const sql = `
      CREATE TABLE IF NOT EXISTS callback_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        callId TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        ip TEXT,
        userAgent TEXT,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        requestBody TEXT,
        responseBody TEXT,
        statusCode INTEGER,
        processingTime INTEGER,
        from_user TEXT,
        to_user TEXT,
        chatType TEXT,
        body TEXT,
        ext TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    this.db.run(sql, (err) => {
      if (err) {
        console.error('Error creating table:', err.message);
      } else {
        console.log('Callback logs table ready');
        // 检查并添加新字段（用于已有数据库的迁移）
        this.migrateTable();
      }
    });
  }

  migrateTable() {
    // 添加新字段（如果不存在）
    const columns = [
      { name: 'from_user', type: 'TEXT' },
      { name: 'to_user', type: 'TEXT' },
      { name: 'chatType', type: 'TEXT' },
      { name: 'body', type: 'TEXT' },
      { name: 'ext', type: 'TEXT' }
    ];

    // 一次性检查所有字段，然后批量添加
    this.db.all("PRAGMA table_info(callback_logs)", (err, rows) => {
      if (err) {
        console.error('Error checking table info:', err.message);
        return;
      }
      
      const existingColumns = rows.map(row => row.name);
      
      columns.forEach(col => {
        if (!existingColumns.includes(col.name)) {
          const alterSql = `ALTER TABLE callback_logs ADD COLUMN ${col.name} ${col.type}`;
          this.db.run(alterSql, (alterErr) => {
            if (alterErr) {
              console.error(`Error adding column ${col.name}:`, alterErr.message);
            } else {
              console.log(`Column ${col.name} added successfully`);
            }
          });
        }
      });
    });
  }

  async logRequest(logData) {
    return new Promise((resolve, reject) => {
      const {
        callId,
        timestamp,
        ip,
        userAgent,
        method,
        path,
        requestBody,
        responseBody,
        statusCode,
        processingTime,
        from_user,
        to_user,
        chatType,
        body,
        ext
      } = logData;

      const sql = `
        INSERT INTO callback_logs 
        (callId, timestamp, ip, userAgent, method, path, requestBody, responseBody, statusCode, processingTime, from_user, to_user, chatType, body, ext)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [
        callId,
        timestamp,
        ip,
        userAgent,
        method,
        path,
        JSON.stringify(requestBody),
        JSON.stringify(responseBody),
        statusCode,
        processingTime,
        from_user || null,
        to_user || null,
        chatType || null,
        body || null,
        ext || null
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async getLogs(limit = 100, offset = 0) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM callback_logs 
        ORDER BY createdAt DESC 
        LIMIT ? OFFSET ?
      `;

      this.db.all(sql, [limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // 解析 JSON 字段
          const logs = rows.map(row => ({
            ...row,
            requestBody: JSON.parse(row.requestBody || '{}'),
            responseBody: JSON.parse(row.responseBody || '{}')
          }));
          resolve(logs);
        }
      });
    });
  }

  async getLogById(id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM callback_logs WHERE id = ?';
      
      this.db.get(sql, [id], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve({
            ...row,
            requestBody: JSON.parse(row.requestBody || '{}'),
            responseBody: JSON.parse(row.responseBody || '{}')
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  async getStats() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as totalRequests,
          COUNT(CASE WHEN statusCode >= 200 AND statusCode < 300 THEN 1 END) as successRequests,
          COUNT(CASE WHEN statusCode >= 400 THEN 1 END) as errorRequests,
          AVG(processingTime) as avgProcessingTime
        FROM callback_logs
      `;

      this.db.get(sql, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }
}

module.exports = LogStorage;
