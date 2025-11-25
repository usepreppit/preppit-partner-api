const { VapiClient } = require("@vapi-ai/server-sdk");
const client = new VapiClient({ token: process.env.VAPI_PRIVATE_KEY });
const assistant_id = process.env.VAPI_ASSISTANT_ID as string;

export const getAssistant = async () => {
    const assistant = await client.assistants.get(assistant_id);
    return assistant;
}

export const getCallDetails = async (call_id: string) => {
    const call = await client.calls.get(call_id);
    return call;
}

export const formatExamScenario = async (scenario_details: any, userId: string | null = null, practice_id: string): Promise<any> => {
    try {
        //format the details to vapi call format
        const vapi_assistant = await getAssistant();
        const question_details = scenario_details.question_details;
        const examiner_gender = scenario_details?.question_details?.questioner_profile?.gender || "Not Specified";

        // if(scenario_details) {
        //     return scenario_details;
        // }

        const server_url = process.env.NODE_ENV === "production" ? `https://api.usepreppit.com/api/practice/evaluate/${practice_id}` : `https://dev-api.usepreppit.com/api/practice/evaluate/${practice_id}`;
        let patient_profile = {};
        let medical_prescription = [];
        let medications_on_table = [];
        let references = [];
        let evaluation_criteria = [];
        let core_information = {} as any;

        //llop through the elements and categorize approriately
        core_information = { ...question_details.questioner_profile}
        if (question_details.elements) {
            for (const profile of question_details.elements) {
                if (profile.type == "standardized_patient_info") {
                    // patient_profile.push(JSON.stringify(profile.content));
                    for(const row of profile.content.script) {
                        core_information[row.prompt] = row.response;
                    }

                    patient_profile = core_information;
                }

                if (profile.type == "prescription_form" && profile.exists == false) {
                    medical_prescription.push(JSON.stringify(profile.content));
                    core_information[profile.title] = profile.content;
                }

                if (profile.type == "medications_on_table" && profile.exists == false) {
                    medications_on_table.push(JSON.stringify(profile.content));
                }

                if (profile.type == "references" && profile.exists == true) {
                    references.push(JSON.stringify(profile.content));
                }

                if (profile.type == "answer_key" && profile.exists == true && profile.section == "patient_records") {
                    evaluation_criteria.push(JSON.stringify(profile.content));
                }

                if (profile.type == "table" && profile.exists == true) {
                    core_information[profile.title] = profile.title;
                    for(const row of profile.content.patient_details) {
                        core_information[row.label] = row.value;
                        
                    }
                    core_information[profile.content.note] = profile.content.note;
                    core_information[profile.content.medication_list] = profile.content.medication_list;
                    core_information[profile.content?.dispensing_history] = profile.content.dispensing_history;
                }
            }
        }

        //include the overrides where neccesary
        vapi_assistant.firstMessage = question_details.actual_opening_statement || "Hello";

        vapi_assistant.assistantOverrides = {
            firstMessage: question_details.actual_opening_statement || "Hello",

            variableValues: {
                Core_Information: JSON.stringify(core_information) || "",
                Evaluation_Criteria: JSON.stringify(evaluation_criteria || []) + JSON.stringify(references || []) || "",
                Patient_Profile: JSON.stringify(patient_profile || []) + JSON.stringify(question_details.questioner_profile || {})  || "",
                Other_Information: JSON.stringify(references || []) || ""
            },
            server: {
                // url: `https://dev-api.usepreppit.com/api/practice/evaluate/${practice_id}`,
                url: `${server_url}`,
            },
            metadata: {
                examId: scenario_details.examId,
                userId: userId,
                scenario_id: scenario_details._id,
                practice_id: practice_id
            }
        }

        //handle gender switch
        if (examiner_gender.toLowerCase() === "female" ) {
            vapi_assistant.assistantOverrides.voice = { provider: "vapi", voiceId: "Kylie" };
        }
        return vapi_assistant;

    } catch (error) {
        console.error("Error formatting exam scenario:", error);
        throw new Error("Failed to format exam scenario");
    }
}

export const formatExamScenarioOld = async (scenario_details: any, userId: string | null = null, practice_id: string): Promise<any> => {
    try {
        //format the details to vapi call format
        const vapi_assistant = await getAssistant();
        const question_details = scenario_details.question_details;

        //include the overrides where neccesary
        vapi_assistant.firstMessage = question_details.script_and_answers.question;
        vapi_assistant.assistantOverrides = {
            firstMessage: question_details.script_and_answers.question,
            variableValues: {
                Core_Information: question_details.script_and_answers.answer,
                Evaluation_Criteria: question_details.assessor_sheet.checklist[0],
                Patient_Profile: question_details.patient_profile?.text || ""
            },
            server: {
                // url: `https://dev-api.usepreppit.com/api/practice/evaluate`,
                url: `https://8ba8b355ad9f.ngrok-free.app/api/practice/evaluate/${practice_id}`,
            },
            metadata: {
                examId: scenario_details.examId,
                userId: userId,
                scenario_id: scenario_details._id
            }
        }
        return vapi_assistant;

    } catch (error) {
        console.error("Error formatting exam scenario:", error);
        throw new Error("Failed to format exam scenario");
    }
}

