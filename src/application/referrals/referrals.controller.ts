import { inject, injectable } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { ReferralsService } from './referrals.service';
import { Logger } from '../../startup/logger';
import { ApiResponse } from '../../helpers/response.helper';

@injectable()
export class ReferralsController {
    constructor(
        @inject(ReferralsService) private readonly referralsService: ReferralsService,
        @inject(Logger) private readonly logger: Logger
    ) {}

    async GetReferrals(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id?.toString() as string;
            const curr_user_referral_code = req.curr_user?.referral_code as string;
            try {
                const referrals = await this.referralsService.GetReferrals(user_id, curr_user_referral_code);
                ApiResponse.ok(referrals, 'Successfully fetched Referrals').send(res);
            } catch (error) {
                this.logger.error('Error fetching referrals', error);
                next(error);
            };
        } catch (error) {
            next(error);
        }
    }

    async GetReferralStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id?.toString() as string;
            try {
                const referral_stats = await this.referralsService.GetReferralStats(user_id);
                ApiResponse.ok(referral_stats, 'Successfully fetched Referral Stats').send(res);
            } catch (error) {
                this.logger.error('Error fetching referral stats', error);
                next(error);
            };
        } catch (error) {
            next(error);
        }
    }
}