const mongoose = require('mongoose');
const global_phone = process.env.TWILIO_PHONE_NUMBER;
const global_phone_id = process.env.VAPI_PHONE_ID;

export function convertToObjectID(param: string): any {
    const objectId = new mongoose.Types.ObjectId(param);
    return objectId;
}   

export function recommendPhoneNumber(user_phone_country: string, phone_compare_array: any): object {
    let response = { calling_phone: global_phone, calling_phone_id: global_phone_id };
    let phone_matched_callers: any = [];
    let all_matched_callers: any = [];
    let randomIndex;
    let valid_callable: boolean = true;

    if (typeof phone_compare_array == 'undefined' || phone_compare_array.length < 1) {
        return response;
    } else {
        //check the country of the user phone
        phone_compare_array.map((item: any) => {
            if(item.provider_response && item.voice_assistant_response) {
                if(item.country_code === user_phone_country) {
                    phone_matched_callers.push(item.phone_number);
                } else {
                    all_matched_callers.push(item.phone_number);
                }
            } else {
                valid_callable = false;
            }
        });

        if(!valid_callable) {
            return response;
        } else {
            console.log(phone_matched_callers);
            console.log("phone compare array", phone_compare_array);
            if (phone_matched_callers.length > 0) {
                //create a random number between 1 and the length of the phone_compare_array
                randomIndex = Math.floor(Math.random() * phone_matched_callers.length);
                
                response.calling_phone = phone_compare_array[randomIndex].phone_number;
                response.calling_phone_id = phone_compare_array[randomIndex].voice_assistant_response.id;
            } else {
                //User phone country is not in the list of valid caller numbers but user has a phone number
                //create a random number between 1 and the length of the phone_compare_array
                randomIndex = Math.floor(Math.random() * phone_compare_array.length);
                response.calling_phone = phone_compare_array[randomIndex].phone_number;
                response.calling_phone_id = phone_compare_array[randomIndex].voice_assistant_response.id;
            }

            return response;
        }
    }
}

export function parseGeneralPrompt(response: string): object {
    //replace the new lines with spaces
    const result = {
        availabilityOnly: false,
        hasTimeRange: false,
        timeRange: null as null | { start: string; end: string },
    };
    
    const availabilityMatch = response.match(/AvailabilityOnly:\s*(true|false)/i);
    const timeRangeMatch = response.match(/HasTimeRange:\s*(true|false)/i);
    const rangeMatch = response.match(/TimeRange:\s*([^\s]+)\s*-\s*([^\s]+)/i);
    
    if (availabilityMatch) {
        result.availabilityOnly = availabilityMatch && availabilityMatch[1]?.toLowerCase() === 'true';
    }
    
    if (timeRangeMatch) {
        result.hasTimeRange = (timeRangeMatch[1]?.toLowerCase() === 'true') || false;
    }
    
    if (rangeMatch) {
        result.timeRange = {
            start: new Date(rangeMatch[1] ?? '').toISOString(),
            end: new Date(rangeMatch[2] ?? '').toISOString(),
        };
    }
    
    return result;
      
}

