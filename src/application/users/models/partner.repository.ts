import { inject, injectable } from 'inversify';
import { Model } from 'mongoose';
import { IPartner, PartnerCreateDTO } from '../types/partner.types';

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
            ? await this.partnerModel.findOne({ email }).select("+password") 
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
        return await this.partnerModel.findById(id).lean();
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
}
