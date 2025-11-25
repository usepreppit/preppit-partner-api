import { inject, injectable } from 'inversify';
import { Logger } from './../../startup/logger';
import { ApiError } from '../../helpers/error.helper';
// import { SetupStripeIntent, createStripeCustomer, addCardToCustomer, DebitCustomerCard, getDefaultCard, CheckValidityOfPaymentMethod } from '../../helpers/billings/stripe.helper';
// import { UserRepository } from '../users/models/user.repository';
import { TransactionRepository } from './models/transactions.repository';
// import { GetPayStackAuthUrl, VerifyPaystackTransaction, DebitNGNCustomerCard } from '../../helpers/billings/paystack.helper';


@injectable()
export class TransactionsService {
    constructor(
		@inject(Logger) private readonly logger: Logger,
		@inject(TransactionRepository) private readonly transactionRepository: TransactionRepository,
		// @inject(UserRepository) private readonly userRepository: UserRepository,

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

	// async GetUserCards(user_id: string): Promise<any> {
	// 	try {
	// 		//get user payment profile
	// 		const user_payment_profile = await this.userRepository.getFullUserDetails(user_id);
	// 		if(!user_payment_profile.payments.length) {
	// 			throw new ApiError(400, 'Error Getting user Payment Details')
	// 		}
	// 		const payment_object = user_payment_profile.payments[user_payment_profile.payments.length - 1]
	// 		const payment_channel = payment_object.payment_channel;
	// 		let default_card;

	// 		switch (payment_channel) {
	// 			case 'stripe':
	// 				const stripe_customer_id = payment_object.payment_customer_id;
	// 				default_card = await getDefaultCard(stripe_customer_id);
	// 				break;
	// 			case 'paystack':
	// 				//check the payment customer details
	// 				const paystack_customer_details = payment_object.payment_customer_details;
	// 				default_card = {
	// 					brand: paystack_customer_details.brand,
	// 					last4: paystack_customer_details.last4,
	// 					exp_month: paystack_customer_details.exp_month,
	// 					exp_year: paystack_customer_details.exp_year,
	// 				}
	// 				break;
	// 			default:
	// 				throw new ApiError(400, 'Invalid Payment Channel');
	// 		}


	// 		return default_card;
	// 	} catch (error) {
	// 		this.logger.error(`Error Getting User Cards: ${error}`);
	// 		throw new ApiError(400, 'Error Getting User Cards', error);
	// 	}
	// }

    // async GetClientSecret(user_id: string): Promise<any> {
	// 	try {
	// 		//get Client Secret
    //         const user_payment_profile = await this.userRepository.getFullUserDetails(user_id);

	// 		if(!user_payment_profile.payments.length) {
	// 			//No stripe user exists create a new user, create a new customer
	// 			const create_stripe_customer = await createStripeCustomer(user_payment_profile.email, user_id, `${user_payment_profile.firstname} ${user_payment_profile.lastname}`);
	// 			console.log(create_stripe_customer);
	// 			await this.transactionRepository.CreateUserPaymentProfile(user_id, create_stripe_customer.id, create_stripe_customer);
	// 		}

    //         const stripe_intent = await SetupStripeIntent();
	// 		console.log(stripe_intent);
    //         return { client_secret: stripe_intent.client_secret };
	// 	} catch (error) {
	// 		this.logger.error(`Error Getting Leads: ${error}`);
	// 		throw new ApiError(400, 'Error Getting Client Secret', error);
	// 	}
	// }

	// async SaveCard(user_id: string, payment_channel: string, req: any, is_default: string = "true"): Promise<any> {
	// 	try {
	// 		console.log('Saving Card', user_id, payment_channel, req, is_default);
	// 		//check user payment profile 
	// 		const user_full_profile = await this.userRepository.getFullUserDetails(user_id);

	// 		if(!user_full_profile.payments.length && payment_channel != 'paystack') {
	// 			throw new ApiError(400, 'Error Getting user Payment Details')
	// 		}
	// 		let attach_card;
	// 		switch (payment_channel) {
	// 			case 'stripe':
	// 				const stripe_customer_id = user_full_profile.payments[user_full_profile.payments.length - 1].payment_customer_id;
	// 				attach_card = await addCardToCustomer(stripe_customer_id, req.payment_method, is_default == "true" );
	// 				break;
	// 			case 'paystack':
	// 				console.log('Paystack Reference', req.reference);
	// 				//for paystack we will be verifying the transaction and attaching the card that comes from transaction verification
	// 				const verify_paystack_transaction = await VerifyPaystackTransaction(req.reference);
	// 				if(!verify_paystack_transaction) {
	// 					throw new ApiError(400, 'Error Verifying Paystack Transaction');
	// 				}

	// 				//create the user paystack profile
	// 				const customer_id = verify_paystack_transaction.customer.customer_code;
	// 				const customer_object = {...verify_paystack_transaction.customer, ...verify_paystack_transaction.authorization};
	// 				const meta_data = verify_paystack_transaction;

	// 				attach_card = await this.transactionRepository.CreateUserPaymentProfile(user_id, customer_id, customer_object, 'paystack', meta_data);
	// 				break;
	// 			default:
	// 				throw new ApiError(400, 'Invalid Payment Channel');
					
	// 		}

	// 		return attach_card;
	// 	} catch (error) {
	// 		throw new ApiError(400, 'Error Saving Card', error);
	// 	}
	// }

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

	// async FundWallet(user_id: string, payment_method: string | any, amount: number): Promise<any> {
	// 	try {
	// 		let customer_payment_method;
			
	// 		//check user payment profile 
	// 		const user_full_profile = await this.userRepository.getFullUserDetails(user_id);
	// 		// let stripe_customer: any;
	// 		if(!user_full_profile.payments.length) {
	// 			throw new ApiError(400, 'Error Getting user Payment Details')
	// 		}

	// 		const payment_object = user_full_profile.payments[user_full_profile.payments.length - 1];
	// 		const wallet_object = user_full_profile.wallet[user_full_profile.wallet.length - 1];

	// 		console.log('Wallet Object', wallet_object);
	// 		let wallet_currency = null;

	// 		if(wallet_object != undefined) {
	// 			if(wallet_object.currency) {
	// 				wallet_currency = wallet_object.currency;
	// 			} 
	// 		} 

	// 		if(wallet_currency == null) {
	// 			console.log('Payment Object', payment_object);
	// 			if(payment_object != undefined) {
					
	// 				if(payment_object.payment_channel == 'paystack') {
	// 					wallet_currency = 'NGN';
	// 				} else {
	// 					wallet_currency = 'USD';
	// 				}
	// 			} else {
	// 				wallet_currency = 'USD'; //default to USD if no payment object
	// 			}
	// 		}

			
	// 		console.log(wallet_currency);
	// 		const base_amount = wallet_currency == 'NGN' ? 5000 : 10; //if currency is NGN, base amount is 5000, else it is 10

	// 		console.log(wallet_currency, base_amount, amount);

	// 		if(Number(amount) < base_amount) {
	// 			throw new ApiError(400, `Minimum Amount to fund wallet is ${wallet_currency}${base_amount}`);
	// 		}

	// 		let fund_wallet;
	// 		switch (payment_object.payment_channel) {
	// 			case 'stripe':
	// 				const stripe_customer_id = payment_object.payment_customer_id;

	// 				if(typeof payment_method == 'undefined') {
	// 					const default_card = await getDefaultCard(stripe_customer_id);
	// 					customer_payment_method = default_card.id;
	// 				} else {
	// 					//check if pm method is valid
	// 					const card_details = await CheckValidityOfPaymentMethod(payment_method);
	// 					if(!card_details) {
	// 						throw new ApiError(400, 'Invalid Payment Method, Card is Either Expired or Invalid')
	// 					}

	// 					customer_payment_method = payment_method;
	// 				}

	// 				fund_wallet = await DebitCustomerCard(stripe_customer_id, customer_payment_method, amount);

	// 				break;
	// 			case 'paystack':
	// 				fund_wallet = await DebitNGNCustomerCard(user_full_profile, payment_object.payment_customer_details.authorization_code, amount);
	// 				break;
	// 			default:
	// 				throw new ApiError(400, 'Invalid Payment Channel');
	// 		}


	// 		if(!fund_wallet) {
	// 			throw new ApiError(400, 'Error Funding Wallet')
	// 		}

	// 		let wallet_id = wallet_object != undefined ? wallet_object._id : undefined;
	// 		//check if user has a wallet id
	// 		if(typeof wallet_id == 'undefined') { //No wallet id
	// 			//create the wallet
	// 			const create_user_wallet = await this.userRepository.createWallet(user_id, wallet_currency);
	// 			wallet_id = create_user_wallet._id;
	// 		}

	// 		//create a new transaction
	// 		//Get user wallet id
			
	// 		const transaction_details = {
	// 			call_status: 'Completed',
	// 			transaction_type: 'credit',
	// 			call_cost: amount,
	// 			call_cost_description: `Funding Wallet with ${amount} ${wallet_currency}`,
	// 			call_cost_currency: wallet_currency,
	// 		}

	// 		const create_transaction = await this.userRepository.createTransaction(user_id, wallet_id, transaction_details);
	// 		const update_wallet_balance = await this.userRepository.updateWalletBalance(user_id, wallet_id, Number(amount), 'credit');
	// 		return { transaction: create_transaction, wallet: update_wallet_balance };
			
	// 	} catch (error) {
	// 		throw new ApiError(400, 'Error Funding Wallet', error);
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
}
