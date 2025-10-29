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
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    this.db.run(sql, (err) => {
      if (err) {
        console.error('Error creating table:', err.message);
      } else {
        console.log('Callback logs table ready');
      }
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
        processingTime
      } = logData;

      const sql = `
        INSERT INTO callback_logs 
        (callId, timestamp, ip, userAgent, method, path, requestBody, responseBody, statusCode, processingTime)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        processingTime
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
