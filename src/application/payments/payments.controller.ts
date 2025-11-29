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
            const account_type = req.account_type;
            //get user details from the db
            try {
                const save_card = await this.paymentService.SaveCard(user_id, req.body, "true", account_type);
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


    async GetPaymentMethods(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = req.curr_user?._id?.toString() as string;
            
            try {
                const paymentMethods = await this.paymentService.getPaymentMethods(partner_id);
                ApiResponse.ok(paymentMethods, 'Payment methods retrieved successfully').send(res);
            } catch (error) {
                this.logger.error('Error fetching payment methods', error);
                next(error);
            }
        } catch (error) {
            next(error);
        }
    }

    async GetPricing(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const candidate_count = parseInt(req.query.candidate_count as string);
            const months = parseInt(req.query.months as string);
            const batch_id = req.query.batch_id as string;
            const include_unpaid = req.query.include_unpaid === 'true';
            
            if (!candidate_count || !months) {
                ApiResponse.badRequest('candidate_count and months are required query parameters').send(res);
                return;
            }

            try {
                let unpaid_count = 0;
                
                // If include_unpaid is true and batch_id is provided, get unpaid candidates from that batch
                if (include_unpaid && batch_id) {
                    const partner_id = req.curr_user?._id?.toString() as string;
                    unpaid_count = await this.paymentService.getUnpaidCountInBatch(partner_id, batch_id);
                }
                
                // Calculate total candidates including unpaid ones from the batch
                const total_candidates = candidate_count + unpaid_count;
                const pricing = await this.paymentService.calculatePricing(total_candidates, months);
                
                // Add info about unpaid candidates in response
                const response = {
                    ...pricing,
                    new_candidates: candidate_count,
                    unpaid_candidates_in_batch: unpaid_count,
                    total_candidates: total_candidates
                };
                
                ApiResponse.ok(response, 'Pricing calculated successfully').send(res);
            } catch (error) {
                this.logger.error('Error calculating pricing', error);
                next(error);
            }
        } catch (error) {
            next(error);
        }
    }

    async ProcessPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = req.curr_user?._id?.toString() as string;
            const { candidate_count, months, payment_method_id, auto_renew, batch_id, include_unpaid } = req.body;

            if (!candidate_count || !months) {
                ApiResponse.badRequest('candidate_count and months are required').send(res);
                return;
            }

            try {
                let unpaid_count = 0;
                
                // If include_unpaid is true and batch_id is provided, get unpaid candidates from that batch
                if (include_unpaid && batch_id) {
                    unpaid_count = await this.paymentService.getUnpaidCountInBatch(partner_id, batch_id);
                }
                
                // Calculate total candidates including unpaid ones from the batch
                const total_candidates = candidate_count + unpaid_count;
                
                const payment = await this.paymentService.processPayment(
                    partner_id,
                    total_candidates,
                    months,
                    payment_method_id,
                    auto_renew || false,
                    batch_id,
                    unpaid_count
                );
                ApiResponse.ok(payment, 'Payment processed successfully').send(res);
            } catch (error) {
                this.logger.error('Error processing payment', error);
                next(error);
            }
        } catch (error) {
            next(error);
        }
    }

    async PurchaseSeats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = req.curr_user?._id?.toString() as string;
            const { seat_count, months, batch_id, payment_method_id, auto_renew } = req.body;

            if (!seat_count || !months || !batch_id || !payment_method_id) {
                ApiResponse.badRequest('seat_count, months, batch_id and payment_method_id are required').send(res);
                return;
            }

            try {
                const result = await this.paymentService.purchaseSeats(partner_id, seat_count, months, batch_id, payment_method_id, auto_renew || false);
                ApiResponse.created(result, 'Seats purchased successfully').send(res);
            } catch (error) {
                this.logger.error('Error purchasing seats', error);
                next(error);
            }
        } catch (error) {
            next(error);
        }
    }

}
