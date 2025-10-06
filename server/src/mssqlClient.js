import sql from 'mssql';
import logger from './logger.js';

export const buildSqlConfig = ({ server, database, user, password, domain, encrypt = true }) => {
  const [serverName, portPart] = server.replace('tcp://', '').split(':');
  const port = portPart ? parseInt(portPart, 10) : 1433;

  return {
    user,
    password,
    server: serverName,
    database,
    port,
    domain,
    options: {
      encrypt,
      trustServerCertificate: !encrypt
    }
  };
};

export const testConnection = async (config) => {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    await pool.request().query('SELECT 1 AS alive');
    logger.info('SQL Server connection test succeeded', { server: config.server, database: config.database });
  } finally {
    pool.close();
  }
};

export const executeQuery = async (config, queryText) => {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    logger.info('Executing SQL query', { server: config.server, database: config.database });
    const request = pool.request();
    const { recordset } = await request.query(queryText);
    const columns = recordset.length > 0 ? Object.keys(recordset[0]) : [];
    return {
      columns,
      rows: recordset
    };
  } finally {
    pool.close();
  }
};
