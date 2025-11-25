import { injectable } from 'inversify';
import winston from 'winston';
import 'winston-mongodb';
import mongoose from 'mongoose';

export interface ILogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  activity_log(userId: string | null, action: string, category: string, description: string, details?: any): Promise<void>;
}

@injectable()
export class Logger implements ILogger {
    private logger: winston.Logger;

    constructor() {
      this.logger = winston.createLogger({
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [
          new winston.transports.Console(),
          new winston.transports.File({ filename: 'logs/combined.log' })
        ]
      });
    }

    debug(message: string, meta?: any) {
      this.logger.debug(message, meta);
    }

    info(message: string, meta?: any) {
      this.logger.info(message, meta);
    }

    warn(message: string, meta?: any) {
      this.logger.warn(message, meta);
    }

    error(message: string, meta?: any) {
      this.logger.error(message, meta);
    }

    async activity_log(userId: string, action: string | null, category: string, description: string, details?: any): Promise<void> {
        const db = mongoose.connection;
        const logEntry = {
            userId: userId ? new mongoose.Types.ObjectId(userId) : null,
            category,
            description,
            action,
            details,
            createdAt: new Date()
        };
        try {
            await db.collection('useractivitylogs').insertOne(logEntry);
            this.logger.info('Activity log entry created', logEntry);
        } catch (error) {
            this.logger.error('Failed to create activity log entry', { error, logEntry });
        }
    }
}