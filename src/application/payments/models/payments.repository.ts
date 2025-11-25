import { inject, injectable } from 'inversify';
import mongoose, { Model } from 'mongoose';
import { IPaymentMethod } from './payment_methods.models';
import { IPaymentPlans } from './payment_plans.model';
import { IPayments } from './payments.models';
import { ISubscriptions } from '../../subscriptions/models/subscriptions.model';


@injectable()
export class PaymentsRepository {
    constructor(
        @inject('PaymentMethodModel') private paymentMethodModel: Model<IPaymentMethod>,
        @inject('PaymentPlansModel') private paymentPlansModel: Model<IPaymentPlans>,
        @inject('PaymentsModel') private paymentsModel: Model<IPayments>,
        @inject('SubscriptionsModel') private subscriptionsModel: Model<ISubscriptions>,
    ) {}

    async CreatePaymentProfile(user_id: string, customer_id: string, customer_object: object, payment_channel: string = 'stripe', metadata: object = {}): Promise<any> {
        try {
            //Create a new payment profile for this user
            const payment_profile = await this.paymentMethodModel.create({
                user_id: user_id,
                payment_channel: payment_channel,
                payment_customer_id: customer_id,
                status: 'active',
                user_details: user_id,
                payment_customer_details: customer_object,
                payment_method_metadata: metadata,
                payment_currency: payment_channel === 'paystack' ? 'NGN' : 'USD', // Default currency based on payment channel
            });
            return payment_profile;
        } catch (error) {
            throw error;
        }
    }

    async UpdatePaymentProfile(filter: object, customer_object: object): Promise<IPaymentMethod | null> {
        try {
            //Update the payment profile for this user
            const updated_profile = await this.paymentMethodModel.findOneAndUpdate(
                filter,
                { payment_customer_details: customer_object, updatedAt: new Date() },
                { new: true }
            );
            return updated_profile;
        } catch (error) {
            throw error;
        }
    }

    async UpdatePaymentProfileByPaymentMethod(payment_method_id: string, payment_method: string): Promise<IPaymentMethod | null> {
        try {
            //Update the payment profile for this user by payment method
            const payment_method_object_id = new mongoose.Types.ObjectId(payment_method_id);
            const updated_profile = await this.paymentMethodModel.findOneAndUpdate(
                { _id: payment_method_object_id },
                { $set: { 'payment_customer_details.invoice_settings.default_payment_method': payment_method }, updatedAt: new Date() },
                { new: true }
            );
            return updated_profile;
        } catch (error) {
            throw error;
        }
    }

    async GetSubscriptionPlans(): Promise<IPaymentPlans[]> {
        try {
            const plans = await this.paymentPlansModel.find().lean();
            return plans;
        } catch (error) {
            throw error;
        }
    }

    async GetSingleSubscriptionPlan(plan_id: string): Promise<IPaymentPlans | null> {
        try {
            const plan = await this.paymentPlansModel.findById(plan_id).lean();
            return plan;
        } catch (error) {
            throw error;
        }
    }

    async GetUserPaymentHistory(user_id: string): Promise<IPayments[]> {
        try {
            //get user payment history
            const payment_history = await this.paymentsModel.find({ user_id: user_id }).lean();
            return payment_history;
        } catch (error) {
            throw error;
        }
    }

    async RecordPaymentTransaction(payment_details: object): Promise<IPayments> {
        try {
            //record a payment transaction
            const payment_transaction = await this.paymentsModel.create(payment_details);
            return payment_transaction;
        } catch (error) {
            throw error;
        }
    }

    async CreateUserSubscriptionRecord(user_id: string, plan_id: string, payment_id: string, subscription_type: string, subscription_end_date: Date | null): Promise<any> {

        try {
            //Create a new user subscription record
            const subscription_data = {
                user_id: new mongoose.Types.ObjectId(user_id),
                subscription_plan_id: new mongoose.Types.ObjectId(plan_id),
                subscription_payment_id: new mongoose.Types.ObjectId(payment_id),
                subscription_type: subscription_type,
            };

            if (subscription_end_date) {
                (subscription_data as any).subscription_end_date = subscription_end_date;
            }
            const subscription_record = await this.subscriptionsModel.create(subscription_data);
            return subscription_record;
        } catch (error) {
            throw error;
        }
    }

    async createSubscriptionPlan(plan_details: object): Promise<IPaymentPlans> {
        try {
            //create a new subscription plan
            const new_plan = await this.paymentPlansModel.create(plan_details);
            return new_plan;
        } catch (error) {
            throw error;
        }
    }
}