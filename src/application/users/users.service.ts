import { inject, injectable } from 'inversify';
import { Logger } from './../../startup/logger';
import { ApiError } from '../../helpers/error.helper';
import { IUser } from './types/user.types';
import { UserRepository } from './models/user.repository';


@injectable()
export class UserService {
    constructor(
		@inject(Logger) private readonly logger: Logger,
        @inject(UserRepository) private readonly userRepository: UserRepository,
    ) {}

    async GetMe(user_id:string): Promise<IUser | null> {
		try {
			//get user profile
            this.logger.info('Getting users profile');
            const user = await this.userRepository.findById(user_id);

			const parsedSubscriptions = await this.ParseUserSubscriptions(user);
			user.parsedSubscriptions = parsedSubscriptions;

			delete user.subscriptions;

            return user;
		} catch (error) {
			this.logger.error(`Error Getting User Profile: ${error}`);
			throw new ApiError(400, 'Error Getting User Profile', error);
		}
	}

	async ParseUserSubscriptions(user: any) {
		try {
			//parse user subscriptions
			this.logger.info('Parsing user subscriptions');
			const now = new Date();

			// Find one active subscription (base subscription only)
			const activeSub = (user.subscriptions || []).find(
				(sub: any) =>
				sub.subscription_type === "subscription" &&
				new Date(sub.subscription_end_date) > now
			);

			if (!activeSub) {
				if (user.user_balance_seconds && user.user_balance_seconds > 0) {
					//Update the user balance to zero since there is no active subscription
					await this.userRepository.updateById(user._id, { user_balance_seconds: 0 });
				}
				return { active: false, totalMinutes: 0 };
			}

			// Find topups tied to the same window
			const topups = (user.subscriptions || []).filter(
				(sub: any) =>
				sub.subscription_type === "topup" &&
				new Date(sub.subscription_start_date) >= new Date(activeSub.subscription_start_date) &&
				new Date(sub.subscription_end_date) <= new Date(activeSub.subscription_end_date)
			);

			// Sum minutes from subscription plan + topups
			const totalSeconds = [activeSub, ...topups].reduce((sum, sub: any) => {
				const planSeconds = sub.subscription_plan_id?.plan_seconds || 0;
				return sum + planSeconds;
			}, 0);

			return {
				active: true,
				subscription: activeSub,
				totalSeconds,
			};
		} catch (error) {
			this.logger.error(`Error Parsing User Subscriptions: ${error}`);
			throw new ApiError(400, 'Error Parsing User Subscriptions', error);
		}
	}
}