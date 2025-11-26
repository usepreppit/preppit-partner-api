import { inject, injectable } from 'inversify';
import { Logger } from './../../startup/logger';
import { ApiError, ValidationError } from '../../helpers/error.helper';
import { UserRepository } from './models/user.repository';
import { AdminRepository } from './models/admin.repository';
import { PartnerRepository } from './models/partner.repository';


@injectable()
export class UserService {
    constructor(
		@inject(Logger) private readonly logger: Logger,
        @inject(UserRepository) private readonly userRepository: UserRepository,
        @inject(AdminRepository) private readonly adminRepository: AdminRepository,
        @inject(PartnerRepository) private readonly partnerRepository: PartnerRepository,
    ) {}

    async GetMe(user_id: string, account_type?: 'admin' | 'partner'): Promise<any> {
		try {
			this.logger.info('Getting user profile');
			
			// Handle Admin and Partner accounts (no subscriptions)
			if (account_type === 'admin') {
				const admin = await this.adminRepository.findById(user_id);
				if (!admin) {
					throw new ValidationError("Invalid admin");
				}
				return {
					...admin,
					account_type: 'admin'
				};
			} else if (account_type === 'partner') {
				const partner = await this.partnerRepository.findById(user_id);
				if (!partner) {
					throw new ValidationError("Invalid partner");
				}
				
				// Include onboarding status for partners
				const onboardingStatus = this.checkPartnerOnboardingStatus(partner);
				
				return {
					...partner,
					account_type: 'partner',
					onboarding_status: {
						is_completed: partner.is_onboarding_completed || false,
						completed_at: partner.onboarding_completed_at,
						missing_fields: onboardingStatus.missing_fields,
						completion_percentage: onboardingStatus.completion_percentage
					}
				};
			} 
		} catch (error) {
			this.logger.error(`Error Getting User Profile: ${error}`);
			throw new ApiError(400, 'Error Getting User Profile', error);
		}
	}

	// Helper method to check partner onboarding status
	private checkPartnerOnboardingStatus(partner: any) {
		const requiredFields = [
			'organization_name',
			'contact_person_name',
			'contact_email',
			'contact_phone',
			'country',
			'timezone',
			'preferred_currency',
			'exam_types'
		];

		const missing_fields: string[] = [];
		
		requiredFields.forEach(field => {
			if (!partner[field] || (Array.isArray(partner[field]) && partner[field].length === 0)) {
				missing_fields.push(field);
			}
		});

		const completion_percentage = Math.round(
			((requiredFields.length - missing_fields.length) / requiredFields.length) * 100
		);

		return {
			missing_fields,
			completion_percentage
		};
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