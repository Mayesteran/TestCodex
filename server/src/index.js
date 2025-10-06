import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { body, validationResult } from 'express-validator';
import logger from './logger.js';
import { buildSqlConfig, executeQuery, testConnection } from './mssqlClient.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const activityLog = [];

const appendLog = (level, message, meta = {}) => {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    level,
    message,
    timestamp: new Date().toISOString(),
    meta
  };
  activityLog.unshift(entry);
  if (activityLog.length > 40) {
    activityLog.length = 40;
  }
  logger.log({ level, message, ...meta });
};

const defaultConnection = () => ({
  server: process.env.SQL_SERVER || 'tcp://localhost:1433',
  database: process.env.SQL_DATABASE || 'master',
  user: process.env.SQL_USER || '',
  password: process.env.SQL_PASSWORD || '',
  domain: process.env.SQL_DOMAIN || '',
  encrypt: process.env.SQL_ENCRYPT ? process.env.SQL_ENCRYPT !== 'false' : true
});

app.get('/api/status', async (req, res) => {
  let online = false;
  let message = 'API online';

  try {
    if (process.env.SQL_SERVER) {
      await testConnection(buildSqlConfig(defaultConnection()));
      online = true;
      message = 'Connected to SQL Server';
      appendLog('info', 'Health check succeeded with SQL Server');
    } else {
      message = 'Configure SQL_SERVER to enable live status checks';
    }
  } catch (error) {
    message = `SQL connectivity failed: ${error.message}`;
    appendLog('error', message);
  }

  res.json({
    online,
    message,
    logs: activityLog
  });
});

const validateConnection = [
  body('server').notEmpty().withMessage('Server is required'),
  body('database').notEmpty().withMessage('Database is required'),
  body('user').notEmpty().withMessage('User is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('encrypt').isBoolean().withMessage('Encrypt must be a boolean')
];

app.post('/api/test-connection', validateConnection, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    appendLog('error', 'Connection validation failed', { errors: errors.array() });
    return res.status(422).json({ errors: errors.array(), message: 'Validation failed' });
  }

  const payload = req.body;
  try {
    await testConnection(buildSqlConfig(payload));
    appendLog('info', 'Manual connection test succeeded', { server: payload.server, database: payload.database });
    res.json({ online: true, message: 'Connection successful', logs: activityLog });
  } catch (error) {
    appendLog('error', 'Manual connection test failed', { error: error.message });
    res.status(500).json({ message: error.message, logs: activityLog });
  }
});

app.post(
  '/api/query',
  [
    ...validateConnection,
    body('sql').isString().notEmpty().withMessage('SQL statement is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      appendLog('error', 'Query validation failed', { errors: errors.array() });
      return res.status(422).json({ errors: errors.array(), message: 'Validation failed' });
    }

    const { sql: sqlStatement, connection } = { sql: req.body.sql, connection: req.body.connection ?? req.body };

    try {
      const config = buildSqlConfig(connection);
      const results = await executeQuery(config, sqlStatement);
      appendLog('info', 'Query executed successfully', {
        server: connection.server,
        database: connection.database,
        rows: results.rows.length
      });
      res.json({ results, logs: activityLog });
    } catch (error) {
      appendLog('error', 'Query execution failed', { error: error.message });
      res.status(500).json({ message: error.message, logs: activityLog });
    }
  }
);

app.use((err, req, res, next) => {
  appendLog('error', 'Unexpected server error', { error: err.message });
  res.status(500).json({ message: 'Internal server error', logs: activityLog });
});

app.listen(port, () => {
  appendLog('info', `API listening on port ${port}`);
  console.log(`Enterprise SQL Dashboard API listening on port ${port}`);
});
