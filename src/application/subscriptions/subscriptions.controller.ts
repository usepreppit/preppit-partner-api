import { inject, injectable } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from './subscriptions.service';
import { Logger } from '../../startup/logger';
import { ApiResponse } from '../../helpers/response.helper';

@injectable()
export class SubscriptionsController {
    constructor(
        @inject(SubscriptionService) private readonly subscriptionService: SubscriptionService,
        @inject(Logger) private readonly logger: Logger
    ) {}

    async GetMySubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id?.toString() as string;
            try {
                const curr_user = await this.subscriptionService.GetUserSubscriptions(user_id);

                ApiResponse.ok(curr_user, 'user fetched successfully').send(res);
            } catch (error) {
                this.logger.error('Error fetching logged in user', error);
                next(error);
            };

        } catch (error) {
            next(error);
        }
    }
}