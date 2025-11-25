import { inject, injectable } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { PaymentsService } from './payments.service';
import { Logger } from '../../startup/logger';
import { ApiResponse } from '../../helpers/response.helper';

@injectable()
export class PaymentsController {
    constructor(
        @inject(PaymentsService) private readonly paymentService: PaymentsService,
        @inject(Logger) private readonly logger: Logger
    ) {}

    async GetUserCards(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id?.toString() as string;
            try {
                const user_cards = await this.paymentService.GetUserCards(user_id); 
                ApiResponse.ok(user_cards, 'User cards fetched successfully').send(res);
            } catch (error) {
                this.logger.error('Error fetching user cards', error);
                next(error);
            };
        } catch (error) {
            next(error);    
        }
    }
    

    async GetClientSecret(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id?.toString() as string;
            try {
                const payment_url = await this.paymentService.GetClientSecret(user_id);
                ApiResponse.ok(payment_url, 'Client Secret fetched successfully').send(res);
            } catch (error) {
                this.logger.error('Error fetching payment url', error);
                next(error);
            };
        } catch (error) {
            next(error);
        }
    }

    async SaveCard(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id?.toString() as string;
            //get user details from the db
            try {
                const save_card = await this.paymentService.SaveCard(user_id, req.body);
                ApiResponse.ok(save_card, 'Card saved successfully').send(res);
            } catch (error) {
                this.logger.error('Error Saving Card', error);
                next(error);
            };
        } catch (error) {
            next(error);
        }
    }

    async GetSubscriptionPlans(_: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const plans = await this.paymentService.GetSubscriptionPlans();
            ApiResponse.ok(plans, 'Subscription plans fetched successfully').send(res);
        } catch (error) {
            this.logger.error('Error fetching subscription plans', error);
            next(error);
        }
    }

    async GetSingleSubscriptionPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const plan_id = req.params.id as string;
            const plans = await this.paymentService.GetSingleSubscriptionPlan(plan_id);
            ApiResponse.ok(plans, 'Subscription plan fetched successfully').send(res);
        } catch (error) {
            this.logger.error('Error fetching subscription plan', error);
            next(error);
        }
    }

    async CreateSubscriptionPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const plan_data = req.body;
            const created_plan = await this.paymentService.CreateSubscriptionPlans(plan_data);
            ApiResponse.created(created_plan, 'Subscription plan created successfully').send(res);  
        } catch (error) {
            this.logger.error('Error creating subscription plan', error);
            next(error);
        }
    }

    async GetUserPaymentHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id?.toString() as string;
            const payment_history = await this.paymentService.GetUserPaymentHistory(user_id);
            ApiResponse.ok(payment_history, 'Payment history fetched successfully').send(res);
        } catch (error) {
            this.logger.error('Error fetching payment history', error);
            next(error);
        }
    }
                
    async PurchasePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id?.toString() as string;
            const { payment_method_id, plan_id, payment_type } = req.body; 
            //get user details from the db
            try {
                const purchase_plan_minutes = await this.paymentService.PurchasePlan(user_id, payment_method_id, plan_id, payment_type);
                ApiResponse.ok(purchase_plan_minutes, 'Purchase successfully').send(res);
            } catch (error) {
                this.logger.error('Error funding Wallet', error);
                next(error);
            };
        } catch (error) {
            next(error);
        }
    }

    // async PurchasePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    //     try {
    //         const user_id = req.curr_user?._id?.toString() as string;
    //         const { amount, save_card } = req.body; 
    //         //get user details from the db
    //         try {
    //             const fund_wallet = await this.paymentService.PurchasePlan(user_id, amount, (save_card == "true") ? true : false);
    //             ApiResponse.ok(fund_wallet, 'Purchase successfully').send(res);
    //         } catch (error) {
    //             this.logger.error('Error funding Wallet', error);
    //             next(error);
    //         };
    //     } catch (error) {
    //         next(error);
    //     }
    // }

}