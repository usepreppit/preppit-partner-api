import { inject, injectable } from 'inversify';
import { Model } from 'mongoose';
import { IAdmin, AdminCreateDTO } from '../types/admin.types';

@injectable()
export class AdminRepository {
    constructor(
        @inject('AdminModel') private adminModel: Model<IAdmin>,
    ) {}

    async create(adminData: AdminCreateDTO): Promise<IAdmin> {
        console.log('Creating admin with data:', adminData);
        return await this.adminModel.create(adminData);
    }

    async findByEmail(email: string, withPassword = false): Promise<IAdmin | null> {
        const find_admin = (withPassword) 
            ? await this.adminModel.findOne({ email }).select("+password") 
            : await this.adminModel.findOne({ email }).select("-password");
        return find_admin;
    }

    async findById(id: string, select_options: string = ""): Promise<IAdmin | null | any> {
        // return only the items that are in the filter
        select_options = select_options ? select_options : "-password"; 
        return await this.adminModel.findById(id).select(select_options).lean();
    }

    async updateById(id: string, updateData: Partial<IAdmin>): Promise<IAdmin | null> {
        return await this.adminModel.findByIdAndUpdate(id, updateData, { new: true, projection: { _id: 1} });
    }

    async findSingleAdminByFilter(filter: object): Promise<IAdmin | null> {
        const find_admin = await this.adminModel.findOne(filter);
        return find_admin;
    }

    async getFullAdminDetails(id: string): Promise<IAdmin | null | any> {
        return await this.adminModel.findById(id).lean();
    }
}
