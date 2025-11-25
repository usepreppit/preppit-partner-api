import { inject, injectable } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { TransactionsService } from './transactions.service';
import { Logger } from '../../startup/logger';
import { ApiResponse } from '../../helpers/response.helper';

@injectable()
export class TransactionsController {
    constructor(
        @inject(TransactionsService) private readonly transactionService: TransactionsService,
        @inject(Logger) private readonly logger: Logger
    ) {}

    async GetPaymentHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id?.toString() as string;
            try {
                const payment_history = await this.transactionService.GetPaymentHistory(user_id);
                ApiResponse.ok(payment_history, 'Payment history fetched successfully').send(res);
            } catch (error) {
                this.logger.error('Error fetching payment history', error);
                next(error);
            };
        } catch (error) {
            next(error);
        }
    }

    // async GetUserCards(req: Request, res: Response, next: NextFunction): Promise<void> {
    //     try {
    //         const user_id = req.curr_user?._id?.toString() as string;
    //         try {
    //             const user_cards = await this.transactionService.GetUserCards(user_id); 
    //             ApiResponse.ok(user_cards, 'User cards fetched successfully').send(res);
    //         } catch (error) {
    //             this.logger.error('Error fetching user cards', error);
    //             next(error);
    //         };
    //     } catch (error) {
    //         next(error);    
    //     }
    // }
    

    // async GetClientSecret(req: Request, res: Response, next: NextFunction): Promise<void> {
    //     try {
    //         const user_id = req.curr_user?._id?.toString() as string;
    //         try {
    //             const payment_url = await this.transactionService.GetClientSecret(user_id);
    //             ApiResponse.ok(payment_url, 'Client Secret fetched successfully').send(res);
    //         } catch (error) {
    //             this.logger.error('Error fetching payment url', error);
    //             next(error);
    //         };
    //     } catch (error) {
    //         next(error);
    //     }
    // }

    // async SaveCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    //     try {
    //         const user_id = req.curr_user?._id?.toString() as string;
    //         const payment_channel = req.params.payment_channel as string;
    //         // const { payment_method } = req.body; 
    //         //get user details from the db
    //         try {
    //             const save_card = await this.transactionService.SaveCard(user_id, payment_channel, req.body);
    //             ApiResponse.ok(save_card, 'Card saved successfully').send(res);
    //         } catch (error) {
    //             this.logger.error('Error Saving Card', error);
    //             next(error);
    //         };
    //     } catch (error) {
    //         next(error);
    //     }
    // }

    // async GetPaystackAuthUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    //     try {
    //         const user_id = req.curr_user?._id?.toString() as string;
    //         try {
    //             const paystack_auth_url = await this.transactionService.GetPaystackAuthUrl(user_id);
    //             ApiResponse.ok(paystack_auth_url, 'Paystack Authorization URL fetched successfully').send(res);
    //         } catch (error) {
    //             this.logger.error('Error fetching Paystack Authorization URL', error);
    //             next(error);
    //         };
    //     } catch (error) {
    //         next(error);
    //     }
    // }

    // async FundWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    //     try {
    //         const user_id = req.curr_user?._id?.toString() as string;
    //         const { amount, payment_method } = req.body; 
    //         //get user details from the db
    //         try {
    //             const fund_wallet = await this.transactionService.FundWallet(user_id, payment_method, amount);
    //             ApiResponse.ok(fund_wallet, 'Wallet funded successfully').send(res);
    //         } catch (error) {
    //             this.logger.error('Error funding Wallet', error);
    //             next(error);
    //         };
    //     } catch (error) {
    //         next(error);
    //     }
    // }

}