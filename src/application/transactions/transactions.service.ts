import { inject, injectable } from 'inversify';
import { Logger } from './../../startup/logger';
import { ApiError } from '../../helpers/error.helper';
import { TransactionRepository } from './models/transactions.repository';

interface GetTransactionsParams {
	page?: number;
	limit?: number;
	transaction_type?: 'credit' | 'debit';
	payment_status?: string;
	start_date?: string;
	end_date?: string;
	search?: string;
}

@injectable()
export class TransactionsService {
    constructor(
		@inject(Logger) private readonly logger: Logger,
		@inject(TransactionRepository) private readonly transactionRepository: TransactionRepository,
    ) {}

	async GetPaymentHistory(user_id: string): Promise<any> {
		try {
			//get user payment profile
			const user_payment_profile = await this.transactionRepository.getPaymentHistory(user_id);
			return user_payment_profile;
		} catch (error) {
			this.logger.error(`Error Getting Payment History: ${error}`);
			throw new ApiError(400, 'Error Getting Payment History', error);
		}
	}

	async GetPartnerTransactions(
		partner_id: string,
		params: GetTransactionsParams
	): Promise<any> {
		try {
			const {
				page = 1,
				limit = 20,
				transaction_type,
				payment_status,
				start_date,
				end_date,
				search
			} = params;

			// Validate pagination params
			const validatedPage = Math.max(1, Number(page));
			const validatedLimit = Math.min(100, Math.max(1, Number(limit))); // Max 100 per page

			// Parse dates if provided
			let parsedStartDate: Date | undefined;
			let parsedEndDate: Date | undefined;

			if (start_date) {
				parsedStartDate = new Date(start_date);
				if (isNaN(parsedStartDate.getTime())) {
					throw new ApiError(400, 'Invalid start_date format');
				}
			}

			if (end_date) {
				parsedEndDate = new Date(end_date);
				if (isNaN(parsedEndDate.getTime())) {
					throw new ApiError(400, 'Invalid end_date format');
				}
				// Set to end of day
				parsedEndDate.setHours(23, 59, 59, 999);
			}

			const result = await this.transactionRepository.getTransactionsWithPagination(
				partner_id,
				validatedPage,
				validatedLimit,
				transaction_type,
				payment_status,
				parsedStartDate,
				parsedEndDate,
				search
			);

			return result;
		} catch (error) {
			this.logger.error(`Error Getting Partner Transactions: ${error}`);
			throw error instanceof ApiError ? error : new ApiError(400, 'Error Getting Partner Transactions', error);
		}
	}

	async GetTransactionById(partner_id: string, transaction_id: string): Promise<any> {
		try {
			const transaction = await this.transactionRepository.getTransactionById(
				partner_id,
				transaction_id
			);

			if (!transaction) {
				throw new ApiError(404, 'Transaction not found');
			}

			return transaction;
		} catch (error) {
			this.logger.error(`Error Getting Transaction Details: ${error}`);
			throw error instanceof ApiError ? error : new ApiError(400, 'Error Getting Transaction Details', error);
		}
	}

	async GetTransactionStats(partner_id: string): Promise<any> {
		try {
			const stats = await this.transactionRepository.getTransactionStats(partner_id);
			return stats;
		} catch (error) {
			this.logger.error(`Error Getting Transaction Stats: ${error}`);
			throw new ApiError(400, 'Error Getting Transaction Stats', error);
		}
	}
}
