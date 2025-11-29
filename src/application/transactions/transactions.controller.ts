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

    async GetPartnerTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = req.curr_user?._id?.toString() as string;
            const {
                page,
                limit,
                transaction_type,
                payment_status,
                start_date,
                end_date,
                search
            } = req.query;

            const result = await this.transactionService.GetPartnerTransactions(partner_id, {
                page: page ? Number(page) : undefined,
                limit: limit ? Number(limit) : undefined,
                transaction_type: transaction_type as 'credit' | 'debit' | undefined,
                payment_status: payment_status as string | undefined,
                start_date: start_date as string | undefined,
                end_date: end_date as string | undefined,
                search: search as string | undefined
            });

            ApiResponse.ok(result, 'Transactions retrieved successfully').send(res);
        } catch (error) {
            this.logger.error('Error fetching partner transactions', error);
            next(error);
        }
    }

    async GetTransactionById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = req.curr_user?._id?.toString() as string;
            const { transaction_id } = req.params;

            if (!transaction_id) {
                throw new Error('Transaction ID is required');
            }

            const transaction = await this.transactionService.GetTransactionById(partner_id, transaction_id);

            ApiResponse.ok(transaction, 'Transaction details retrieved successfully').send(res);
        } catch (error) {
            this.logger.error('Error fetching transaction details', error);
            next(error);
        }
    }

    async GetTransactionStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = req.curr_user?._id?.toString() as string;

            const stats = await this.transactionService.GetTransactionStats(partner_id);

            ApiResponse.ok(stats, 'Transaction statistics retrieved successfully').send(res);
        } catch (error) {
            this.logger.error('Error fetching transaction stats', error);
            next(error);
        }
    }
}
