// import { calendar_v3 } from "@googleapis/calendar";
import { OAuth2Client } from "google-auth-library";
import { google } from 'googleapis';
import { ApiError } from "../error.helper";

export const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    // process.env.GOOGLE_REDIRECT_URI
);


export async function getAuthURL(scope: string = "", redirect_url: string = ""): Promise<string> {
    let scope_array = [];
    switch (scope) {
        case "login":
        case "signup":
            scope_array = ["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"];
            break;
        default:
            scope_array = ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"];
            break;
    }


    let oauth_params = {
        access_type: "offline",
        scope: scope_array,
        prompt: "consent",
        redirect_uri: redirect_url,
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
    }

    if (!redirect_url) {
        oauth_params.redirect_uri = `https://usepreppit.com/auth-callback/login`; //Manually Override the url
    }

    const oauth_url = oauth2Client.generateAuthUrl(oauth_params);
    return oauth_url;
}

export async function GoogleSocialRegister(scope: string): Promise<any> {
    
    const register_redirect_url = "https://usepreppit.com/login";
    const auth_url = await getAuthURL(scope, register_redirect_url);
    
    return auth_url;
}

export async function GetGoogleUserProfile(user_google_details:any): Promise<void | any> {
    const token_valid = await validateToken(user_google_details.calendar_metadata);
    if (token_valid.valid == false) {
        throw new ApiError(400, 'Google Calendar Token is invalid or has expired, you need to reauthorize');
    }

    const oauth2 = google.oauth2({
        version: 'v2',
        auth: token_valid.oauth,
    });

    const res = await oauth2.userinfo.get();
    return res.data;
}

export async function createToken(authCode: string): Promise<any> {
    try {
        const { tokens } = await oauth2Client.getToken(authCode);
        return tokens;
    } catch (error) {
        throw error;
    }
}

export async function getTokens(authCode: string, redirect_uri: string ): Promise<any> {
    try {
        const { tokens } = await oauth2Client.getToken({code: authCode, redirect_uri: redirect_uri});
        oauth2Client.on('tokens', (tokens) => {
            if (tokens.refresh_token) {
                // store the refresh_token in my database!
                console.log("refresh_token", tokens.refresh_token);
            }
            console.log("access_token", tokens.access_token);
        });

        if (tokens) {
            oauth2Client.setCredentials(tokens);
        } else {
            //refresh token
            await oauth2Client.refreshAccessToken();
            throw new Error('Failed to retrieve tokens');
        }

        const oauth2 = google.oauth2({
            version: 'v2',
            auth: oauth2Client,
        });

        const profile = await oauth2.userinfo.get(); //include the user profile in the token data
        const token_data = { ...tokens, ...profile.data };
        return token_data;
    } catch (error) {
        throw new ApiError(400, 'Invalid Authentication Code or Error retrieving access token', error);
    }
}

export async function validateToken(google_data: { access_token: string, refresh_token: string, scope: string, expiry_date: number }): Promise<any> {
    oauth2Client.setCredentials({
        access_token: google_data.access_token,
        refresh_token: google_data.refresh_token,
        scope: google_data.scope,
        expiry_date: google_data.expiry_date, // Timestamp when the token expires
    });

    try {
        const tokenInfo = await oauth2Client.getAccessToken();
        if (!tokenInfo.token) {
            console.log("Token has expired or is invalid.");

            //refresh access token
            const newTokens = await oauth2Client.refreshAccessToken();
            oauth2Client.setCredentials(newTokens.credentials);

            return { valid: true, new_token: newTokens.credentials, oauth:  oauth2Client};
        }
        return { valid: true, new_token: false, oauth: oauth2Client};
    } catch (error) {
        console.log("Error checking token:", error);
        return { valid: false };
    }
}
