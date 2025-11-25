import { injectable, inject } from 'inversify';
import { Model } from 'mongoose';
import { IUserActivityLog } from './models/activity_logs.model';

@injectable()
export class LoggerService {
    constructor(
        @inject('UserActivityLogModel') private logModel: Model<IUserActivityLog>
    ) {}

    async log(userId: string, action: string, details?: any) {
        await this.logModel.create({ userId, action, details });
    }
}