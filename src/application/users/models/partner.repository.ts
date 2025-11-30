import { inject, injectable } from 'inversify';
import { Model } from 'mongoose';
import { IPartner, PartnerCreateDTO } from '../types/partner.types';
import { PaymentMethodModel } from '../../payments/models/payment_methods.models';

@injectable()
export class PartnerRepository {
    constructor(
        @inject('PartnerModel') private partnerModel: Model<IPartner>,
    ) {}

    async create(partnerData: PartnerCreateDTO): Promise<IPartner> {
        console.log('Creating partner with data:', partnerData);
        return await this.partnerModel.create(partnerData);
    }

    async findByEmail(email: string, withPassword = false): Promise<IPartner | null> {
        const find_partner = (withPassword) 
            ? await this.partnerModel.findOne({ email }).select("+password +verification_token +reset_token") 
            : await this.partnerModel.findOne({ email }).select("-password");
        return find_partner;
    }

    async findById(id: string, select_options: string = ""): Promise<IPartner | null | any> {
        // return only the items that are in the filter
        select_options = select_options ? select_options : "-password"; 
        return await this.partnerModel.findById(id).select(select_options).lean();
    }

    async updateById(id: string, updateData: Partial<IPartner>): Promise<IPartner | null> {
        return await this.partnerModel.findByIdAndUpdate(id, updateData, { new: true, projection: { _id: 1} });
    }

    async findSinglePartnerByFilter(filter: object): Promise<IPartner | null> {
        const find_partner = await this.partnerModel.findOne(filter);
        return find_partner;
    }

    async getFullPartnerDetails(id: string): Promise<IPartner | null | any> {
        const partner = await this.partnerModel.findById(id).lean();
        if (!partner) {
            return null;
        }
        
        // Fetch payment methods for this partner
        const payments = await PaymentMethodModel.find({ user_id: id }).lean();
        
        return {
            ...partner,
            payments: payments || []
        };
    }

    async markCandidateAdded(partner_id: string): Promise<void> {
        await this.partnerModel.findByIdAndUpdate(
            partner_id,
            {
                has_added_candidates: true,
                first_candidate_added_at: new Date()
            },
            { new: true }
        );
    }

    async markPaymentMethodSetup(partner_id: string): Promise<void> {
        await this.partnerModel.findByIdAndUpdate(
            partner_id,
            {
                payment_method_setup: true,
                payment_method_setup_at: new Date()
            },
            { new: true }
        );
    }

    async updateAutoRenewPreference(partner_id: string, auto_renew: boolean): Promise<void> {
        await this.partnerModel.findByIdAndUpdate(
            partner_id,
            {
                auto_renew_subscription: auto_renew
            },
            { new: true }
        );
    }
}
