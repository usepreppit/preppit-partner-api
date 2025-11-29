import { inject, injectable } from 'inversify';
import { Logger } from '../../startup/logger';
import { ApiError } from '../../helpers/error.helper';
import { SetupStripeIntent, createStripeCustomer, getDefaultCard, getCustomerCards, addCardToCustomer, GetStripeCustomer, DebitCustomerCard } from '../../helpers/billings/stripe.helper';
import { PartnerRepository } from '../users/models/partner.repository';
import { PaymentsRepository } from './models/payments.repository';
import { CandidatesRepository } from '../candidates/models/candidates.repository';
import { IPaymentPlans } from './models/payment_plans.model';
import { IPayments } from './models/payments.models';
// import { TransactionRepository } from './models/transactions.repository';
// import { GetPayStackAuthUrl, VerifyPaystackTransaction, DebitNGNCustomerCard } from '../../helpers/billings/paystack.helper';


@injectable()
export class PaymentsService {
    constructor(
		@inject(Logger) private readonly logger: Logger,
	@inject(PaymentsRepository) private readonly paymentsRepository: PaymentsRepository,
	@inject(PartnerRepository) private readonly partnerRepository: PartnerRepository,
	@inject(CandidatesRepository) private readonly candidatesRepository: CandidatesRepository,

    ) {}

	async GetClientSecret(partner_id: string): Promise<any> {
		try {
			//get Client Secret
            const partner_payment_profile = await this.partnerRepository.getFullPartnerDetails(partner_id);

			if(!partner_payment_profile.payments || !partner_payment_profile.payments.length) {
				//No stripe customer exists, create a new customer
				const create_stripe_customer = await createStripeCustomer(
					partner_payment_profile.email, 
					partner_id, 
					`${partner_payment_profile.firstname} ${partner_payment_profile.lastname || ''}`
				);
				console.log(create_stripe_customer);
				await this.paymentsRepository.CreatePaymentProfile(partner_id, create_stripe_customer.id, create_stripe_customer);
			}

            const stripe_intent = await SetupStripeIntent();
            return { client_secret: stripe_intent.client_secret };
		} catch (error) {
			this.logger.error(`Error Getting Client Secret: ${error}`);
			throw new ApiError(400, 'Error Getting Client Secret', error);
		}
	}

	async GetUserCards(partner_id: string): Promise<any> {
		try {
			//get partner payment profile
			const partner_profile = await this.partnerRepository.getFullPartnerDetails(partner_id);

			console.log(partner_profile);
			if(!partner_profile.payments || !partner_profile.payments.length) {
				throw new ApiError(400, 'Error Getting payment details, Partner has no payment cards')
			}
			const stripe_customer_id = partner_profile.payments[partner_profile.payments.length - 1].payment_customer_id;
			const default_card = await getDefaultCard(stripe_customer_id);
			const get_customer_cards = await getCustomerCards(stripe_customer_id);

			console.log("default_card", default_card);
			return get_customer_cards;
		} catch (error) {
			this.logger.error(`Error Getting Cards: ${error}`);
			throw new ApiError(400, 'Error Getting Cards', error);
		}
	}

	async GetSubscriptionPlans(): Promise<any> {
		try {
			//get user payment profile
			const plans = await this.paymentsRepository.GetSubscriptionPlans();
			return plans;
		} catch (error) {
			this.logger.error(`Error Getting Subscription Plans: ${error}`);
			throw new ApiError(400, 'Error Getting Subscription Plans', error);
		}
	}

	async GetSingleSubscriptionPlan(plan_id: string): Promise<IPaymentPlans | null> {
		try {
			//get user payment profile
			const plan = await this.paymentsRepository.GetSingleSubscriptionPlan(plan_id);
			return plan;
		} catch (error) {
			this.logger.error(`Error Getting Single Subscription Plan: ${error}`);
			throw new ApiError(400, 'Error Getting Single Subscription Plan', error);
		}
	}

	async CreateSubscriptionPlans(plan_details: object): Promise<IPaymentPlans> {
		try {
			//create a new subscription plan
			const new_plan = await this.paymentsRepository.createSubscriptionPlan(plan_details);
			return new_plan;
		} catch (error) {
			this.logger.error(`Error Creating Subscription Plans: ${error}`);
			throw new ApiError(400, 'Error Creating Subscription Plans', error);
		}
	}

	async SaveCard(partner_id: string, req: any, is_default: string = "true", account_type?: 'admin' | 'partner'): Promise<any> {
		try {
			//check partner payment profile 
			const partner_full_profile = await this.partnerRepository.getFullPartnerDetails(partner_id);

			if(!partner_full_profile.payments || !partner_full_profile.payments.length) {
				throw new ApiError(400, 'Error Getting payment details')
			}

			const stripe_customer_id = partner_full_profile.payments[partner_full_profile.payments.length - 1].payment_customer_id;

			//get the customer payment method
			// const customer_payment_method = partner_full_profile.payments[partner_full_profile.payments.length - 1].payment_customer_details.payment_method;
			const attach_card = await addCardToCustomer(stripe_customer_id, req.payment_method, is_default == "true" );

			// Mark "payment method setup" step as complete on dashboard for partners
			if (account_type === 'partner') {
				const partner = await this.partnerRepository.findById(partner_id);
				if (partner && !partner.payment_method_setup) {
					await this.partnerRepository.markPaymentMethodSetup(partner_id);
					this.logger.info(`Marked payment method setup for partner: ${partner_id}`);
				}
			}

			return attach_card;
		} catch (error) {
			throw new ApiError(400, 'Error Saving Card', error);
		}
	}

	async PurchasePlan(partner_id: string, customer_payment_method: string | null, plan_id: string, payment_type: null | string): Promise<any> {
		try {
			//Confirm that the payment plan is valid
			const payment_plan = await this.paymentsRepository.GetSingleSubscriptionPlan(plan_id);

			if(!payment_plan) {
				throw new ApiError(400, 'Invalid Payment Plan Selected, Selected subscription is not active or does not exist')
			}
			

			const amount = payment_type == "topup" ? 36 : payment_plan.amount_usd; //in usd not cents
			const partner_full_profile = await this.partnerRepository.getFullPartnerDetails(partner_id);

			// Note: Partners don't have subscription model like users
			// This endpoint may need to be redesigned for partner use case
			
			//for the partner profile, check if a stripe customer exists
			const partner_payment_profile = partner_full_profile.payments?.[partner_full_profile.payments.length - 1];

			const stripe_customer_id = partner_payment_profile?.payment_customer_id as string;
			const stripe_payment_method = partner_payment_profile?.payment_customer_details?.invoice_settings?.default_payment_method as string;

			//declare the global variables
			let customer_id_to_debit = stripe_customer_id;
			let customer_payment_method_to_use = customer_payment_method ? customer_payment_method : stripe_payment_method;

			if(!stripe_customer_id) {
				//create a new customer
				const new_stripe_customer = await createStripeCustomer(
					partner_full_profile.email, 
					partner_id, 
					`${partner_full_profile.firstname} ${partner_full_profile.lastname || ''}`, 
					customer_payment_method as string
				);
				customer_id_to_debit = new_stripe_customer.id;
				customer_payment_method_to_use = new_stripe_customer.invoice_settings.default_payment_method as string;
				await this.paymentsRepository.CreatePaymentProfile(partner_id, new_stripe_customer.id, new_stripe_customer);
			} else {
				//check for the payment method attached to the customer
				const saved_payment_method = partner_payment_profile?.payment_customer_details?.invoice_settings?.default_payment_method;
				const get_stripe_customer = await GetStripeCustomer(stripe_customer_id);

				if(!get_stripe_customer) { //No stripe customer found create new customer and update the records of the old customer
					//create a new customer
					const new_stripe_customer = await createStripeCustomer(
						partner_full_profile.email, 
						partner_id, 
						`${partner_full_profile.firstname} ${partner_full_profile.lastname || ''}`, 
						customer_payment_method as string
					);

					customer_id_to_debit = new_stripe_customer.id;
					customer_payment_method_to_use = customer_payment_method as string;
					await this.paymentsRepository.UpdatePaymentProfile({ _id: partner_full_profile._id  }, new_stripe_customer);
				} else {
					//stripe customer exists check if the payment method matches the one on record
					if(!saved_payment_method || (saved_payment_method != customer_payment_method)) {
						//Add the payment method to the customer and make it the default card then update the payment record
						await addCardToCustomer(stripe_customer_id as string, customer_payment_method as string, true);
						await this.paymentsRepository.UpdatePaymentProfileByPaymentMethod(partner_id, customer_payment_method as string);
					} 
				}
			}

			//debit the customer card
			const debit_card = await DebitCustomerCard(customer_id_to_debit as string, customer_payment_method_to_use as string, amount);
			if(!debit_card) {
				throw new ApiError(400, 'Error Charging Card')
			} else if(debit_card.status != 'succeeded') {
				throw new ApiError(400, 'Error Charging Card')
			} else {
				//save payment details
				const payment_details = {
					user_id: partner_id,
					payment_plan_id: payment_plan._id,
					amount: amount,
					currency: 'USD',
					transaction_channel: 'stripe',
					transaction_type: 'debit',
					payment_processor: 'stripe',
					payment_processor_customer_id: customer_id_to_debit,
					payment_status: debit_card.status,
					payment_processor_payment_id: debit_card.id,
					description: `Purchase of ${payment_plan.plan_name} Plan`,
					payment_reference: debit_card.id,
					payment_method: 'card',
					transaction_details: debit_card
				}

				const save_payment = await this.paymentsRepository.RecordPaymentTransaction(payment_details);				
				
				// Note: Partners don't have plan minutes like users
				// This logic may need to be redesigned for partner billing model
				
				//Add a new User Subscription Record for Subscriptions
				const subscription_type = payment_type == "topup" ? "topup" : "subscription";
				const subscription_end_date = null; // Partners don't have subscription end dates like users
				await this.paymentsRepository.CreateUserSubscriptionRecord(
					partner_id, 
					payment_plan._id as string, 
					save_payment._id as string, 
					subscription_type as string, 
					subscription_end_date
				);

				//log the activity into the database
				await this.logger.activity_log(partner_id, 'purchase_plan', 'payments', `Purchased ${payment_plan.plan_name} Plan`, { plan_id: payment_plan._id, payment_id: save_payment._id });
				return save_payment;
			}	


		} catch (error) {
			this.logger.error(`Error Purchasing Plan: ${error}`);
			throw new ApiError(400, 'Error Purchasing Plan', error);
		}
	}

	// async PurchasePlan(user_id: string, customer_payment_method: string | null, plan_id: string): Promise<any> {
	// 	try {			
	// 		//check that payment plan exists
	// 		const payment_plan = await this.paymentsRepository.GetSingleSubscriptionPlan(plan_id);

	// 		if(!payment_plan) {
	// 			throw new ApiError(400, 'Invalid Payment Plan Selected')
	// 		}

	// 		const amount = payment_plan.amount_usd; //in cents
	// 		const user_full_profile = await this.userRepository.getFullUserDetails(user_id);

	// 		let stripe_customer_id: string = '';
	// 		let stripe_payment_method: string = '';
	// 		let active_payment_method: string = customer_payment_method as string;
	// 		let check_stripe_customer: any;

			

			
	// 		if(user_full_profile.payments.length == 0) {
	// 			//No stripe user exists create a new user, create a new customer
	// 			let create_stripe_customer: any;

	// 			if(!check_stripe_customer) {
	// 				//Customer does not exists on stripe and also record not found in the database
	// 				create_stripe_customer = await createStripeCustomer(user_full_profile.email, user_id, `${user_full_profile.firstname} ${user_full_profile.lastname}`, active_payment_method);
	// 			}
				
	// 			await this.paymentsRepository.CreatePaymentProfile(user_id, check_stripe_customer.id, check_stripe_customer);

	// 			stripe_customer_id = create_stripe_customer.id;
	// 			stripe_payment_method = active_payment_method;
	// 		} else {
	// 			// const payment_method = user_full_profile.payments[user_full_profile.payments.length - 1];
	// 			// if(!payment_method || !payment_method.payment_customer_id) {
	// 			// 	throw new ApiError(400, 'Error Getting User Payment Details')
	// 			// }

				

	// 			const existing_payment_method = user_full_profile.payments[user_full_profile.payments.length - 1]?.payment_customer_details?.invoice_settings?.default_payment_method;
	// 			const customer_id = user_full_profile.payments[user_full_profile.payments.length - 1]?.payment_customer_id as string;

	// 			if (!customer_id) {
	// 				//create a new customer
	// 				const new_stripe_customer = await createStripeCustomer(user_full_profile.email, user_id, `${user_full_profile.firstname} ${user_full_profile.lastname}`, active_payment_method);
	// 				await this.paymentsRepository.UpdatePaymentProfile(user_id, new_stripe_customer);
	// 			} else {
	// 				if(!existing_payment_method) {
	// 					check_stripe_customer = await GetCustomerFromPaymentMethod(customer_payment_method as string, user_full_profile);
	// 				} else if (existing_payment_method != customer_payment_method) {
	// 					//Add the card to the customer and update the customer payment method
	// 					await addCardToCustomer(customer_id as string, customer_payment_method as string, true);
	// 					await this.paymentsRepository.UpdatePaymentProfileByPaymentMethod(user_id, customer_payment_method as string);
	// 				} else {
	// 					active_payment_method = existing_payment_method;
	// 				}
	// 			}
				

	// 			stripe_customer_id = customer_id;
	// 			stripe_payment_method = active_payment_method;
	// 		}

	// 		if(!stripe_customer_id || !stripe_payment_method) {
	// 			throw new ApiError(400, 'Error Getting Customer or Creating new Stripe Customer')
	// 		}

	// 		//debit the customer card
	// 		const debit_card = await DebitCustomerCard(stripe_customer_id, stripe_payment_method, amount);

	// 		if(!debit_card) {
	// 			throw new ApiError(400, 'Error Charging Card')
	// 		} else if(debit_card.status != 'succeeded') {
	// 			throw new ApiError(400, 'Error Charging Card')
	// 		} else {
	// 			//save payment details
	// 			const payment_details = {
	// 				user_id: user_id,
	// 				payment_plan_id: payment_plan._id,
	// 				amount: payment_plan.amount_usd,
	// 				currency: 'USD',
	// 				transaction_channel: 'stripe',
	// 				transaction_type: 'debit',
	// 				payment_processor: 'stripe',
	// 				payment_processor_customer_id: stripe_customer_id,
	// 				payment_status: debit_card.status,
	// 				payment_processor_payment_id: debit_card.id,
	// 				description: `Purchase of ${payment_plan.plan_name} Plan`,
	// 				payment_reference: debit_card.id,
	// 				payment_method: 'card',
	// 				transaction_details: debit_card
	// 			}

	// 			const save_payment = await this.paymentsRepository.RecordPaymentTransaction(payment_details);
	// 			//add the plan minutes to the user account
	// 			await this.userRepository.addUserPlanMinutes(user_id, payment_plan.plan_minutes);
	// 			return save_payment;
	// 		}
			
	// 	} catch (error) {
	// 		throw new ApiError(400, 'Error Funding Wallet', error);
	// 	}
	// }

	async GetUserPaymentHistory(user_id: string): Promise<IPayments[]> {
		try {
			//get user payment history
			const payment_history = await this.paymentsRepository.GetUserPaymentHistory(user_id);
			return payment_history;
		} catch (error) {
			this.logger.error(`Error Getting User Payment History: ${error}`);
			throw new ApiError(400, 'Error Getting User Payment History', error);
		}
	}
	

	// async GetPaystackAuthUrl(user_id: string): Promise<any> {
	// 	try {
	// 		const user_full_profile = await this.userRepository.getFullUserDetails(user_id);
			
	// 		const user_email = user_full_profile.email;
	// 		const paystack_auth_url = await GetPayStackAuthUrl(user_email, user_id);

	// 		//save the user paystack profile
	// 		// this.paymentRepository.CreateUserPaymentProfile(user_id, paystack_auth_url.reference, paystack_auth_url, 'paystack');

	// 		return paystack_auth_url;
			
	// 	} catch (error) {
	// 		this.logger.error(`Error Getting Paystack Auth URL: ${error}`);
	// 		throw new ApiError(400, 'Error Getting Paystack Auth URL', error);
	// 	}
	// }

	

	// async DebitWallet(user_id: string, amount: number, wallet_details: any[]): Promise<any> {
	// 	const wallet_id = wallet_details[wallet_details.length]._id;
	// 	const wallet_currency = wallet_details[wallet_details.length - 1].currency || 'USD'; //default to USD if no currency is found
	// 	const transaction_details = {
	// 		call_status: 'Completed',
	// 		transaction_type: 'debit',
	// 		call_cost: amount,
	// 		call_cost_description: `Funding Wallet with ${amount} ${wallet_currency}`,
	// 		call_cost_currency: wallet_currency,
	// 	}
	// 	const create_transaction = await this.userRepository.createTransaction(user_id, wallet_id, transaction_details);
	// 	const update_wallet_balance = await this.userRepository.updateWalletBalance(user_id, wallet_id, Number(amount), 'credit');

	// 	return { transaction: create_transaction, wallet: update_wallet_balance };
	// }

	async getPaymentMethods(partner_id: string): Promise<{ cards: any[]; auto_renew: boolean }> {
		try {
			// Get partner payment profile
			const partner_profile = await this.partnerRepository.getFullPartnerDetails(partner_id);
			
			if (!partner_profile.payments || !partner_profile.payments.length) {
				return { cards: [], auto_renew: false };
			}
			
			// Get partner's saved cards from Stripe
			const stripe_customer_id = partner_profile.payments[0].stripe_customer_id;
			const cards = await getCustomerCards(stripe_customer_id);
			
			// Get auto-renew preference (default to false if not set)
			const auto_renew = partner_profile.auto_renew_subscription || false;
			
			return { cards, auto_renew };
		} catch (error) {
			this.logger.error(`Error fetching payment methods: ${error}`);
			throw new ApiError(400, 'Error fetching payment methods', error);
		}
	}

	async getUnpaidCountInBatch(partner_id: string, batch_id: string): Promise<number> {
		try {
			const unpaid_count = await this.candidatesRepository.getUnpaidCandidatesCountByBatch(
				partner_id,
				batch_id
			);
			return unpaid_count;
		} catch (error) {
			this.logger.error(`Error getting unpaid count: ${error}`);
			throw new ApiError(400, 'Error getting unpaid candidates count', error);
		}
	}

	/**
	 * Purchase seats for a batch. Charges the partner immediately and creates a Seat record.
	 * Creates a new batch if batch_name is provided, or uses existing batch if batch_id is provided.
	 * Minimum seats per purchase enforced by caller (frontend/business logic) - backend will validate min 10.
	 */
	async purchaseSeats(
		partner_id: string,
		seat_count: number,
		sessions_per_day: 3 | 5 | 10 | -1,
		months: number,
		batch_name: string,
		payment_method_id: string,
		auto_renew: boolean = false
	): Promise<any> {
		try {
			if (seat_count < 10) {
				throw new ApiError(400, 'Minimum seat purchase is 10');
			}

			// Validate sessions_per_day
			const validSessions = [3, 5, 10, -1];
			if (!validSessions.includes(sessions_per_day)) {
				throw new ApiError(400, 'Invalid sessions_per_day value. Must be 3, 5, 10, or -1 (unlimited)');
			}

			// Validate months
			const validMonths = [1, 3, 6, 12];
			if (!validMonths.includes(months)) {
				throw new ApiError(400, 'Invalid months value. Must be 1, 3, 6, or 12');
			}

			if (!batch_name || batch_name.trim() === '') {
				throw new ApiError(400, 'Batch name is required');
			}

			// Create or get batch
			let batch;
			try {
				batch = await this.candidatesRepository.createBatch(partner_id, batch_name.trim());
				this.logger.info(`Created new batch: ${batch._id} for seat purchase`);
			} catch (error: any) {
				// If batch already exists (duplicate key error), fetch it
				if (error.code === 11000) {
					const batches = await this.candidatesRepository.getAllBatchesByPartnerId(partner_id);
					batch = batches.find(b => b.batch_name === batch_name.trim());
					if (!batch) {
						throw new ApiError(400, 'Batch name already exists but could not be retrieved');
					}
					this.logger.info(`Using existing batch: ${batch._id} for seat purchase`);
				} else {
					throw error;
				}
			}

			const batch_id = batch._id.toString();

			// Check if seat already exists for this batch
			const existingSeat = await this.candidatesRepository.getSeatByBatch(partner_id, batch_id);
			if (existingSeat) {
				throw new ApiError(400, 'A seat subscription already exists for this batch. Please use a different batch name or sunset the existing batch first.');
			}

			// Price calculation: reuse calculatePricing (per candidate == per seat here)
			const pricing = await this.calculatePricing(seat_count, months);

			// get partner stripe customer
			const partner_profile = await this.partnerRepository.getFullPartnerDetails(partner_id);
			if (!partner_profile.payments || !partner_profile.payments.length) {
				throw new ApiError(400, 'No payment profile found. Please add a payment method first.');
			}
			const stripe_customer_id = partner_profile.payments[0].stripe_customer_id;

			// charge partner
			const charge = await DebitCustomerCard(stripe_customer_id, payment_method_id, pricing.total);
			if (!charge || charge.status !== 'succeeded') {
				throw new ApiError(400, 'Payment failed');
			}

			// create seat record
			const start_date = new Date();
			const end_date = new Date();
			end_date.setDate(end_date.getDate() + (months * 30));

			const seat = await this.candidatesRepository.createSeat(partner_id, batch_id, seat_count, sessions_per_day, start_date, end_date, 30);

			// record payment
			const sessionLabel = sessions_per_day === -1 ? 'unlimited' : sessions_per_day;
			const payment_data = {
				user_id: partner_id,
				transaction_type: 'debit' as const,
				amount: pricing.total,
				currency: 'usd',
				payment_method: payment_method_id,
				payment_processor: 'stripe',
				payment_processor_payment_id: charge.id,
				payment_status: 'successful',
				description: `Purchase of ${seat_count} seats (${sessionLabel} sessions/day) for batch "${batch_name}" for ${months} month(s)`,
				transaction_details: {
					seat_count,
					sessions_per_day,
					months,
					batch_id,
					batch_name,
					pricing: pricing.breakdown,
					charge_details: charge
				}
			};

			const payment_record = await this.paymentsRepository.RecordPaymentTransaction(payment_data);

			if (auto_renew !== partner_profile.auto_renew_subscription) {
				await this.partnerRepository.updateAutoRenewPreference(partner_id, auto_renew);
			}

			return { 
				seat, 
				batch: {
					batch_id: batch._id,
					batch_name: batch.batch_name
				},
				payment: payment_record 
			};
		} catch (error: any) {
			this.logger.error(`Error purchasing seats: ${error}`);
			throw new ApiError(400, error.message || 'Error purchasing seats', error);
		}
	}

	async calculatePricing(candidate_count: number, months: number): Promise<{
		per_candidate: number; 
		total: number;
		breakdown: {
			candidate_count: number;
			months: number;
			base_price_per_candidate: number;
			volume_discount: number;
			final_price_per_candidate: number;
		}
	}> {
		try {
			// Base price calculation
			// $10 per candidate per month as base
			const basePricePerCandidatePerMonth = 10;
			const basePrice = basePricePerCandidatePerMonth * months;
			
			// Determine volume discount based on candidate count
			let discountPercentage = 0;
			let multiplier = 1;
			
			if (candidate_count >= 100) {
				discountPercentage = 20;
				multiplier = 0.8; // 20% discount
			} else if (candidate_count >= 50) {
				discountPercentage = 15;
				multiplier = 0.85; // 15% discount
			} else if (candidate_count >= 10) {
				discountPercentage = 10;
				multiplier = 0.9; // 10% discount
			}
			
			// Calculate final price per candidate
			const perCandidate = Math.round(basePrice * multiplier);
			
			// Calculate total
			const total = perCandidate * candidate_count;
			
			return { 
				per_candidate: perCandidate,
				total,
				breakdown: {
					candidate_count,
					months,
					base_price_per_candidate: basePrice,
					volume_discount: discountPercentage,
					final_price_per_candidate: perCandidate
				}
			};
		} catch (error) {
			this.logger.error(`Error calculating pricing: ${error}`);
			throw new ApiError(400, 'Error calculating pricing', error);
		}
	}

	async processPayment(
		partner_id: string,
		candidate_count: number,
		months: number,
		payment_method_id: string,
		auto_renew: boolean,
		batch_id?: string,
		unpaid_candidates?: number
	): Promise<any> {
		try {
			// Calculate pricing
			const pricing = await this.calculatePricing(candidate_count, months);
			
			// Get partner payment profile
			const partner_profile = await this.partnerRepository.getFullPartnerDetails(partner_id);
			
			if (!partner_profile.payments || !partner_profile.payments.length) {
				throw new ApiError(400, 'No payment profile found. Please add a payment method first.');
			}
			
			const stripe_customer_id = partner_profile.payments[0].stripe_customer_id;
			
			// Process the payment
			const charge = await DebitCustomerCard(
				stripe_customer_id,
				payment_method_id,
				pricing.total
			);
			
			if (!charge || charge.status !== 'succeeded') {
				throw new ApiError(400, 'Payment failed. Please try again or use a different payment method.');
			}
			
			// Create payment record
			const payment_data = {
				user_id: partner_id, // Using partner_id as user_id for compatibility
				transaction_type: 'debit' as const,
				amount: pricing.total,
				currency: 'usd',
				payment_method: payment_method_id,
				payment_processor: 'stripe',
				payment_processor_payment_id: charge.id,
				payment_status: 'successful',
				description: `Payment for ${candidate_count} candidates for ${months} month(s)${unpaid_candidates ? ` (including ${unpaid_candidates} unpaid)` : ''}`,
				transaction_details: {
					candidate_count,
					months,
					unpaid_candidates: unpaid_candidates || 0,
					batch_id: batch_id || null,
					pricing: pricing.breakdown,
					charge_details: charge
				}
			};
			
			const payment_record = await this.paymentsRepository.RecordPaymentTransaction(payment_data);
			
			// Update auto-renew preference if different from current
			if (auto_renew !== partner_profile.auto_renew_subscription) {
				await this.partnerRepository.updateAutoRenewPreference(partner_id, auto_renew);
			}
			
			return {
				payment: payment_record,
				pricing,
				charge_id: charge.id
			};
		} catch (error: any) {
			this.logger.error(`Error processing payment: ${error}`);
			throw new ApiError(400, error.message || 'Error processing payment', error);
		}
	}
}
