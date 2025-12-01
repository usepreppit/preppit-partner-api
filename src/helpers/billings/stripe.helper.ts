import Stripe from "stripe";


if (!process.env.STRIPE_SECRET_KEY) {
	throw new Error("STRIPE_SECRET_KEY is not defined in the environment variables");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


export async function SetupStripeIntent() {
    try {
        const setupIntent = await stripe.setupIntents.create({
            payment_method_types: ['card'],
        });
        return setupIntent;
    } catch (error) {
        console.error("Error creating Setup Intent:", error);
        throw new Error("Failed to create Setup Intent");
    }
}

export async function GetStripeCustomer(customer_id: string) {
    try {
        const customer = await stripe.customers.retrieve(customer_id);
        return customer;
    } catch (error) {
        console.error("Error retrieving Stripe Customer:", error);
        // throw new Error("Failed to retrieve Stripe Customer");
        return null;
    }
}

export async function createStripeCustomer(user_email: string, user_id: string, user_fullname: string, add_card: boolean | string = false) {
    try {
        const customer = await stripe.customers.create({
            email: user_email,   
            name: user_fullname,            
            metadata: { userId: user_id }, 
        });
        console.log("Add card to customer?", add_card);
        if (add_card) {
            const add_card_to_customer = await addCardToCustomer(customer.id, add_card as string, true);
            console.log("add_card_to_customer", add_card_to_customer);
        }
        
        return customer;
    } catch (error) {
        throw new Error("Failed to create Stripe Customer");
    }
}

export async function addCardToCustomer(customer_id: string, payment_method_id: string, is_default: boolean) {
    try {
        // Step 1: Attach the payment method to the customer
        const paymentMethod = await stripe.paymentMethods.attach(
            payment_method_id,
            { customer: customer_id }
        );
        
        // Step 2: Set it as the default payment method (optional)
        if (is_default) {
            await stripe.customers.update(customer_id, {
                invoice_settings: {
                    default_payment_method: paymentMethod.id,
                },
            });
        }

        return paymentMethod;
  
    } catch (error) {
        console.error('Error adding card to customer:', error);
    }
}

export async function getDefaultCard(customer_id: string) {
    try {
        const customer = await stripe.customers.retrieve(customer_id, {
            expand: ['invoice_settings.default_payment_method']
        });

        // Guard clause: check if the customer is deleted
        if ((customer as Stripe.DeletedCustomer).deleted) {
            throw new Error('Customer is deleted');
        }
        
        const activeCustomer = customer as Stripe.Customer;
        const defaultPaymentMethod = activeCustomer.invoice_settings.default_payment_method as Stripe.PaymentMethod;
        
        // Guard clause: check if the default payment method is a card
        if (!defaultPaymentMethod || !('card' in defaultPaymentMethod)) {
            return {};
        }
    
        return {
            id: defaultPaymentMethod.id,
            brand: defaultPaymentMethod.card?.brand ?? 'Unknown',
            last4: defaultPaymentMethod.card?.last4 ?? 'Unknown',
            exp_month: defaultPaymentMethod.card?.exp_month,
            exp_year: defaultPaymentMethod.card?.exp_year
        };
    } catch (error) {
        console.error('Error retrieving default card:', error);
        return { error: error };
    }
}

export async function getCustomerCards(customer_id: string, limit: number = 10) {
    const paymentMethods = await stripe.paymentMethods.list({
        customer: customer_id,
        type: 'card',
        limit: limit,
    });
  
    return paymentMethods.data;
} 

export async function DebitCustomerCard(customer_id: string, payment_method: string, amount: number) {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Amount in cents
            currency: 'usd',
            customer: customer_id,
            payment_method: payment_method,
            payment_method_types: ['card'],
            confirm: true,
            off_session: true,
        });

        return paymentIntent;
    } catch (error) {
        console.error("Error creating Payment Intent:", error);
        throw new Error(`Failed to create Payment Intent : ${error}`);
    }
}

export async function CreatePaymentIntent(customer_id: string, amount: number, metadata?: any) {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Amount in cents
            currency: 'usd',
            customer: customer_id,
            payment_method_types: ['card'],
            metadata: metadata || {},
        });

        return paymentIntent;
    } catch (error) {
        console.error("Error creating Payment Intent:", error);
        throw new Error(`Failed to create Payment Intent : ${error}`);
    }
}

export async function ConfirmPaymentIntent(payment_intent_id: string, payment_method_id: string) {
    try {
        const paymentIntent = await stripe.paymentIntents.confirm(payment_intent_id, {
            payment_method: payment_method_id,
        });

        return paymentIntent;
    } catch (error) {
        console.error("Error confirming Payment Intent:", error);
        throw new Error(`Failed to confirm Payment Intent : ${error}`);
    }
}

export async function GetCustomerFromPaymentMethod(payment_method: string, user_full_profile: any) {
    try {
        const paymentMethod = await stripe.paymentMethods.retrieve(payment_method, {
            expand: ['customer'],
        });

        console.log("paymentMethod", paymentMethod);

        let customer_data: any;
        if (paymentMethod && paymentMethod.customer && typeof paymentMethod.customer !== 'string') {
            console.log("paymentMethod.customer", paymentMethod.customer);
            return paymentMethod.customer as Stripe.Customer;
        } else {
            //No customer attached to the payment method
            if(paymentMethod.customer == null) {
                //Create a new customer and attach the payment method to the customer
                customer_data = await createStripeCustomer(user_full_profile.email, user_full_profile._id.toString(), `${user_full_profile.first_name} ${user_full_profile.last_name}`) as Stripe.Customer;
                await addCardToCustomer(customer_data.id, payment_method, true);
            }
        }
        // else {
        //     customer_data = await createStripeCustomer(user_full_profile.email, user_full_profile._id.toString(), `${user_full_profile.first_name} ${user_full_profile.last_name}`) as Stripe.Customer;
        //     await addCardToCustomer(customer_data.id, payment_method, true);
        // }

        return customer_data;
    } catch (error) {
        console.error("Error retrieving Payment Method:", error);
        return null;
    }
}

export async function detachPaymentMethod(payment_method_id: string) {
    try {
        const paymentMethod = await stripe.paymentMethods.detach(payment_method_id);
        return paymentMethod;
    } catch (error) {
        console.error('Error detaching payment method:', error);
        throw new Error(`Failed to detach payment method: ${error}`);
    }
}

export async function CheckValidityOfPaymentMethod(payment_method: string) {
    try {
        const paymentMethod = await stripe.paymentMethods.retrieve(payment_method);
        if (
            paymentMethod &&
            paymentMethod.card &&
            paymentMethod.card.exp_year >= new Date().getFullYear() &&
            (
              paymentMethod.card.exp_year > new Date().getFullYear() ||
              paymentMethod.card.exp_month >= new Date().getMonth() + 1
            )
        ) {
                return payment_method;
        } else {
            throw new Error('Invalid Payment Method, Card is Either Expired or Invalid')
        }
    } catch (error) {
        console.error("Error retrieving Payment Method:", error);
        return null;
    }
}


