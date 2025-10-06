import winston from 'winston';

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        const extras = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${message}${extras}`;
      })
    )
  })
];

try {
  const { EventLog } = await import('winston-eventlog');
  transports.push(
    new EventLog({
      eventLog: 'APPLICATION',
      source: 'Enterprise SQL Dashboard',
      level: 'info'
    })
  );
} catch (error) {
  console.warn('Windows Event Log transport unavailable, falling back to console logging.', error.message);
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports
});

export default logger;
