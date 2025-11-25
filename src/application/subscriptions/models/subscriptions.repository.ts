import { inject, injectable } from 'inversify';
import { Model } from 'mongoose';
import { ISubscriptions } from './subscriptions.model';

@injectable()
export class SubscriptionRepository {
    constructor(
        @inject('SubscriptionsModel') private userModel: Model<ISubscriptions>,
    ) {}

    async GetUserSubscriptions(user_id: string): Promise<ISubscriptions[]> {
        return await this.userModel.find({ user_id }).populate('subscription_plan_id').populate('subscription_payment_id').lean();
    }

}