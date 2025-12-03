import { inject, injectable } from 'inversify';
import { Logger } from '../../startup/logger';
import { ApiError, ValidationError } from '../../helpers/error.helper';
import { CandidatesRepository } from './models/candidates.repository';
import { PartnerRepository } from '../users/models/partner.repository';
import {
    CreateBatchDTO,
    CreateCandidateDTO,
    CandidatesListResponse,
    CSVUploadResult,
    AssignCandidatesToBatchDTO
} from './types/candidates.types';
import { ICandidateBatch } from '../../databases/mongodb/model/candidate_batch.model';
import { IUser } from '../users/types/user.types';
import { uploadBufferToCFBucket } from '../../helpers/upload_to_s3.helper';
import { getFileBreakdown } from '../../helpers/file.helper';
import fs from 'fs';
import csvParser from 'csv-parser';

@injectable()
export class CandidatesService {
    constructor(
        @inject(Logger) private readonly logger: Logger,
        @inject(CandidatesRepository) private readonly candidatesRepository: CandidatesRepository,
        @inject(PartnerRepository) private readonly partnerRepository: PartnerRepository,
    ) {}

    async createBatch(partner_id: string, data: CreateBatchDTO): Promise<ICandidateBatch> {
        try {
            const batch = await this.candidatesRepository.createBatch(partner_id, data.batch_name);
            this.logger.info(`Batch created: ${batch._id} for partner: ${partner_id}`);
            return batch;
        } catch (error: any) {
            if (error.code === 11000) {
                throw new ValidationError('Batch name already exists for this partner');
            }
            this.logger.error('Error creating batch:', error);
            throw new ApiError(500, 'Failed to create batch');
        }
    }

    async createCandidate(partner_id: string, data: CreateCandidateDTO): Promise<IUser> {
        try {
            // If batch_id is provided, verify it exists and belongs to partner
            if (data.batch_id) {
                const batch = await this.candidatesRepository.getBatchById(data.batch_id);
                if (!batch) {
                    throw new ValidationError('Batch not found');
                }
                if (batch.partner_id.toString() !== partner_id) {
                    throw new ValidationError('Batch does not belong to this partner');
                }

                // Check if candidate already exists in this batch
                const exists = await this.candidatesRepository.checkPartnerCandidateExists(
                    partner_id,
                    data.batch_id,
                    data.email
                );
                if (exists) {
                    throw new ValidationError('Candidate with this email already exists in this batch');
                }
            } else {
                // No batch provided - check if candidate already exists for this partner (any batch or no batch)
                const exists = await this.candidatesRepository.checkPartnerCandidateExistsAny(
                    partner_id,
                    data.email
                );
                if (exists) {
                    throw new ValidationError('Candidate with this email already exists for this partner');
                }
            }

            // Seat check: determine if candidate should be paid for
            let isPaidFor = false;
            let assignedBatchId: string | null = data.batch_id || null;
            let seat: any = null;

            if (data.batch_id) {
                // Batch provided - check for seat availability
                seat = await this.candidatesRepository.getSeatByBatch(partner_id, data.batch_id);
                
                if (seat && seat.is_active) {
                    const availableSeats = (seat.seat_count || 0) - (seat.seats_assigned || 0);
                    
                    if (availableSeats > 0) {
                        // Seats available - candidate will be paid for and added to batch
                        isPaidFor = true;
                        // Reserve a seat (increment) before creating candidate to avoid race conditions
                        try {
                            await this.candidatesRepository.incrementSeatsAssigned(seat._id.toString(), 1);
                            this.logger.info(`Reserved seat for candidate in batch ${data.batch_id}. Available seats: ${availableSeats - 1}`);
                        } catch (incErr) {
                            this.logger.error('Failed to reserve seat before creating candidate', incErr);
                            throw new ApiError(500, 'Failed to reserve seat');
                        }
                    } else {
                        // No seats available - candidate will be unpaid and not added to batch
                        isPaidFor = false;
                        assignedBatchId = null;
                        this.logger.info(`No seats available in batch ${data.batch_id}. Creating unpaid candidate.`);
                    }
                } else {
                    // No active seat subscription - candidate is unpaid and not added to batch
                    isPaidFor = false;
                    assignedBatchId = null;
                    this.logger.info(`No active seat subscription for batch ${data.batch_id}. Creating unpaid candidate.`);
                }
            } else {
                // No batch provided - candidate is unpaid by default
                isPaidFor = false;
                assignedBatchId = null;
                this.logger.info('No batch provided. Creating unpaid candidate.');
            }

            let result: { user: IUser; partnerCandidate: any };
            try {
                result = await this.candidatesRepository.createCandidate(
                    partner_id,
                    assignedBatchId,
                    data.firstname,
                    data.lastname,
                    data.email,
                    isPaidFor,
                    seat && seat.is_active ? seat._id.toString() : null
                );
            } catch (createErr) {
                // If we reserved a seat earlier, rollback the reserved seat
                if (seat && seat.is_active && isPaidFor) {
                    try {
                        await this.candidatesRepository.incrementSeatsAssigned(seat._id.toString(), -1);
                        this.logger.info('Rolled back seat reservation after candidate creation failure');
                    } catch (rollbackErr) {
                        this.logger.error('Failed to rollback seat reservation after candidate create failure', rollbackErr);
                    }
                }
                throw createErr;
            }

            // Mark "add candidates" step as complete on dashboard (only on first candidate)
            const partner = await this.partnerRepository.findById(partner_id);
            if (partner && !partner.has_added_candidates) {
                await this.partnerRepository.markCandidateAdded(partner_id);
                this.logger.info(`Marked first candidate added for partner: ${partner_id}`);
            }

            this.logger.info(`Candidate created: ${result.user._id} for partner: ${partner_id}`);
            return result.user;
        } catch (error: any) {
            if (error instanceof ValidationError) {
                throw error;
            }
            this.logger.error('Error creating candidate:', error);
            throw new ApiError(500, 'Failed to create candidate');
        }
    }

    async uploadCandidatesCSV(
        partner_id: string,
        batch_id: string | undefined,
        req: any // express-fileupload file object
    ): Promise<CSVUploadResult> {
        try {
            let batch: any = null;
            
             const { file_path } = getFileBreakdown(req);

            // If batch_id is provided, verify it exists and belongs to partner
            if (batch_id) {
                batch = await this.candidatesRepository.getBatchById(batch_id);
                if (!batch) {
                    throw new ValidationError('Batch not found');
                }
                if (batch.partner_id.toString() !== partner_id) {
                    throw new ValidationError('Batch does not belong to this partner');
                }
            }
            const file = (req.files as any).file;
            // Validate file
            if (!file) {
                throw new ValidationError('No file uploaded');
            }

            if (!file.mimetype.includes('csv') && !file.name.endsWith('.csv')) {
                throw new ValidationError('Only CSV files are allowed');
            }

            // Upload CSV to S3 for record keeping
            const s3Response = await uploadBufferToCFBucket(
                file.data,
                file.mimetype,
                file.name,
                'private',
                `candidates/csv-uploads/${partner_id}`
            );

            this.logger.info(`CSV uploaded to S3: ${s3Response.document_url}`);

            const results: CSVUploadResult = {
                total_rows: 0,
                successful: 0,
                failed: 0,
                errors: [],
                candidates: []
            };

            // Parse CSV using csv-parser with improved validation
            return new Promise<CSVUploadResult>((resolve, reject) => {
                const parsedRows: Array<{
                    rowNumber: number;
                    firstname: string;
                    lastname: string;
                    email: string;
                    isValid: boolean;
                    errors?: Record<string, string[]>;
                }> = [];

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                let rowNumber = 0;
                const emailsInFile: string[] = []; // Track emails within the CSV for duplicate detection
                let headerError: string | null = null;

                // Read directly from the uploaded file path
                this.logger.info(`Reading CSV from file path: ${file_path}`);
                
                const dataStream = fs.createReadStream(file_path).pipe(csvParser({
                    mapHeaders: ({ header }: { header: string }) => header.toLowerCase().trim(),
                    strict: false
                }));

                // Validate headers
                dataStream.on('headers', (headers: string[]) => {
                    this.logger.info(`CSV headers received: ${headers.join(', ')}`);
                    const requiredHeaders = ['firstname', 'lastname', 'email'];
                    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
                    const missingHeaders = requiredHeaders.filter(h => !normalizedHeaders.includes(h));

                    if (missingHeaders.length > 0) {
                        headerError = `CSV file is missing required headers: ${missingHeaders.join(', ')}`;
                        this.logger.error(headerError);
                    }
                });

                dataStream.on('data', (row: any) => {
                    rowNumber++;
                    this.logger.info(`Processing row ${rowNumber}:`, row);
                    
                    const firstname = (row.firstname || '').trim();
                    const lastname = (row.lastname || '').trim();
                    const email = (row.email || '').trim().toLowerCase();

                    let isValid = true;
                    const errors: Record<string, string[]> = {};

                    // Validate required fields
                    if (!firstname) {
                        isValid = false;
                        errors['firstname'] = ['First name is required'];
                    }

                    if (!lastname) {
                        isValid = false;
                        errors['lastname'] = ['Last name is required'];
                    }

                    if (!email) {
                        isValid = false;
                        errors['email'] = ['Email is required'];
                    } else if (!emailRegex.test(email)) {
                        isValid = false;
                        errors['email'] = ['Invalid email format'];
                    } else if (emailsInFile.includes(email)) {
                        isValid = false;
                        errors['email'] = ['Duplicate email in CSV file'];
                    }

                    // Track email for in-file duplicate detection
                    if (email) {
                        emailsInFile.push(email);
                    }

                    parsedRows.push({
                        rowNumber,
                        firstname,
                        lastname,
                        email,
                        isValid,
                        errors: Object.keys(errors).length > 0 ? errors : undefined
                    });
                });

                dataStream.on('error', (error: Error) => {
                    this.logger.error('CSV parsing error:', error);
                    reject(new ValidationError(`Failed to parse CSV file: ${error.message}`));
                });

                dataStream.on('end', async () => {
                    try {
                        this.logger.info(`CSV parsing completed: ${parsedRows.length} rows processed`);

                        // Check for header validation errors
                        if (headerError) {
                            reject(new ValidationError(headerError));
                            return;
                        }

                        if (parsedRows.length === 0) {
                            this.logger.error('No data rows found in CSV file');
                            reject(new ValidationError('CSV file contains no data rows'));
                            return;
                        }

                        results.total_rows = parsedRows.length;

                        // Check for existing emails in database (single DB call)
                        const validRows = parsedRows.filter(row => row.isValid);
                        const emailsToCheck = validRows.map(row => row.email);
                        
                        let existingInBatch: Map<string, boolean>;
                        if (batch_id) {
                            existingInBatch = await this.candidatesRepository.checkMultiplePartnerCandidatesExist(
                                partner_id,
                                batch_id,
                                emailsToCheck
                            );
                        } else {
                            // Check if candidates exist for partner (any batch or no batch)
                            existingInBatch = new Map();
                            const existingEmails = await this.candidatesRepository.getExistingCandidateEmails(
                                partner_id,
                                emailsToCheck
                            );
                            existingEmails.forEach(email => existingInBatch.set(email, true));
                        }

                        // Separate valid candidates from those with errors
                        const candidatesToCreate: Array<{
                            partner_id: string;
                            batch_id?: string;
                            firstname: string;
                            lastname: string;
                            email: string;
                        }> = [];

                        for (const row of parsedRows) {
                            if (!row.isValid) {
                                results.failed++;
                                // Flatten errors object to a readable string
                                const errorMessages = row.errors 
                                    ? Object.entries(row.errors)
                                        .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
                                        .join('; ')
                                    : 'Unknown validation error';
                                    
                                results.errors.push({
                                    row: row.rowNumber,
                                    email: row.email || 'N/A',
                                    error: errorMessages
                                });
                            } else if (existingInBatch.get(row.email)) {
                                results.failed++;
                                results.errors.push({
                                    row: row.rowNumber,
                                    email: row.email,
                                    error: batch_id 
                                        ? 'Candidate already exists in this batch'
                                        : 'Candidate already exists for this partner'
                                });
                            } else {
                                candidatesToCreate.push({
                                    partner_id,
                                    batch_id,
                                    firstname: row.firstname,
                                    lastname: row.lastname,
                                    email: row.email
                                });
                            }
                        }

                        // Check seat availability and bulk create candidates
                        if (candidatesToCreate.length > 0) {
                            try {
                                let seat: any = null;
                                let availableSeats = 0;
                                
                                // Only check seats if batch_id is provided
                                if (batch_id) {
                                    seat = await this.candidatesRepository.getSeatByBatch(partner_id, batch_id);
                                    if (seat && seat.is_active) {
                                        availableSeats = (seat.seat_count || 0) - (seat.seats_assigned || 0);
                                        this.logger.info(`Batch has ${availableSeats} available seats for ${candidatesToCreate.length} candidates`);
                                    } else {
                                        this.logger.info(`No active seat subscription for batch. All candidates will be unpaid.`);
                                    }
                                } else {
                                    this.logger.info(`No batch provided. All candidates will be unpaid.`);
                                }

                                // Separate candidates into paid and unpaid based on available seats
                                const paidCandidates = candidatesToCreate.slice(0, availableSeats);
                                const unpaidCandidates = candidatesToCreate.slice(availableSeats);

                                this.logger.info(`Creating ${paidCandidates.length} paid candidates and ${unpaidCandidates.length} unpaid candidates`);

                                // Create both paid and unpaid candidates
                                const createdResults = await this.candidatesRepository.createCandidatesBulk(
                                    candidatesToCreate,
                                    seat && seat.is_active ? seat._id.toString() : null,
                                    availableSeats
                                );
                                
                                results.successful = createdResults.length;
                                results.candidates = createdResults.map(result => ({
                                    _id: result.user._id as string,
                                    firstname: result.user.firstname,
                                    lastname: result.user.lastname || '',
                                    email: result.user.email,
                                    batch_id: result.partnerCandidate.batch_id ? (batch_id || undefined) : undefined,
                                    batch_name: result.partnerCandidate.batch_id && batch ? batch.batch_name : undefined,
                                    is_active: result.user.is_active,
                                    is_paid_for: result.partnerCandidate.is_paid_for || false,
                                    invite_status: result.partnerCandidate.invite_status || 'pending',
                                    invite_sent_at: result.partnerCandidate.invite_sent_at,
                                    invite_accepted_at: result.partnerCandidate.invite_accepted_at,
                                    partner_candidate_id: result.partnerCandidate._id as string,
                                    createdAt: result.partnerCandidate.createdAt!,
                                    updatedAt: result.partnerCandidate.updatedAt!
                                }));
                            } catch (bulkError: any) {
                                // Handle any bulk insert errors
                                this.logger.error('Bulk insert error:', bulkError);
                                
                                // If some documents were inserted despite errors
                                if (bulkError.insertedDocs && bulkError.insertedDocs.length > 0) {
                                    results.successful = bulkError.insertedDocs.length;
                                    results.candidates = bulkError.insertedDocs.map((candidate: IUser) => ({
                                        _id: candidate._id as string,
                                        firstname: candidate.firstname,
                                        lastname: candidate.lastname || '',
                                        email: candidate.email,
                                        batch_id: batch_id,
                                        batch_name: batch.batch_name,
                                        is_active: candidate.is_active,
                                        is_paid_for: candidate.is_paid_for || false,
                                        invite_status: candidate.invite_status || 'pending',
                                        invite_sent_at: candidate.invite_sent_at,
                                        invite_accepted_at: candidate.invite_accepted_at,
                                        createdAt: candidate.createdAt!,
                                        updatedAt: candidate.updatedAt!
                                    }));
                                }
                                
                                // Mark remaining as failed
                                const failedCount = candidatesToCreate.length - (bulkError.insertedDocs?.length || 0);
                                results.failed += failedCount;
                            }
                        }

                            // Mark "add candidates" step as complete on dashboard (only on first successful upload)
                            if (results.successful > 0) {
                                const partner = await this.partnerRepository.findById(partner_id);
                                if (partner && !partner.has_added_candidates) {
                                    await this.partnerRepository.markCandidateAdded(partner_id);
                                    this.logger.info(`Marked first candidate added via CSV for partner: ${partner_id}`);
                                }
                            }

                            this.logger.info(`CSV upload completed for partner ${partner_id}: ${results.successful} successful, ${results.failed} failed`);
                            resolve(results);
                        } catch (error: any) {
                            this.logger.error('Error processing CSV rows:', error);
                            reject(error);
                        }
                    });
            });
        } catch (error: any) {
            if (error instanceof ValidationError) {
                throw error;
            }
            this.logger.error('Error uploading CSV:', error);
            throw new ApiError(500, 'Failed to upload CSV file');
        }
    }

    async getAllCandidates(partner_id: string): Promise<CandidatesListResponse> {
        try {
            const [candidates, batches, total_candidates, total_batches] = await Promise.all([
                this.candidatesRepository.getCandidatesByPartnerId(partner_id),
                this.candidatesRepository.getBatchesByPartnerId(partner_id),
                this.candidatesRepository.getCandidateCountByPartnerId(partner_id),
                this.candidatesRepository.getBatchCountByPartnerId(partner_id)
            ]);

            return {
                candidates,
                batches,
                total_candidates,
                total_batches,
                pagination: {
                    current_page: 1,
                    per_page: total_candidates,
                    total_pages: 1,
                    has_next: false,
                    has_previous: false
                }
            };
        } catch (error: any) {
            this.logger.error('Error fetching candidates:', error);
            throw new ApiError(500, 'Failed to fetch candidates');
        }
    }

    async getAllCandidatesPaginated(
        partner_id: string,
        page: number = 1,
        limit: number = 20
    ): Promise<CandidatesListResponse> {
        try {
            // Ensure valid pagination params
            page = Math.max(1, page);
            limit = Math.min(100, Math.max(1, limit)); // Max 100 per page

            const [candidates, batches, total_candidates, total_batches] = await Promise.all([
                this.candidatesRepository.getCandidatesByPartnerIdPaginated(partner_id, page, limit),
                this.candidatesRepository.getBatchesByPartnerId(partner_id),
                this.candidatesRepository.getCandidateCountByPartnerId(partner_id),
                this.candidatesRepository.getBatchCountByPartnerId(partner_id)
            ]);

            const total_pages = Math.ceil(total_candidates / limit);

            return {
                candidates,
                batches,
                total_candidates,
                total_batches,
                pagination: {
                    current_page: page,
                    per_page: limit,
                    total_pages,
                    has_next: page < total_pages,
                    has_previous: page > 1
                }
            };
        } catch (error: any) {
            this.logger.error('Error fetching candidates:', error);
            throw new ApiError(500, 'Failed to fetch candidates');
        }
    }

    async getAllBatches(partner_id: string): Promise<ICandidateBatch[]> {
        try {
            const batches = await this.candidatesRepository.getAllBatchesByPartnerId(partner_id);
            return batches;
        } catch (error: any) {
            this.logger.error('Error fetching batches:', error);
            throw new ApiError(500, 'Failed to fetch batches');
        }
    }

    async markCandidateAsPaid(partner_id: string, candidate_id: string): Promise<any> {
        try {
            // Verify candidate exists
            const candidate = await this.candidatesRepository.getCandidateById(candidate_id);
            if (!candidate) {
                throw new ValidationError('Candidate not found');
            }

            // Update payment status in partner-candidate relationship
            const updated = await this.candidatesRepository.updateCandidatePaymentStatus(
                partner_id,
                candidate_id,
                true
            );
            if (!updated) {
                throw new ValidationError('Candidate does not belong to this partner or batch not found');
            }

            this.logger.info(`Candidate ${candidate_id} marked as paid by partner ${partner_id}`);
            
            // Return combined user and relationship data
            return {
                ...candidate,
                is_paid_for: updated.is_paid_for,
                invite_status: updated.invite_status,
                invite_sent_at: updated.invite_sent_at,
                invite_accepted_at: updated.invite_accepted_at
            };
        } catch (error: any) {
            if (error instanceof ValidationError || error instanceof ApiError) {
                throw error;
            }
            this.logger.error('Error marking candidate as paid:', error);
            throw new ApiError(500, 'Failed to update payment status');
        }
    }

    async assignCandidatesToBatch(partner_id: string, data: AssignCandidatesToBatchDTO): Promise<any> {
        try {
            // Verify batch exists and belongs to partner
            const batch = await this.candidatesRepository.getBatchById(data.batch_id);
            if (!batch) {
                throw new ValidationError('Batch not found');
            }
            if (batch.partner_id.toString() !== partner_id) {
                throw new ValidationError('Batch does not belong to this partner');
            }

            // Validate candidate_ids array
            if (!data.candidate_ids || data.candidate_ids.length === 0) {
                throw new ValidationError('At least one candidate ID is required');
            }

            // Check seat availability
            const seat = await this.candidatesRepository.getSeatByBatch(partner_id, data.batch_id);
            if (!seat || !seat.is_active) {
                throw new ValidationError('No active seat subscription found for this batch');
            }

            const availableSeats = (seat.seat_count || 0) - (seat.seats_assigned || 0);
            if (availableSeats < data.candidate_ids.length) {
                throw new ValidationError(
                    `Insufficient seats available. Requested: ${data.candidate_ids.length}, Available: ${availableSeats}`
                );
            }

            // Verify all candidates exist and belong to partner (and have no batch)
            const candidates = await this.candidatesRepository.getCandidatesByIds(data.candidate_ids);
            if (candidates.length !== data.candidate_ids.length) {
                throw new ValidationError('One or more candidates not found');
            }

            // Perform batch assignment
            const result = await this.candidatesRepository.assignCandidatesToBatch(
                partner_id,
                data.batch_id,
                data.candidate_ids
            );

            // Update seats_assigned count
            if (result.updated > 0) {
                await this.candidatesRepository.incrementSeatsAssigned(seat._id.toString(), result.updated);
            }

            this.logger.info(
                `Assigned ${result.updated} candidates to batch ${data.batch_id} for partner ${partner_id}`
            );

            return {
                batch_id: data.batch_id,
                batch_name: batch.batch_name,
                total_requested: data.candidate_ids.length,
                successfully_assigned: result.updated,
                failed: result.failed.length,
                failed_candidate_ids: result.failed,
                message: result.failed.length > 0
                    ? `${result.updated} candidates assigned successfully. ${result.failed.length} failed (already assigned to a batch).`
                    : `All ${result.updated} candidates assigned successfully to batch.`
            };
        } catch (error: any) {
            if (error instanceof ValidationError || error instanceof ApiError) {
                throw error;
            }
            this.logger.error('Error assigning candidates to batch:', error);
            throw new ApiError(500, 'Failed to assign candidates to batch');
        }
    }

    async acceptCandidateInvite(partner_candidate_id: string): Promise<any> {
        try {
            const partnerCandidate = await this.candidatesRepository.getPartnerCandidateById(partner_candidate_id);
            if (!partnerCandidate) {
                throw new ValidationError('Partner candidate relationship not found');
            }

            if (partnerCandidate.invite_status === 'accepted') {
                throw new ValidationError('Invite already accepted');
            }

            if (partnerCandidate.invite_status === 'expired') {
                throw new ValidationError('Invite has expired');
            }

            const updated = await this.candidatesRepository.updateCandidateInviteStatus(
                partner_candidate_id,
                'accepted'
            );
            if (!updated) {
                throw new ApiError(500, 'Failed to accept invite');
            }

            // Get user data
            const candidate = await this.candidatesRepository.getCandidateById(
                partnerCandidate.candidate_id as string
            );

            this.logger.info(`Partner candidate ${partner_candidate_id} accepted invite`);
            
            // Return combined data
            return {
                ...candidate,
                is_paid_for: updated.is_paid_for,
                invite_status: updated.invite_status,
                invite_sent_at: updated.invite_sent_at,
                invite_accepted_at: updated.invite_accepted_at,
                partner_candidate_id: updated._id
            };
        } catch (error: any) {
            if (error instanceof ValidationError || error instanceof ApiError) {
                throw error;
            }
            this.logger.error('Error accepting invite:', error);
            throw new ApiError(500, 'Failed to accept invite');
        }
    }

    async getUnpaidCandidatesInBatch(partner_id: string, batch_id: string): Promise<{
        batch_id: string;
        batch_name: string;
        unpaid_count: number;
        unpaid_candidates: Array<{
            candidate_id: string;
            email: string;
            firstname: string;
            lastname: string;
            invite_status: string;
        }>;
    }> {
        try {
            // Verify batch exists and belongs to partner
            const batch = await this.candidatesRepository.getBatchById(batch_id);
            if (!batch) {
                throw new ValidationError('Batch not found');
            }
            if (batch.partner_id.toString() !== partner_id) {
                throw new ValidationError('Batch does not belong to this partner');
            }

            // Get unpaid count
            const unpaid_count = await this.candidatesRepository.getUnpaidCandidatesCountByBatch(
                partner_id,
                batch_id
            );

            // Get unpaid candidates with details
            const unpaidPartnerCandidates = await this.candidatesRepository.getUnpaidCandidatesByBatch(
                partner_id,
                batch_id
            );

            // Get candidate details
            const candidateIds = unpaidPartnerCandidates.map(pc => pc.candidate_id.toString());
            const candidates = await this.candidatesRepository.getCandidatesByIds(candidateIds);

            const unpaid_candidates = candidates.map(candidate => {
                const partnerCandidate = unpaidPartnerCandidates.find(
                    pc => pc.candidate_id.toString() === candidate._id?.toString()
                );
                return {
                    candidate_id: candidate._id?.toString() || '',
                    email: candidate.email,
                    firstname: candidate.firstname,
                    lastname: candidate.lastname || '',
                    invite_status: partnerCandidate?.invite_status || 'pending'
                };
            });

            return {
                batch_id: batch._id.toString(),
                batch_name: batch.batch_name,
                unpaid_count,
                unpaid_candidates
            };
        } catch (error: any) {
            if (error instanceof ValidationError || error instanceof ApiError) {
                throw error;
            }
            this.logger.error('Error getting unpaid candidates:', error);
            throw new ApiError(500, 'Failed to get unpaid candidates');
        }
    }

    async deactivateSeat(partner_id: string, batch_id: string): Promise<any> {
        try {
            const result = await this.candidatesRepository.deactivateSeatByBatch(partner_id, batch_id);
            if (!result) {
                throw new ValidationError('No active seat found for this batch');
            }
            return result;
        } catch (error: any) {
            if (error instanceof ValidationError || error instanceof ApiError) {
                throw error;
            }
            this.logger.error('Error deactivating seat:', error);
            throw new ApiError(500, 'Failed to deactivate seat');
        }
    }

    async getAllSeatSubscriptions(partner_id: string): Promise<any> {
        try {
            const seats = await this.candidatesRepository.getAllSeatsByPartnerId(partner_id);
            
            const total_subscriptions = seats.length;
            const active_subscriptions = seats.filter(s => s.is_active).length;
            const total_seats_purchased = seats.reduce((sum, s) => sum + s.seat_count, 0);
            const total_seats_assigned = seats.reduce((sum, s) => sum + s.seats_assigned, 0);
            const total_candidates = seats.reduce((sum, s) => sum + s.total_candidates, 0);

            return {
                total_subscriptions,
                active_subscriptions,
                total_seats_purchased,
                total_seats_assigned,
                total_seats_available: total_seats_purchased - total_seats_assigned,
                total_candidates,
                subscriptions: seats
            };
        } catch (error: any) {
            if (error instanceof ValidationError || error instanceof ApiError) {
                throw error;
            }
            this.logger.error('Error getting seat subscriptions:', error);
            throw new ApiError(500, 'Failed to get seat subscriptions');
        }
    }

    async getSeatSubscriptionById(partner_id: string, seat_id: string): Promise<any> {
        try {
            const seat = await this.candidatesRepository.getSeatById(seat_id);
            
            if (!seat) {
                throw new ValidationError('Seat subscription not found');
            }

            // Verify seat belongs to partner
            if (seat.partner_id.toString() !== partner_id) {
                throw new ValidationError('Seat subscription does not belong to this partner');
            }

            return seat;
        } catch (error: any) {
            if (error instanceof ValidationError || error instanceof ApiError) {
                throw error;
            }
            this.logger.error('Error getting seat subscription:', error);
            throw new ApiError(500, 'Failed to get seat subscription');
        }
    }
}
