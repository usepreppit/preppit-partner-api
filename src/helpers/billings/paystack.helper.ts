import axios, { AxiosResponse } from "axios";

const paystack_base_url = "https://api.paystack.co";
const paystack_headers = {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json"
};

export async function GetPayStackAuthUrl(email: string, user_id: string): Promise<any> {
    try {
        return await axios.post(`${paystack_base_url}/transaction/initialize`, {
            email: email,
            amount: 5000, // Amount in kobo (5000 kobo = 50 Naira)
            metadata: {
                user_id: user_id,
                channel: "paystack"
            },
            channels: ["card"],
            callback_url: `${process.env.PAYSTACK_CALLBACK_URL}`
        }, {
            headers: paystack_headers
        }).then((response: AxiosResponse) => {
            if (response.data.status) {
                return response.data.data;
            }
            throw new Error("Failed to initialize Paystack transaction");
        });
    } catch (error) {
        console.error("Error getting paystack auth URL:", error);
        throw new Error("Failed to get Paystack Auth URL"); 
    }
}


export async function VerifyPaystackTransaction(reference: string): Promise<any> {
    try {
        return await axios.get(`${paystack_base_url}/transaction/verify/${reference}`, {
            headers: paystack_headers
        }).then((response: AxiosResponse) => {
            if (response.data.status) {
                return response.data.data;
            }
            throw new Error("Failed to verify Paystack transaction");
        });
    } catch (error) {
        console.error("Error verifying paystack transaction:", error);
        throw new Error("Failed to verify Paystack Transaction");
    }
}

export async function DebitNGNCustomerCard(user_details: { _id: string, email: string }, authorization_code: string, amount: number): Promise<any> {
    try {
        return await axios.post(`${paystack_base_url}/transaction/charge_authorization`, {
            authorization_code: authorization_code,
            email: user_details.email,
            amount: amount * 100, // Amount in kobo
            currency: "NGN",
            metadata: {
                user_id: user_details._id,
                channel: "paystack"
            }
        }, {
            headers: paystack_headers
        }).then((response: AxiosResponse) => {
            if (response.data.status) {
                return response.data.data;
            }
            throw new Error("Failed to charge customer card");
        });
    } catch (error) {
        console.error("Error debiting customer card:", error);
        throw new Error("Failed to debit customer card");
    }
}