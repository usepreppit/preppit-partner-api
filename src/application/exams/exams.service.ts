import { inject, injectable } from 'inversify';
import { Logger } from '../../startup/logger';
import { ApiError } from '../../helpers/error.helper';
import { IExam } from './models/exams.model';
import { IUser } from '../users/types/user.types';
import { IExamScenarios } from './models/exam_scenarios.model';
import { IExamSubscriptions } from './models/exam_subscriptions.model';
import { ExamsRepository } from './models/exams.repository';
import { Request } from 'express';
// import { extractPage } from '../../helpers/pdf/pdf.helper';
import { uploadBufferToCFBucket, uploadToCFBucket } from '../../helpers/upload_to_s3.helper';
import { pluginLogin, createTask, uploadFile, splitPdf, downloadPdf } from '../../helpers/pdf/pdf.plugins';
import { promptAiStudio, generateGeminiImage } from '../../helpers/thirdparty/googleaistudio.helper';
import mongoose from 'mongoose';
import { UserRepository } from '../users/models/user.repository';
import { PostmarkEmailService } from '../../helpers/email/postmark.helper';
import { postmarkTemplates } from '../../templates/postmark.templates';


@injectable()
export class ExamsService {
    constructor(
		@inject(Logger) private readonly logger: Logger,
        @inject(ExamsRepository) private readonly examRepository: ExamsRepository,
		@inject(UserRepository) private readonly userRepository: UserRepository,
		@inject(PostmarkEmailService) private readonly emailService: PostmarkEmailService,

    ) {}

    async GetExams(filter: Record<string, any> = {}, page: number = 1, limit: number = 20): Promise<{
        exams: IExam[];
        pagination: {
            current_page: number;
            per_page: number;
            total: number;
            total_pages: number;
            has_next: boolean;
            has_previous: boolean;
        };
    }> {
		try {
			this.logger.info('Fetching exams with filter:', filter);
			const result = await this.examRepository.getExams(filter, page, limit);
			this.logger.info(`Fetched ${result.exams.length} exams (page ${page}/${result.pagination.total_pages})`);
			return result;
		} catch (error) {
			this.logger.error('Error fetching exams', error);
			throw new ApiError(500, 'Failed to fetch exams', error);
		}
	}

	async GetMyExams(userId: string): Promise<any> {
		try {
			this.logger.info(`Fetching exams for user ID: ${userId}`);
			
			const exams = await this.examRepository.getMyExams(userId);
			this.logger.info(`Fetched ${exams.length} exams for user ${userId}`);
			return exams;
		} catch (error) {
			this.logger.error('Error fetching my exams', error);
			throw new ApiError(500, 'Failed to fetch my exams', error);
		}
	}

	async GetExamById(id: string): Promise<IExam | null> {
		try {
			this.logger.info(`Fetching exam with ID: ${id}`);
			const exam = await this.examRepository.getExamById(id);
			if (!exam) {
				this.logger.warn(`Exam with ID ${id} not found`);
				throw new ApiError(404, 'Exam not found');
			}
			return exam;
		} catch (error) {
			this.logger.error('Error fetching exam by ID', error);
			throw new ApiError(500, 'Failed to fetch exam', error);
		}
	}

	async GetExamAnalytics(userId: string, examId: string): Promise<any> {
		try {
			this.logger.info(`Fetching exam analytics for user ID: ${userId} and exam ID: ${examId}`);
			const analytics = await this.examRepository.getExamAnalytics(userId, examId);
			this.logger.info(`Fetched exam analytics for user ID: ${userId} and exam ID: ${examId}`);
			return analytics;
		} catch (error) {
			this.logger.error('Error fetching exam analytics', error);
			throw new ApiError(500, 'Failed to fetch exam analytics', error);
		}
	}

	async JoinExam(examId: string, userId: string, exam_details: { exam_date: string, daily_practice_frequency: string }, user_details: IUser): Promise<any> {
		try {
			this.logger.info(`User ${userId} attempting to join exam ${examId}`);
			const exam = await this.examRepository.getExamById(examId);
			if (!exam) {
				this.logger.warn(`Exam with ID ${examId} not found`);
				throw new ApiError(404, 'Exam not found');
			}

			//create new record for a user joining the exam
			const user_enrollment = {
				examId: new mongoose.Types.ObjectId(examId),
				userId: new mongoose.Types.ObjectId(userId),
				exam_date: new Date(exam_details.exam_date),
				exam_practice_frequency: exam_details.daily_practice_frequency,
				joinedAt: new Date()
			};
			// Here you would typically save the enrollment to a database
			const enroll_user = await this.examRepository.EnrollUserInExam(user_enrollment);

			//User successfully enrolled, Check if thats the first time exam subscription add 4 Minutes of practice time to the user
			if (user_details.user_first_enrollment != true) {
				// Add the bonus practice time only if it's the user's first enrollment
				// Update the user's first enrollment status to false
				await this.userRepository.updateById(userId, { user_first_enrollment: true, user_balance_seconds: 300 }); // Add 5 minutes (300 seconds) bonus practice time

				//send email congratulating them on joining their first exam and also that they have received bonus practice time
				this.logger.info(`User ${userId} received bonus practice time for first exam enrollment`);
				this.emailService.sendTemplateEmail(
					postmarkTemplates.FIRST_EXAM_JOINING_EMAIL,
					user_details.email,
					{ firstname: user_details.firstname }
				);


			}
			this.logger.info(`User ${userId} joined exam ${examId} successfully`);
			return enroll_user;
		} catch (error) {
			this.logger.error('Error joining exam', error);
			throw new ApiError(500, 'Failed to join exam, you might have joined this exam already', error);
		}
	}

	async GetExamScenarios(examId: string, userId: string, user_progress: boolean, _account_type?: 'admin' | 'partner', page: number = 1, limit: number = 20): Promise<any> {
		try {
			if(user_progress && !userId) {
				throw new ApiError(412, 'Unable to get user progress');
			}

			const result = user_progress 
				? await this.examRepository.getExamScenariosWithProgress(examId, userId, page, limit)
				: await this.examRepository.getExamScenarios(examId, page, limit);

			return result;
		} catch (error) {
			this.logger.error('Error getting exam scenarios', error);
			throw new ApiError(500, 'Error getting exam scenarios', error);
		}
	}

	async GetExamScenarioById(examId: string, userId: string, scenarioId: string | null, account_type?: 'admin' | 'partner'): Promise<IExamScenarios | IExamScenarios[] | null> {
		try {
			// Admins can access scenarios without being enrolled
			if (account_type !== 'admin') {
				// Check that the user has access to the exam
				const is_user_exam = await this.examRepository.getUserExamEnrollment(userId, examId);
				
				if(!is_user_exam) {
					throw new ApiError(403, 'You do not have access to this exam, join the exam to access the scenarios');
				}
			}
			
			const exam_scenario = await this.examRepository.getExamScenarioById(examId, scenarioId);

			//parse the references attached to the exam scenario
			const scenario_references = exam_scenario?.question_details?.references || [];
			
			if(exam_scenario?.reference_check) return exam_scenario;
			
			if(scenario_references.length > 0) {
				//get the references as a string seperated by commas
				//call the google gemini api to get 
				const reference_prompt = `In this text the reference string(s) is the array in the square brackets [${scenario_references}] with each reference separated by ---. Search each reference for any drug, process, treatments, ailment or human organs and remove it. Simplify the reference string into a generic source type using the following mapping examples:
											Abbreviations like CPS should be shown as they are
											Health Canada print out regarding rapid heartbeats with Citalopram → Health Canada Monograph
											Plan B monograph → Drug Monograph
											Condensed printout of dry mouth from RxTx → RxTx Printout
											Biaxin® (clarithromycin) monograph → Drug Monograph
											Minor Ailments -> minor ailments
											Viagra patient info print out → Patient Printout
											Pharmacist letter Nitrates and Phosphodiesterase Type Five Inhibitors → Pharmacist Letter
											Return the parsed references as an array with no additional text and special characters, newlines tabs etc or explanation.`;
				
				//call the google gemini api to parse the references
				try {
					const parse_references = await promptAiStudio(reference_prompt);
					if(exam_scenario) {
						exam_scenario.question_details.parsed_references = parse_references; 
						exam_scenario.question_details.references_checked = true;
						exam_scenario.reference_check = true;
					}

					//Update the reference check fields
					this.examRepository.updateExamScenario(exam_scenario?._id as string, { "question_details.parsed_references": parse_references, "question_details.references_checked": true, reference_check: true });

					return exam_scenario;
				} catch (error) {
					console.log('Error parsing references:', error);
					if(error instanceof ApiError) {
						throw error;
					}
					console.error('Error parsing references:', error);
				}				
				
			} else {
				if(exam_scenario)
					exam_scenario.question_details.parsed_references = '';
				this.examRepository.updateExamScenario(exam_scenario?._id as string, { "question_details.parsed_references": '', "question_details.references_checked": true, reference_check: true });

			}
			return exam_scenario
		} catch (error) {
			this.logger.error('Error getting exam scenario by ID', error);
			throw new ApiError(500, 'Error getting exam scenario by ID', error);
		}
	}

	async CreateExam(examData: Partial<IExam>): Promise<IExam> {
		try {
			this.logger.info('Creating new exam with data:', examData);
			const newExam = await this.examRepository.createExam(examData);
			this.logger.info(`New exam created with ID: ${newExam._id}`);
			return newExam;
		} catch (error) {
			this.logger.error('Error creating exam', error);
			throw new ApiError(500, 'Failed to create exam', error);
		}
	}

	async AddExamScenarios(examId: string, data: any): Promise<Partial<IExamScenarios>[] | null> {
		try {
			this.logger.info(`Adding scenarios to exam ID: ${examId}`);
			const exam = await this.examRepository.getExamById(examId);
			if (!exam) {
				this.logger.warn(`Exam with ID ${examId} not found`);
				throw new ApiError(404, 'Exam not found');
			}

			if (!Array.isArray(data.scenarios) || data.scenarios.length === 0) {
				this.logger.warn('No scenarios provided to add');
				throw new ApiError(400, 'Scenarios must be a non-empty array');
			}
			console.log('Received scenarios data:', data);

			// Assuming exam has a scenarios field which is an array loop through and create the scenario object for a bulk write
			const scenarios = data.scenarios.map((scenario: any) => ({
				question_details: scenario,
				document_url: data.document_url,
				examId: new mongoose.Types.ObjectId(examId),
				page_number: scenario.page || 0,
				status: data.status || 'active', // Default to active if not provided
				provider: data.exam_provider,
				createdAt: new Date(),
				updatedAt: new Date()
			}));

			const saveScenarios = await this.examRepository.BulkSaveExamScenarios(scenarios);
			return saveScenarios;
		} catch (error) {
			this.logger.error('Error adding exam scenarios', error);
			throw new ApiError(500, 'Failed to add exam scenarios', error);
		}
	}

	async GetExamSubscriptions(examId: string): Promise<IExamSubscriptions[] | null> {
		try {
			this.logger.info(`Fetching subscriptions for exam ID: ${examId}`);
			const subscriptions = await this.examRepository.getExamSubscriptions(examId);


			this.logger.info(`Fetched ${subscriptions?.length} subscriptions for exam ID: ${examId}`);
			return subscriptions;
		} catch (error) {
			this.logger.error('Error fetching exam subscriptions', error);
			throw new ApiError(500, 'Failed to fetch exam subscriptions', error);
		}
	}

	async CreateExamSubscription(examId: string, subscriptionData: Partial<IExamSubscriptions>): Promise<IExamSubscriptions> {
		try {
			this.logger.info(`Creating subscription for exam ID: ${examId} with data:`, subscriptionData);
			const exam = await this.examRepository.getExamById(examId);
			if (!exam) {
				this.logger.warn(`Exam with ID ${examId} not found`);
				throw new ApiError(404, 'Exam not found');
			}

			const newSubscriptionData = {
				...subscriptionData,
				examId: new mongoose.Types.ObjectId(examId),
			};

			const newSubscription = await this.examRepository.createExamSubscription(newSubscriptionData);
			this.logger.info(`New subscription created with ID: ${newSubscription._id} for exam ID: ${examId}`);
			return newSubscription;
		} catch (error) {
			this.logger.error('Error creating exam subscription', error);
			throw new ApiError(500, 'Failed to create exam subscription', error);
		}
	}

	async GetAiMedicationImage(): Promise<void | any> {
		try {
			this.logger.info('Starting to get AI medication image');
			const get_medications_on_table = await this.examRepository.getMedicationsOnTableExams();
			if(!get_medications_on_table) {
				return;
			}

			const text = get_medications_on_table.question_details.medications_on_table.text;

			console.log('Medications on table text:', text);
			const generate_image = await generateGeminiImage(`Create image from the text below ${text}, Ensure image is clear and well zoomed out, background should be white, Image result based on availability in canada`);

			//If the response is not null then update the exams scenario with the image url and also prevent it from being crawled again
			if(generate_image) {
				const update_scenario = await this.examRepository.updateExamScenario(get_medications_on_table._id as string, { "question_details.medications_on_table.image_url": generate_image, "question_details.medications_page_data": true });
				console.log('Updated scenario with AI image:', update_scenario);
			}
			return generate_image;
		} catch (error) {
			this.logger.error('Error getting AI medication image', error);
			throw new ApiError(500, 'Failed to get AI medication image', error);
		}
	}

	async GenerateScenarioImages(): Promise<void | any> {
		try {
			this.logger.info('Starting to generate scenario images for exams');
			const get_scenarios_pending_image_checks = await this.examRepository.getExamScenarioByFilter(
				{ 
					$or: [
						{ image_check: { $exists: false } },  
						{ image_check: null },                  
						{ image_check: false }            
					]
				}
			);

			if(!get_scenarios_pending_image_checks) {
				this.logger.info('No exam scenarios found pending image generation');
				return;
			}

			const element_details = get_scenarios_pending_image_checks.question_details?.elements;
			if(!element_details || element_details.length === 0) {
				this.logger.info('No elements found in exam scenario for image generation');
				return;
			}

			let image_prompt;
			let index = 0;
			for(const element of element_details) {

				if(element.type == "image" && element.exists == true && element.section != "references" && (!element.image_url || element.image_url === "" || typeof element.image_url === "undefined")) {
					image_prompt = element.description || "";
					break;
				}
				index++;
			}

			//if after all the search there is still no image prompt
			if(!image_prompt) {
				this.logger.info('No image prompt found in exam scenario elements');
				//Update the image check to true to prevent it from being crawled again
				this.examRepository.updateExamScenario(get_scenarios_pending_image_checks._id as string, { image_check: true });
				return;
			} else {
				this.logger.info(`Generating image for prompt: ${image_prompt}`);
				const generate_image = await generateGeminiImage(`${image_prompt}, Background should be white and only drug vial should show`);
				
				if(generate_image) {
					this.examRepository.updateExamScenario(get_scenarios_pending_image_checks._id as string, { [`question_details.elements.${index}.image_url`]: generate_image });
					this.logger.info('Generated image and updated exam scenario successfully');
					return generate_image;
				}
			}
			return element_details;
		} catch (error) {
			this.logger.error('Error generating scenario images', error);
			throw new ApiError(500, 'Failed to generate scenario images', error);
		}
	}

	async SortExamMedicationsOnTable(): Promise<void | any> {
		try {
			this.logger.info('Starting to sort exam medications on table');
			const get_medications_on_table = await this.examRepository.getMedicationsOnTableExams();

			//const get_all_medications_on_table = await this.examRepository.getAllMedicationsOnTableExams() as any;
			console.log('All medications on table exams fetched:', get_medications_on_table);

			if(!get_medications_on_table) {
				return;
			}
			const auth_token = await pluginLogin();

			if(!auth_token) {
				this.logger.error('Failed to obtain plugin auth token');
				throw new ApiError(500, 'Failed to obtain plugin auth token');
			}
						
			const create_task = await createTask(auth_token);

			const server = create_task.server;
			const task_id = create_task.task;

			// loop through each exam scenario to get the page number of the document
			const document_url = get_medications_on_table?.document_url as string;
			const medications_on_table_page = get_medications_on_table.question_details.medications_on_table.page;


			// const exam_scenarios = get_all_medications_on_table[0].scenarios || [];
			// const medications_page_numbers = exam_scenarios.map((scenario: any) => scenario.question_details.medications_on_table.page);
			// const document_url = get_all_medications_on_table[0]?.['_id'] ?? null;

			const upload_file = await uploadFile(auth_token, server, document_url, task_id);

			console.log('Upload file response:', upload_file);

			//generate random name for the original file
			const original_filename = `medications_on_table_${get_medications_on_table._id}_${Date.now()}.pdf`;

			const split_pdf = await splitPdf(auth_token, server, task_id, upload_file, medications_on_table_page, original_filename);

			const download_file = await downloadPdf(auth_token, server, task_id);

			//upload the file to cloudflare based on an array buffer
			const upload_download_buffer = await uploadBufferToCFBucket(download_file, "application/pdf", original_filename, "public", "medications_on_table");

			//save the file as the reference file for that particular medication on table

			return { split_pdf, get_medications_on_table, create_task, upload_download_buffer };

			// console.log('Medications on table exam fetched:', get_medications_on_table);

			// if(!get_medications_on_table) {
			// 	this.logger.info('No exam scenarios found with unsorted medications on table');
			// 	return;
			// }

			// //get the document url and use the pdf helper function to extract just the page where the medications is located
			// const document_url = get_medications_on_table.document_url;
			// const medications_on_table_page = get_medications_on_table.question_details.medications_on_table.page;

			// if(!document_url || !medications_on_table_page) {
			// 	this.logger.warn('Document URL or medications on table page not found');
			// 	return;
			// }

			// //call the pdf helper function to extract the page data
			// // const page_data = await ExtractPDFPageData(document_url, medications_on_table_page);
			// const extracted_page_url = await extractPage(document_url, Number(medications_on_table_page), true, "medications_on_table");
			// console.log('Extracted page URL:', extracted_page_url);
		} catch (error) {
			this.logger.error('Error sorting exam medications on table', error);
			throw new ApiError(500, 'Failed to sort exam medications on table', error);
		}
	}

	async UploadReferenceFile(examId: string, scenarioId: string, req: Request, reference_name?: string): Promise<any> {
		try {
			// Verify the scenario exists
			const scenario = await this.examRepository.getExamScenarioById(examId, scenarioId);
			if (!scenario) {
				throw new ApiError(404, 'Exam scenario not found');
			}

			// Upload file to Cloudinary (R2)
			const uploadResult = await uploadToCFBucket(req, 'file', {}, 'public', 'exam-references');
			
			if (!uploadResult || !uploadResult.document_url) {
				throw new ApiError(500, 'Failed to upload reference file');
			}

			const fileName = reference_name || uploadResult.document_name;
			const fileUrl = uploadResult.document_url;

			// Add to available_references array
			const newReference = {
				name: fileName,
				url: fileUrl,
				uploaded_at: new Date()
			};

			// Update the scenario with new reference
			const updatedScenario = await this.examRepository.addReferenceToScenario(
				scenarioId,
				newReference,
				fileName
			);

			this.logger.info(`Reference file uploaded successfully for scenario ${scenarioId}`);
			return {
				scenario: updatedScenario,
				reference: newReference
			};
		} catch (error) {
			this.logger.error('Error uploading reference file', error);
			if (error instanceof ApiError) {
				throw error;
			}
			throw new ApiError(500, 'Failed to upload reference file', error);
		}
	}

	async UpdateExamScenario(examId: string, scenarioId: string, updateData: any, account_type?: 'admin' | 'partner'): Promise<IExamScenarios | null> {
		try {
			// Verify the scenario exists and belongs to the exam
			const scenario = await this.examRepository.getExamScenarioById(examId, scenarioId);
			if (!scenario) {
				throw new ApiError(404, 'Exam scenario not found');
			}

			// Only admins can update scenarios
			if (account_type !== 'admin') {
				throw new ApiError(403, 'Only admins can update exam scenarios');
			}

			// Prepare update object - only update allowed fields
			const allowedUpdates: any = {};

			if (updateData.question_details !== undefined) {
				allowedUpdates.question_details = updateData.question_details;
			}
			if (updateData.available_references !== undefined) {
				allowedUpdates.available_references = updateData.available_references;
			}
			if (updateData.document_url !== undefined) {
				allowedUpdates.document_url = updateData.document_url;
			}
			if (updateData.page_number !== undefined) {
				allowedUpdates.page_number = updateData.page_number;
			}
			if (updateData.reference_check !== undefined) {
				allowedUpdates.reference_check = updateData.reference_check;
			}
			if (updateData.image_check !== undefined) {
				allowedUpdates.image_check = updateData.image_check;
			}
			if (updateData.status !== undefined) {
				// Validate status value
				const validStatuses = ['active', 'inactive', 'archived', 'deleted'];
				if (!validStatuses.includes(updateData.status)) {
					throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
				}
				allowedUpdates.status = updateData.status;
			}

			// Add updated timestamp
			allowedUpdates.updatedAt = new Date();

			// Update the scenario
			const updatedScenario = await this.examRepository.updateExamScenario(scenarioId, allowedUpdates);

			if (!updatedScenario) {
				throw new ApiError(500, 'Failed to update exam scenario');
			}

			this.logger.info(`Exam scenario ${scenarioId} updated successfully`);
			return updatedScenario;
		} catch (error) {
			this.logger.error('Error updating exam scenario', error);
			if (error instanceof ApiError) {
				throw error;
			}
			throw new ApiError(500, 'Failed to update exam scenario', error);
		}
	}

}