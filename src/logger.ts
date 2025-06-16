import pinoPkg from 'pino';

const pino = (pinoPkg as any).default ?? pinoPkg;

const level = process.env['LOG_LEVEL'] ?? 'info';

export const logger = pino({ level });

export default logger;
