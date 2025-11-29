import { inject, injectable } from 'inversify';
import mongoose, { Model } from 'mongoose';
import { IPayments } from '../../payments/models/payments.models';

interface TransactionFilter {
    user_id: mongoose.Types.ObjectId;
    transaction_type?: 'credit' | 'debit';
    payment_status?: string;
    createdAt?: {
        $gte?: Date;
        $lte?: Date;
    };
}

@injectable()
export class TransactionRepository {
    constructor(
        @inject('PaymentsModel') private paymentsModel: Model<IPayments>,
    ) {}

    async getPaymentHistory(user_id: string): Promise<any> {
        try {
            //Get the Payments Cards of this user
            const user_payment_profile = await this.paymentsModel.find({ 
                user_id: user_id, 
                description: { $ne: "Cost of call" } 
            }).sort({ createdAt: -1 });
            return user_payment_profile;
        } catch (error) {
            throw error;
        }
    }

    async getTransactionsWithPagination(
        partner_id: string,
        page: number = 1,
        limit: number = 20,
        transaction_type?: 'credit' | 'debit',
        payment_status?: string,
        start_date?: Date,
        end_date?: Date,
        search?: string
    ): Promise<{
        transactions: IPayments[];
        total: number;
        page: number;
        limit: number;
        total_pages: number;
    }> {
        try {
            const skip = (page - 1) * limit;
            
            // Build filter
            const filter: TransactionFilter = {
                user_id: new mongoose.Types.ObjectId(partner_id)
            };

            if (transaction_type) {
                filter.transaction_type = transaction_type;
            }

            if (payment_status) {
                filter.payment_status = payment_status;
            }

            if (start_date || end_date) {
                filter.createdAt = {};
                if (start_date) {
                    filter.createdAt.$gte = start_date;
                }
                if (end_date) {
                    filter.createdAt.$lte = end_date;
                }
            }

            // Build search filter
            let searchFilter = {};
            if (search) {
                searchFilter = {
                    $or: [
                        { description: { $regex: search, $options: 'i' } },
                        { payment_reference: { $regex: search, $options: 'i' } },
                        { payment_processor_payment_id: { $regex: search, $options: 'i' } }
                    ]
                };
            }

            const finalFilter = { ...filter, ...searchFilter };

            const [transactions, total] = await Promise.all([
                this.paymentsModel
                    .find(finalFilter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                this.paymentsModel.countDocuments(finalFilter)
            ]);

            return {
                transactions,
                total,
                page,
                limit,
                total_pages: Math.ceil(total / limit)
            };
        } catch (error) {
            throw error;
        }
    }

    async getTransactionById(partner_id: string, transaction_id: string): Promise<IPayments | null> {
        try {
            const transaction = await this.paymentsModel
                .findOne({
                    _id: new mongoose.Types.ObjectId(transaction_id),
                    user_id: new mongoose.Types.ObjectId(partner_id)
                })
                .lean();
            
            return transaction;
        } catch (error) {
            throw error;
        }
    }

    async getTransactionStats(partner_id: string): Promise<{
        total_transactions: number;
        total_debits: number;
        total_credits: number;
        total_amount_spent: number;
        total_amount_received: number;
        recent_transactions_count: number;
    }> {
        try {
            const stats = await this.paymentsModel.aggregate([
                {
                    $match: {
                        user_id: new mongoose.Types.ObjectId(partner_id)
                    }
                },
                {
                    $facet: {
                        totals: [
                            {
                                $group: {
                                    _id: null,
                                    total_transactions: { $sum: 1 },
                                    total_debits: {
                                        $sum: { $cond: [{ $eq: ['$transaction_type', 'debit'] }, 1, 0] }
                                    },
                                    total_credits: {
                                        $sum: { $cond: [{ $eq: ['$transaction_type', 'credit'] }, 1, 0] }
                                    },
                                    total_amount_spent: {
                                        $sum: { $cond: [{ $eq: ['$transaction_type', 'debit'] }, '$amount', 0] }
                                    },
                                    total_amount_received: {
                                        $sum: { $cond: [{ $eq: ['$transaction_type', 'credit'] }, '$amount', 0] }
                                    }
                                }
                            }
                        ],
                        recent: [
                            {
                                $match: {
                                    createdAt: {
                                        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                                    }
                                }
                            },
                            {
                                $count: 'count'
                            }
                        ]
                    }
                }
            ]);

            const totals = stats[0]?.totals[0] || {
                total_transactions: 0,
                total_debits: 0,
                total_credits: 0,
                total_amount_spent: 0,
                total_amount_received: 0
            };

            const recent_transactions_count = stats[0]?.recent[0]?.count || 0;

            return {
                ...totals,
                recent_transactions_count
            };
        } catch (error) {
            throw error;
        }
    }
}
