import { inject, injectable } from 'inversify';
import { Logger } from '../../startup/logger';
import { ApiError } from '../../helpers/error.helper';
import { ReferralsRepository } from './models/referrals.repository';
import { UserRepository } from '../users/models/user.repository';


@injectable()
export class ReferralsService {
    constructor(
		@inject(Logger) private readonly logger: Logger,
		@inject(ReferralsRepository) private readonly referralsRepository: ReferralsRepository,
		@inject(UserRepository) private readonly userRepository: UserRepository,

    ) {}

	async GetReferrals(user_id: string, user_referral_code: string): Promise<any> {
		try {
			//check if the user referral code is not null, if it is generate a code for the user
			if (!user_referral_code) {
				//generate a referral code
				const new_referral_code = `PPT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
				//update the user with the new referral code
				await this.userRepository.updateById(user_id, { referral_code: new_referral_code });
				user_referral_code = new_referral_code;
			}
			//get the user referrals
			const referrals = await this.referralsRepository.getUserReferrals(user_id);
			return referrals;
		} catch (error) {
			this.logger.error(`Error Getting Referrals: ${error}`);
			throw new ApiError(400, 'Error Getting Referrals', error);
		}
	}

	async GetReferralStats(user_id: string): Promise<any> {
		try {
			//get the user referral stats
			const referral_stats = await this.referralsRepository.getUserReferralStats(user_id);
			return referral_stats;
		} catch (error) {
			this.logger.error(`Error Getting Referral Stats: ${error}`);
			throw new ApiError(400, 'Error Getting Referral Stats', error);
		}
	}
}
