import { Express } from 'express';
import mongooseConnect from '../databases/mongodb/mongodb';
import { container } from './di/container' // Ensure this path is correct or update it to the correct path
import { Logger } from './logger';
import { scheduleJobs } from './agenda';

const appSetup = async (app: Express) => {
    try {
      await Promise.all([
          mongooseConnect(),
      ]);

      const APP_PORT = process.env.NODE_ENV == "production" ? Number(process.env.NODE_PROD_PORT) : Number(process.env.APP_PORT) || 3400;

      app.listen(APP_PORT, () => {
          console.log(`Server started on port ${APP_PORT}`);
          scheduleJobs().catch(console.error);
      });

    } catch (error: unknown) {
        console.log('Unable to start the app!');
        const logger = container.get<Logger>(Logger);
        logger.error('Unable to start the app!', error);
    }
};

export default appSetup;