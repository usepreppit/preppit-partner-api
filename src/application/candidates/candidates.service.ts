import { inject, injectable } from 'inversify';
import { Logger } from '../../startup/logger';
import { ApiError, ValidationError } from '../../helpers/error.helper';
import { CandidatesRepository } from './models/candidates.repository';
import {
    CreateBatchDTO,
    CreateCandidateDTO,
    CandidatesListResponse,
    CSVUploadResult
} from './types/candidates.types';
import { ICandidateBatch } from '../../databases/mongodb/model/candidate_batch.model';
import { IUser } from '../users/types/user.types';
import { uploadBufferToCFBucket } from '../../helpers/upload_to_s3.helper';

@injectable()
export class CandidatesService {
    constructor(
        @inject(Logger) private readonly logger: Logger,
        @inject(CandidatesRepository) private readonly candidatesRepository: CandidatesRepository,
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
            // Verify batch exists and belongs to partner
            const batch = await this.candidatesRepository.getBatchById(data.batch_id);
            if (!batch) {
                throw new ValidationError('Batch not found');
            }
            if (batch.partner_id.toString() !== partner_id) {
                throw new ValidationError('Batch does not belong to this partner');
            }

            // Check if candidate already exists
            const exists = await this.candidatesRepository.checkCandidateExists(data.email);
            if (exists) {
                throw new ValidationError('Candidate with this email already exists');
            }

            const candidate = await this.candidatesRepository.createCandidate(
                partner_id,
                data.batch_id,
                data.firstname,
                data.lastname,
                data.email
            );

            this.logger.info(`Candidate created: ${candidate._id} for partner: ${partner_id}`);
            return candidate;
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
        batch_id: string,
        file: any // express-fileupload file object
    ): Promise<CSVUploadResult> {
        try {
            // Verify batch exists and belongs to partner
            const batch = await this.candidatesRepository.getBatchById(batch_id);
            if (!batch) {
                throw new ValidationError('Batch not found');
            }
            if (batch.partner_id.toString() !== partner_id) {
                throw new ValidationError('Batch does not belong to this partner');
            }

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

            // Parse CSV from buffer
            const fileContent = file.data.toString('utf-8');
            const lines = fileContent.split('\n').filter((line: string) => line.trim() !== '');
            
            if (lines.length < 2) {
                throw new ValidationError('CSV file must contain a header row and at least one data row');
            }

            // Parse header
            const header = lines[0];
            if (!header) {
                throw new ValidationError('CSV file is empty or malformed');
            }
            const headers = header.split(',').map((h: string) => h.trim().toLowerCase());
            const firstnameIndex = headers.indexOf('firstname');
            const lastnameIndex = headers.indexOf('lastname');
            const emailIndex = headers.indexOf('email');

            if (firstnameIndex === -1 || lastnameIndex === -1 || emailIndex === -1) {
                throw new ValidationError('CSV must contain columns: firstname, lastname, email');
            }

            results.total_rows = lines.length - 1;

            // First pass: Parse and validate all rows
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const parsedRows: Array<{
                rowNumber: number;
                firstname: string;
                lastname: string;
                email: string;
                isValid: boolean;
                error?: string;
            }> = [];

            for (let i = 1; i < lines.length; i++) {
                const rowNumber = i + 1;
                const line = lines[i];
                if (!line) continue;

                const values = line.split(',').map((v: string) => v.trim());
                const firstname = values[firstnameIndex] || '';
                const lastname = values[lastnameIndex] || '';
                const email = values[emailIndex] || '';

                let isValid = true;
                let error = '';

                // Validate required fields
                if (!firstname || !lastname || !email) {
                    isValid = false;
                    error = 'Missing required fields (firstname, lastname, email)';
                } else if (!emailRegex.test(email)) {
                    isValid = false;
                    error = 'Invalid email format';
                }

                parsedRows.push({
                    rowNumber,
                    firstname,
                    lastname,
                    email,
                    isValid,
                    error
                });
            }

            // Second pass: Check for existing emails (single DB call)
            const validRows = parsedRows.filter(row => row.isValid);
            const emailsToCheck = validRows.map(row => row.email);
            const existingEmails = await this.candidatesRepository.checkMultipleCandidatesExist(emailsToCheck);

            // Separate valid candidates from those with errors
            const candidatesToCreate: Array<{
                partner_id: string;
                batch_id: string;
                firstname: string;
                lastname: string;
                email: string;
            }> = [];

            for (const row of parsedRows) {
                if (!row.isValid) {
                    results.failed++;
                    results.errors.push({
                        row: row.rowNumber,
                        email: row.email || 'N/A',
                        error: row.error!
                    });
                } else if (existingEmails.has(row.email)) {
                    results.failed++;
                    results.errors.push({
                        row: row.rowNumber,
                        email: row.email,
                        error: 'Email already exists'
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

            // Third pass: Bulk create candidates (single DB call)
            if (candidatesToCreate.length > 0) {
                try {
                    const createdCandidates = await this.candidatesRepository.createCandidatesBulk(candidatesToCreate);
                    
                    results.successful = createdCandidates.length;
                    results.candidates = createdCandidates.map(candidate => ({
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

            this.logger.info(`CSV upload completed for partner ${partner_id}: ${results.successful} successful, ${results.failed} failed`);
            return results;

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

    async markCandidateAsPaid(partner_id: string, candidate_id: string): Promise<IUser> {
        try {
            // Verify candidate belongs to partner
            const candidate = await this.candidatesRepository.getCandidateById(candidate_id);
            if (!candidate) {
                throw new ValidationError('Candidate not found');
            }
            if (candidate.partner_id?.toString() !== partner_id) {
                throw new ValidationError('Candidate does not belong to this partner');
            }

            const updated = await this.candidatesRepository.updateCandidatePaymentStatus(candidate_id, true);
            if (!updated) {
                throw new ApiError(500, 'Failed to update payment status');
            }

            this.logger.info(`Candidate ${candidate_id} marked as paid by partner ${partner_id}`);
            return updated;
        } catch (error: any) {
            if (error instanceof ValidationError || error instanceof ApiError) {
                throw error;
            }
            this.logger.error('Error marking candidate as paid:', error);
            throw new ApiError(500, 'Failed to update payment status');
        }
    }

    async acceptCandidateInvite(candidate_id: string): Promise<IUser> {
        try {
            const candidate = await this.candidatesRepository.getCandidateById(candidate_id);
            if (!candidate) {
                throw new ValidationError('Candidate not found');
            }

            if (candidate.invite_status === 'accepted') {
                throw new ValidationError('Invite already accepted');
            }

            if (candidate.invite_status === 'expired') {
                throw new ValidationError('Invite has expired');
            }

            const updated = await this.candidatesRepository.updateCandidateInviteStatus(candidate_id, 'accepted');
            if (!updated) {
                throw new ApiError(500, 'Failed to accept invite');
            }

            this.logger.info(`Candidate ${candidate_id} accepted invite`);
            return updated;
        } catch (error: any) {
            if (error instanceof ValidationError || error instanceof ApiError) {
                throw error;
            }
            this.logger.error('Error accepting invite:', error);
            throw new ApiError(500, 'Failed to accept invite');
        }
    }
}
