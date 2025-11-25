import { inject, injectable } from 'inversify';
import mongoose, { Model } from 'mongoose';

@injectable()
export class ReferralsRepository {
    constructor(
        @inject('ReferralsModel') private referralsModel: Model<any>,
    ) {}

    async getUserReferrals(user_id: string): Promise<any> {
        try {
            //Get the Referrals
            const user_referrals = await this.referralsModel.find({ user_id: new mongoose.Types.ObjectId(user_id) }).populate('').sort({ createdAt: -1 });
            return user_referrals;
        } catch (error) {
            throw error;
        }
    }

    async getUserReferralStats(user_id: string): Promise<any> {
        try {
            //Get the Referral States of this user
            const get_referral_stats = await this.referralsModel.find({ user_id: user_id }).sort({ createdAt: -1 });
            return get_referral_stats;
        } catch (error) {
            throw error;
        }
    }

    async createNewReferralRecord(user_id: string, referrer_id: string) {
        try {
            const create_referral = await this.referralsModel.create({ user_id: new mongoose.Types.ObjectId(user_id), referrer_id: new mongoose.Types.ObjectId(referrer_id) });
            return create_referral;
        } catch (error) {
            throw error;
        }
    }
}