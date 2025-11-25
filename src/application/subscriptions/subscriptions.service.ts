import { inject, injectable } from 'inversify';
import { Logger } from './../../startup/logger';
import { ApiError } from '../../helpers/error.helper';
import { ISubscriptions } from './models/subscriptions.model';
import { SubscriptionRepository } from './models/subscriptions.repository';


@injectable()
export class SubscriptionService {
    constructor(
        @inject(Logger) private readonly logger: Logger,
        @inject(SubscriptionRepository) private readonly subscriptionRepository: SubscriptionRepository,
    ) {}

    async GetUserSubscriptions(user_id:string): Promise<ISubscriptions[] | null> {
        try {
            //get user subscriptiosn
            this.logger.info('Getting users subscriptions');
            const subscriptions = await this.subscriptionRepository.GetUserSubscriptions(user_id);

            return subscriptions;
        } catch (error) {
            this.logger.error(`Error Getting User subscriptions: ${error}`);
            throw new ApiError(400, 'Error Getting User subscriptions', error);
        }
    }
}