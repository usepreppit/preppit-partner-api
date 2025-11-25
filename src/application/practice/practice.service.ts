import { inject, injectable } from 'inversify';
import { Logger } from '../../startup/logger';
import { ApiError } from '../../helpers/error.helper';
import mongoose from 'mongoose';
import { IPractice } from './models/practice.model';
import { IPracticeLogs } from './models/practice_logs.model';
import { IExamScenarios } from '../exams/models/exam_scenarios.model';
import { PracticeRepository } from './models/practice.repository';
import { ExamsRepository } from '../exams/models/exams.repository';
import { formatExamScenario } from '../../helpers/vapi/vapi.helper';
import { breakdownPractice } from '../../helpers/practice.helper';
import { PracticeStatus } from './models/practice.model';
import { getAllObjectsInBucket } from '../../helpers/upload_to_s3.helper';
import { promptAiStudio } from '../../helpers/thirdparty/googleaistudio.helper';
import { UserRepository } from '../users/models/user.repository';


@injectable()
export class PracticeService {
    constructor(
		@inject(Logger) private readonly logger: Logger,
		@inject(ExamsRepository) private readonly examsRepository: ExamsRepository,
        @inject(PracticeRepository) private readonly practiceRepository: PracticeRepository,
		@inject(UserRepository) private readonly userRepository: UserRepository,
    ) {}

    
	async GetScenario(userId: string, examId: string, scenarioId: string | null = null): Promise<IExamScenarios | null> {
		try {
			this.logger.info('Starting practice for user:', userId);

			//Get the exam scenario and formats to vapi then send back to frontend
			const valid_exam = await this.examsRepository.getExamById(examId);
						
			if (!valid_exam) {
				throw new ApiError(500, 'Invalid exam selected, Exam not found');
			}

			/** if scenario is set, get a practice session for the specific scenario set by the user 
			* But if no scenario is set check for the user completed sessions without the recently completed scenarios
			* If user hasnt completed any scenario just bring a random one **/
			let practice_session;
			if (scenarioId) {
				practice_session = await this.practiceRepository.getPracticeScenario(scenarioId)
			} else {
				//get the recently completed practices by the user
				const recently_completed_scenarios = await this.practiceRepository.getUserPracticeSessions(userId) as any[];
				console.log('recently_completed_scenarios', recently_completed_scenarios);
				practice_session = await this.practiceRepository.getExcludedPracticeScenarios(examId, recently_completed_scenarios);
			}

			return practice_session;
		} catch (error) {
			this.logger.error('Error starting practice', error);
			throw new ApiError(500, 'Failed to start practice');
		}
	}

	async GetPracticeById(practiceId: string): Promise<IPractice | null> {
		try {
			this.logger.info('Fetching practice session by ID:', practiceId);
			const practice_session = await this.practiceRepository.getPracticeSessionById(practiceId);
			if (!practice_session) {
				this.logger.warn(`Practice session with ID ${practiceId} not found`);
				throw new ApiError(404, 'Practice session not found');
			}
			return practice_session;
		} catch (error) {
			this.logger.error('Error fetching practice session by ID', error);
			throw new ApiError(500, 'Failed to fetch practice session', error);
		}
	}

	async GetPracticeDetails(practiceId: string): Promise<any> {
		try {
			this.logger.info('Fetching practice details for practice ID:', practiceId);
			const practice_session = await this.practiceRepository.getPracticeSessionDetailsById(practiceId);

			// if(practice_session) return practice_session;
			if (!practice_session) {	
				this.logger.warn(`Practice session with ID ${practiceId} not found`);
				throw new ApiError(404, 'Practice session not found');
			}

			const responsePracticeDetails = {
				...practice_session.practice_id,
				practice_transcript: practice_session.practice_log?.message?.messages || [],
				practice_recordng_url: practice_session.practice_log?.message?.recordingUrl || "",
			}
			return responsePracticeDetails;
		} catch (error) {
			this.logger.error('Error fetching practice details', error);
			throw new ApiError(500, 'Failed to fetch practice details', error);
		}
	}

	async GetPracticeHistory(userId: string): Promise<IPractice[] | null> {
		try {
			this.logger.info('Fetching practice history for user:', userId);
			const practice_history = await this.practiceRepository.getUserPracticeSessions(userId);
			if (!practice_history) {
				this.logger.warn(`No practice history found for user ${userId}`);
				throw new ApiError(404, 'No practice history found');
			}
			return practice_history;
		} catch (error) {
			this.logger.error('Error fetching practice history', error);
			throw new ApiError(500, 'Failed to fetch practice history', error);
		}
	}

	async StartPractice(userId: string, examId: string, scenarioId: string): Promise<{ scenario_assistant: any, scenario: IExamScenarios, practice_id: string } | null | any> {
		try {
			this.logger.info('Starting practice for user:', userId);

			// Get the exam scenario and formats to vapi then send back to frontend
			const scenario_filter = { _id: new mongoose.Types.ObjectId(scenarioId), examId: new mongoose.Types.ObjectId(examId) };
			const valid_exam = await this.practiceRepository.getPracticeScenarioByFilter(scenario_filter) as IExamScenarios;

			if (!valid_exam) {
				throw new ApiError(500, 'Invalid exam or practice scenario selected, Scenario not found');
			}


			if (valid_exam.reference_check != true) {//means reference check is complete
				//If exam is valid get the references for the exams and their uploaded links
				const objects_in_bucket = await getAllObjectsInBucket('prep-references') as any[];

				if (objects_in_bucket) {
					// console.log('objects_in_bucket', objects_in_bucket);
					//map through the references and get the Keys
					const bucket_keys = objects_in_bucket.map(obj => obj.Key);

					//get the references from the valid exam and check if they exist in the bucket keys using google prompt
					// const valid_references = valid_exam?. || [];
					const exam_references = valid_exam.question_details.references || [];

					const get_suggested_references = await promptAiStudio(`Given the following list of reference documents: ${bucket_keys.join(', ')},
					and the following list of references needed: ${exam_references.join(', ')},
					List out the references that are available in the document list that can be used to answer the candidate instructions., response should be a json object with the exam reference and the matched reference like { exam_reference_name: matched bucket_join_reference }.
					If none of the references are available, just reply with "No references available"`, "gemini-2.0-flash", false);


					//get the references url from the cf references pub url
					const cf_references_pub_url = process.env.CF_REFERENCES_PUB_URL || 'https://pub-0b5611b195f04decba8e5c77857024c0.r2.dev';
					let references_array: object[] = []

					console.log("get_suggested_references", get_suggested_references);

					//if there is an error from getting suggested references api call, throw an APi Error
					if (!get_suggested_references || get_suggested_references == "" || typeof get_suggested_references === "undefined") {
						this.logger.error('Error fetching suggested references from AI Studio');
						throw new ApiError(500, 'Error fetching suggested references from AI Studio');
					}

					if (!(get_suggested_references as string).toLowerCase().includes('no references available')) {
						const suggested_references_urls = [] as Array<{ name: string, url: string }>;

						console.log("get suggested references", JSON.parse(get_suggested_references));
						const parse_references = JSON.parse(get_suggested_references as string);
						let formatted_references_array: object[] = [];

						//check if parse references is an object
						if (!Array.isArray(parse_references)) {
							formatted_references_array.push(parse_references);
						} else {
							formatted_references_array = parse_references;
						}

						formatted_references_array.forEach((reference: object) => {
							const formatted_reference = encodeURIComponent(Object.values(reference)[0] as string);
							const reference_url = `${cf_references_pub_url}/${formatted_reference}`;

							const reference_object = { name: Object.keys(reference)[0] as string, url: reference_url };
							suggested_references_urls.push(reference_object);
						});

						references_array = suggested_references_urls;
					} else {
						references_array = [];
					}

					//Update the exam scenario with the available references
					await this.examsRepository.updateExamScenario(scenarioId, { available_references: references_array, reference_check: true });
					valid_exam.available_references = references_array;
				}
			} else {
				//no Reference check has been done on this return that the scenario is not active and not available for practice
				// this.logger.info("Selected scenario is not available for practice");
				// throw new ApiError(412, "Selected scenario is not available for practice, References has not been prepared")
			}

			//add a new practice session in the database with the userId and scenarioId
			const create_practice = await this.practiceRepository.createPracticeSession(userId, examId, scenarioId);

			//Exam and scenario gotten
			const format_exam_scenario = await formatExamScenario(valid_exam, userId, create_practice._id as string);

			return { scenario_assistant : format_exam_scenario, scenario: valid_exam, practice_id: create_practice._id as string };
		} catch (error) {
			this.logger.error('Error starting practice', error);
			throw new ApiError(500, 'Failed to start practice', error);
		}
	}

	async GetPracticeUsageAnalytics(user_id: string, start_date: Date, end_date: Date): Promise<any | null> {
		try {
			//get user usage analytics
			this.logger.info('Getting users practice usage analytics');
			const usage_analytics = await this.practiceRepository.GetPracticeUsageAnalytics(user_id, start_date, end_date);
			return usage_analytics;
		} catch (error) {
			this.logger.error(`Error Getting User Practice Usage Analytics: ${error}`);
			throw new ApiError(400, 'Error Getting User Practice Usage Analytics', error);
		}
	}

	async GetPracticeEvaluation(practiceId: string): Promise<any> {
		try {
			this.logger.info('Fetching practice evaluation for practice:', practiceId);
			const practice_session = await this.practiceRepository.getPracticeSessionById(practiceId) as any;
			
			if (!practice_session) {
				throw new ApiError(500, 'Invalid practice session');
			}

			return practice_session;
		} catch (error) {
			this.logger.error(`Error Getting User Practice Evaluation: ${error}`)
			throw new ApiError(400, 'Error Getting User Practice Evaluation', error);
		}
	}

	async EvaluateUserPractice(practiceId: string): Promise<any> {
		try {
			this.logger.info('Evaluating practice for practice:', practiceId);
			// Get the practice session and extract the other details
			const practice_session = await this.practiceRepository.getPracticeLogFromPracticeId(practiceId) as IPracticeLogs;

			if (!practice_session) {
				throw new ApiError(500, 'Result not yet available, Practice session not completed');
			}


			const practice_log = practice_session.practice_log as any;
			const transcript = practice_log.message.transcript || "";

			if (
				typeof practice_session.practice_id === 'object' &&
				'status' in practice_session.practice_id &&
				'evaluation' in practice_session.practice_id &&
				(practice_session.practice_id as IPractice).status === PracticeStatus.FINISHED &&
				Object.keys((practice_session.practice_id as IPractice).evaluation).length != 0 
			) {
				return { evaluation: (practice_session.practice_id as IPractice).evaluation, station_info: {} }
			} else {
				//Get the Evaluation from the practice session
				const evaluation_prompt = `You are an expert call evaluator, you will be given the transcript of a call and the system prompt of the AI participant, Determine if the call was successful based on the objectives inferred from the system prompt
											## Transcript
											${transcript}

											Based on the practice session, determine which competencies should be included in evaluation and also include an overall score of 100. for the overall score, 
											Factor in the competencies, feedback and competencies covered and how short or long conversation was, longer conversations mean higher score also include competencies feedback in the feedback sections.

											Represent all AI terminology in the response with human friendly terms, example AI patients is Patient.
											## Examiner Objectives

											As Examiner the objective is to evaluate whether the candidate:  
											1. Gathers appropriate patient history  
											2. Assesses prescription appropriateness and place in therapy  
											3. Recommends evidence-based alternatives or follow-up actions  
											4. Demonstrates clear and professional communication  


											## Evaluation Criteria
											{{ Evaluation_Criteria }}


											Response should be in json with as many fields as possible filled

											{
												"station_info": {
													"station_id": "{{station_id}}",
													"station_name": "{{station_name}}",
													"station_time": "{{station_time}}",
													"patient_name": "{{patient_name}}",
													"patient_age": "{{patient_age}}",
													"condition": "{{condition_name}}",
													"prescription": "{{prescription_text}}"
												},
												{
													"evaluation": {
														"success_evaluation": "{{ true | false}}
														"overall_score": "{{score_out_of_100}}",
														"overall_score_breakdown" : {
															history_taking: "{{score_out_of_100}}",
															appropriateness: "{{score_out_of_100}}",
															recommendations: "{{score_out_of_100}}",
															patient_safety: "{{score_out_of_100}}",
															soft_skills: "{{score_out_of_100}}"
															ethical_legal_professional_responsibilities: "{{score_out_of_100}}",
															patient_care: "{{score_out_of_100}}",
															product_distribution: "{{score_out_of_100}}",
															practice_setting: "{{score_out_of_100}}",
															health_promotion: "{{score_out_of_100}}",
															knowledge_research_application: "{{score_out_of_100}}",
															communication_education: "{{score_out_of_100}}",
															intra_inter_professional_collaboration: "{{score_out_of_100}}",
															quality_safety: "{{score_out_of_100}}"
														}
														"technical_performance": {
															"history_taking": {
																"asked_reason_for_visit": "{{achieved|partial|not_achieved}}",
																"assessed_symptoms": "{{achieved|partial|not_achieved}}",
																"confirmed_medical_history": {
																	"medications": "{{achieved|partial|not_achieved}}",
																	"conditions": "{{achieved|partial|not_achieved}}",
																	"allergies": "{{achieved|partial|not_achieved}}",
																	"otc_herbals": "{{achieved|partial|not_achieved}}",
																	"alcohol_use": "{{achieved|partial|not_achieved}}"
																}
															},
															"appropriateness": {
																"identified_prescription_indication": "{{achieved|partial|not_achieved}}",
																"recognized_inappropriateness": "{{achieved|partial|not_achieved}}",
																"assessed_non_pharm_optimization": "{{achieved|partial|not_achieved}}"
															},
															"recommendations": {
																"contacted_prescriber": "{{achieved|partial|not_achieved}}",
																"suggested_alternatives": [
																	"{{alternative_1}}",
																	"{{alternative_2}}"
																],
																"reinforced_non_pharm": "{{achieved|partial|not_achieved}}",
																"offered_follow_up": "{{achieved|partial|not_achieved}}"
															},
															"patient_safety": {
																"avoided_inappropriate_dispense": "{{achieved|partial|not_achieved}}",
																"provided_rationale": "{{achieved|partial|not_achieved}}",
																"avoided_misinformation": "{{achieved|partial|not_achieved}}"
															},
															"competencies": {
																"ethical_legal_professional_responsibilities": {
																	"practised_within_legal_requirements": "{{achieved|partial|not_achieved}}",
																	"demonstrated_professionalism": "{{achieved|partial|not_achieved}}",
																	"upheld_standards_ethics_policies": "{{achieved|partial|not_achieved}}"
																},
																"patient_care": {
																	"partnered_with_patient": "{{achieved|partial|not_achieved}}",
																	"collaborated_with_health_professionals": "{{achieved|partial|not_achieved}}",
																	"met_health_drug_needs": "{{achieved|partial|not_achieved}}"
																},
																"product_distribution": {
																	"ensured_accuracy": "{{achieved|partial|not_achieved}}",
																	"ensured_safety": "{{achieved|partial|not_achieved}}",
																	"ensured_appropriateness": "{{achieved|partial|not_achieved}}"
																},
																"practice_setting": {
																	"oversaw_practice_safety": "{{achieved|partial|not_achieved}}",
																	"ensured_effectiveness": "{{achieved|partial|not_achieved}}",
																	"ensured_efficiency": "{{achieved|partial|not_achieved}}"
																},
																"health_promotion": {
																	"advanced_patient_wellness": "{{achieved|partial|not_achieved}}",
																	"promoted_community_health": "{{achieved|partial|not_achieved}}",
																	"supported_population_health": "{{achieved|partial|not_achieved}}"
																},
																"knowledge_research_application": {
																	"accessed_relevant_information": "{{achieved|partial|not_achieved}}",
																	"critically_analyzed_information": "{{achieved|partial|not_achieved}}",
																	"applied_evidence_in_practice": "{{achieved|partial|not_achieved}}"
																},
																"communication_education": {
																	"communicated_effectively": "{{achieved|partial|not_achieved}}",
																	"educated_patients": "{{achieved|partial|not_achieved}}",
																	"educated_team_and_public": "{{achieved|partial|not_achieved}}"
																},
																"intra_inter_professional_collaboration": {
																	"collaborated_with_pharmacy_team": "{{achieved|partial|not_achieved}}",
																	"collaborated_with_other_health_professionals": "{{achieved|partial|not_achieved}}",
																	"ensured_continuity_of_care": "{{achieved|partial|not_achieved}}"
																},
																"quality_safety": {
																	"developed_quality_policies": "{{achieved|partial|not_achieved}}",
																	"implemented_quality_activities": "{{achieved|partial|not_achieved}}",
																	"evaluated_safety_measures": "{{achieved|partial|not_achieved}}"
																}
															}
														},
														"soft_skills": {
															"clarity": "{{excellent|good|needs_improvement|poor}}",
															"listening": "{{excellent|good|needs_improvement|poor}}",
															"empathy": "{{excellent|good|needs_improvement|poor}}",
															"rapport": "{{excellent|good|needs_improvement|poor}}",
															"professionalism": "{{excellent|good|needs_improvement|poor}}"
														},
														"global_rating": {
															"technical_competence": "{{excellent|good|needs_improvement|poor}}",
															"communication_competence": "{{excellent|good|needs_improvement|poor}}",
															"patient_safety_risk": "{{yes|no}}"
														},
														"feedback": {
															"strengths": [
																"{{strength_example_1}}",
																"{{strength_example_2}}"
																"{{strength_example_3_optional}}"
																"{{strength_example_4_optional}}"
															],
															"areas_for_improvement": [
																"{{improvement_example_1}}",
																"{{improvement_example_2}}"
																"{{improvement_example_3_optional}}"
																"{{improvement_example_4_optional}}"
															],
															"examiner_notes": "{{free_text_notes}}"
														}
													}
												}
											}`;
				const evaluation_response = JSON.parse(await promptAiStudio(evaluation_prompt));
				
				//based on the evaluation response update the practice session with the evaluation response and mark as completed

				const practice_update = { 
					evaluation: evaluation_response?.evaluation,
					score: evaluation_response?.evaluation?.overall_score || 0,
					completedAt: new Date(),
					status: PracticeStatus.FINISHED,
					analysis: await breakdownPractice({ structuredData: evaluation_response })
				}
				await this.practiceRepository.updatePracticeSessionById(practiceId, practice_update);
				
				return evaluation_response;
			}
		} catch (error) {
			this.logger.error('Error evaluating practice', error);
			throw new ApiError(500, 'Failed to evaluate practice', error);
		}
	}

	async EvaluatePractice(practiceId: string, response: any): Promise<any> {
		try {
			this.logger.info('Evaluating practice for practice:', practiceId);
			// Get the practice session and extract the other details
			const practice_session = await this.practiceRepository.getPracticeSessionById(practiceId) as any;

			if (!practice_session) {
				throw new ApiError(500, 'Invalid practice session');
			}

			// if (practice_session.status === PracticeStatus.FINISHED) {
			// 	throw new ApiError(400, 'Practice session already finished');
			// }


			const userId = practice_session.userId as string;
			const scenarioId = practice_session.scenarioId as string;
			const examId = practice_session.examId as string;


			const scenario_filter = { _id: new mongoose.Types.ObjectId(scenarioId), examId: new mongoose.Types.ObjectId(examId) };
			const valid_exam = await this.practiceRepository.getPracticeScenarioByFilter(scenario_filter) as IExamScenarios;

			if (!valid_exam) {
				throw new ApiError(500, 'Invalid exam or practice scenario selected, Scenario not found');
			}

			if (!userId || !examId || !scenarioId) {
				throw new ApiError(500, 'Incomplete practice session data');
			} 
			
			//Ensure the response we are parsing only the end of call reports
			const evaluation_response = response.message;
			if (!evaluation_response || !evaluation_response.type || evaluation_response.type !== 'end-of-call-report') {
				throw new ApiError(400, 'Only end of call reports are accepted');
			}

			const practice_breakdown = await breakdownPractice(evaluation_response.analysis);

			const practice_update = { 
				completedAt: new Date(),
				practiceCost: evaluation_response?.cost || 0,
				timeSpentMinutes: evaluation_response?.durationMinutes || 0,
				timeSpentSeconds: evaluation_response?.durationSeconds || 0,
				status: PracticeStatus.FINISHED,
				analysis_full: evaluation_response?.analysis,
				analysis: practice_breakdown
			}
			const evaluation_analysis = await this.practiceRepository.updatePracticeSessionById(practiceId, practice_update);

			//save the evaluation logs
			// const check_existing_logs = await this.practiceRepository.getPracticeLogFromPracticeId(practiceId);
			// if (check_existing_logs) {
			// 	throw new ApiError(400, 'Practice logs already saved');
			// }
			await this.practiceRepository.savePracticeLogs(practiceId, response);
			await this.userRepository.addUserPlanMinutes(userId, (-(evaluation_response?.durationSeconds) || 0), true);
			return evaluation_analysis;
		} catch (error) {
			this.logger.error('Error evaluating practice', error);
			throw new ApiError(500, 'Failed to evaluate practice', error);
		}
	}
}