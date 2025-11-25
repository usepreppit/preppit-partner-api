import express from 'express';
const app = express();
import dotenv from 'dotenv';
dotenv.config();
import { json } from 'body-parser';

import appSetup from './startup/init';
import securitySetup from './startup/security';
import fileUpload  from 'express-fileupload';
import routerSetup from './startup/router';
import { errorHandler } from './middlewares/error.middleware';
import { NotFoundError } from './helpers/error.helper';


appSetup(app);
securitySetup(app, express);
const router = routerSetup();
app.use(fileUpload( { useTempFiles: true, tempFileDir: '/tmp/' } ));
app.use(json({ limit: '1mb' }));
app.use('/api', router);

app.use((_req, _res, next) => {
    next(new NotFoundError('Endpoint'));
});

app.use(errorHandler);

export default app;