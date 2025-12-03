import { inject, injectable } from 'inversify';
import { Model } from 'mongoose';
import { ISubscriptions } from './subscriptions.model';
import mongoose from 'mongoose';

@injectable()
export class SubscriptionRepository {
    constructor(
        @inject('SubscriptionsModel') private subscriptionsModel: Model<ISubscriptions>,
    ) {}

    async GetUserSubscriptions(user_id: string): Promise<ISubscriptions[]> {
        return await this.subscriptionsModel.find({ user_id }).populate('subscription_plan_id').populate('subscription_payment_id').lean();
    }

    async createPartnerSubscription(data: {
        user_id: string;
        partner_id: string;
        batch_id?: string;
        seat_subscription_id?: string;
        subscription_start_date: Date;
        subscription_end_date: Date;
        daily_sessions?: number;
    }): Promise<ISubscriptions> {
        const subscription = await this.subscriptionsModel.create({
            user_id: new mongoose.Types.ObjectId(data.user_id),
            partner_id: new mongoose.Types.ObjectId(data.partner_id),
            batch_id: data.batch_id ? new mongoose.Types.ObjectId(data.batch_id) : undefined,
            seat_subscription_id: data.seat_subscription_id ? new mongoose.Types.ObjectId(data.seat_subscription_id) : undefined,
            subscription_type: 'partner',
            subscription_start_date: data.subscription_start_date,
            subscription_end_date: data.subscription_end_date,
            is_active: true,
            daily_sessions: data.daily_sessions || 0
        });

        return subscription.toObject();
    }

    async createBulkPartnerSubscriptions(
        subscriptionsData: Array<{
            user_id: string;
            partner_id: string;
            batch_id?: string;
            seat_subscription_id?: string;
            subscription_start_date: Date;
            subscription_end_date: Date;
            daily_sessions?: number;
        }>
    ): Promise<ISubscriptions[]> {
        const subscriptions = await this.subscriptionsModel.insertMany(
            subscriptionsData.map(data => ({
                user_id: new mongoose.Types.ObjectId(data.user_id),
                partner_id: new mongoose.Types.ObjectId(data.partner_id),
                batch_id: data.batch_id ? new mongoose.Types.ObjectId(data.batch_id) : undefined,
                seat_subscription_id: data.seat_subscription_id ? new mongoose.Types.ObjectId(data.seat_subscription_id) : undefined,
                subscription_type: 'partner',
                subscription_start_date: data.subscription_start_date,
                subscription_end_date: data.subscription_end_date,
                is_active: true,
                daily_sessions: data.daily_sessions || 0
            })),
            { ordered: false }
        );

        return subscriptions.map(sub => sub.toObject ? sub.toObject() : sub);
    }

}