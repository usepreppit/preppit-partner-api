import cors from 'cors';
import { Express } from 'express';

const securitySetup = (app: Express, express: any) =>
  app
  .use(cors())
  .use(express.json({ limit: '1mb' }))

export default securitySetup;