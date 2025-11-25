import { inject, injectable } from 'inversify';
import { Model } from 'mongoose';
import { IUser, UserCreateDTO } from '../types/user.types';

@injectable()
export class UserRepository {
    constructor(
        @inject('UserModel') private userModel: Model<IUser>,
    ) {}

    async create(userData: UserCreateDTO): Promise<IUser> {
        console.log('Creating user with data:', userData);
        return await this.userModel.create(userData);
        // return userData; // For testing purposes, return the user data directly
    }

    async findByEmail(email: string, withPassword = false): Promise<IUser | null> {
        const find_user = (withPassword) ? await this.userModel.findOne({ email }).select("+password") : await this.userModel.findOne({ email }).select("-password");
        return find_user;
    }

    async findById(id: string, select_options: string = ""): Promise<IUser | null | any > {
        // return only the items that are in the filter
        select_options = select_options ? select_options : "-password"; 
        return await this.userModel.findById(id).select(select_options).populate('exam_enrollments').populate({ 'path': 'subscriptions', populate: { path: "subscription_plan_id" }}).lean();
    }

    async updateById(id: string, updateData: Partial<IUser>): Promise<IUser | null> {
        return await this.userModel.findByIdAndUpdate(id, updateData, { new: true, projection: { _id: 1} });
    }

    async addUserPlanMinutes(id: string, additional_minutes: number, is_seconds: boolean = false): Promise<IUser | null> {
        let additional_seconds = additional_minutes * 60;
        if (is_seconds) {
            additional_seconds = additional_minutes;
        }
        
        
        return await this.userModel.findByIdAndUpdate(id, { $inc: { user_balance_seconds: additional_seconds } }, { new: true, projection: { _id: 1, user_balance_seconds: 1 } });
    }

    async findSingleUserByFilter(filter: object): Promise<IUser | null> {
        const find_user = await this.userModel.findOne(filter);
        return find_user;
    }

    async getFullUserDetails(id: string): Promise<IUser | null | any> {
        return await this.userModel.findById(id).populate('payments').populate('exam_enrollments').lean();
    }
    
}