import { inject, injectable } from 'inversify';
import { Model } from 'mongoose';

@injectable()
export class TransactionRepository {
    constructor(
        @inject('TransactionsModel') private transactionsModel: Model<any>,
    ) {}

    async getPaymentHistory(user_id: string): Promise<any> {
        try {
            //Get the Payments Cards of this user
            const user_payment_profile = await this.transactionsModel.find({ user_id: user_id, description: { $ne: "Cost of call" } }).sort({ createdAt: -1 });
            return user_payment_profile;
        } catch (error) {
            throw error;
        }
    }

    // async CreateUserPaymentProfile(user_id: string, customer_id: string, customer_object: object, payment_channel: string = 'stripe', metadata: object = {}): Promise<any> {
    //     try {
    //         //Create a new payment profile for this user
    //         const payment_profile = await this.paymentMethodModel.create({
    //             user_id: user_id,
    //             payment_channel: payment_channel,
    //             payment_customer_id: customer_id,
    //             status: 'active',
    //             user_details: user_id,
    //             payment_customer_details: customer_object,
    //             payment_method_metadata: metadata,
    //             payment_currency: payment_channel === 'paystack' ? 'NGN' : 'USD', // Default currency based on payment channel
    //         });
    //         return payment_profile;
    //     } catch (error) {
    //         throw error;
    //     }
    // }
}