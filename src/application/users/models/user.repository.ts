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
        const user = await this.userModel.findById(id).select(select_options).lean();
        
        // Try to populate relationships if they exist, but don't fail if they don't
        if (user) {
            try {
                const populatedUser = await this.userModel
                    .findById(id)
                    .select(select_options)
                    .populate({ path: 'exam_enrollments', options: { strictPopulate: false } })
                    .populate({ 
                        path: 'subscriptions', 
                        populate: { path: "subscription_plan_id" },
                        options: { strictPopulate: false }
                    })
                    .lean();
                return populatedUser || user;
            } catch (error) {
                // If populate fails, return user without populated fields
                console.log('Warning: Could not populate user relationships:', error);
                return user;
            }
        }
        
        return user;
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
        const user = await this.userModel.findById(id).lean();
        
        if (user) {
            try {
                const populatedUser = await this.userModel
                    .findById(id)
                    .populate({ path: 'payments', options: { strictPopulate: false } })
                    .populate({ path: 'exam_enrollments', options: { strictPopulate: false } })
                    .lean();
                return populatedUser || user;
            } catch (error) {
                // If populate fails, return user without populated fields
                console.log('Warning: Could not populate full user details:', error);
                return user;
            }
        }
        
        return user;
    }
    
}