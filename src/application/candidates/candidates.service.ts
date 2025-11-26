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
            const exists = await this.candidatesRepository.checkCandidateExists(data.email, partner_id);
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

            // Process each row (skip header)
            for (let i = 1; i < lines.length; i++) {
                const rowNumber = i + 1;
                const line = lines[i];
                if (!line) continue;

                try {
                    const values = line.split(',').map((v: string) => v.trim());
                    
                    const firstname = values[firstnameIndex] || '';
                    const lastname = values[lastnameIndex] || '';
                    const email = values[emailIndex] || '';

                    // Validate required fields
                    if (!firstname || !lastname || !email) {
                        throw new Error('Missing required fields (firstname, lastname, email)');
                    }

                    // Basic email validation
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(email)) {
                        throw new Error('Invalid email format');
                    }

                    // Check if candidate already exists
                    const exists = await this.candidatesRepository.checkCandidateExists(email, partner_id);
                    if (exists) {
                        throw new Error('Email already exists');
                    }

                    // Create candidate
                    const candidate = await this.candidatesRepository.createCandidate(
                        partner_id,
                        batch_id,
                        firstname,
                        lastname,
                        email
                    );

                    results.successful++;
                    results.candidates.push({
                        _id: candidate._id as string,
                        firstname: candidate.firstname,
                        lastname: candidate.lastname || '',
                        email: candidate.email,
                        batch_id: batch_id,
                        batch_name: batch.batch_name,
                        is_active: candidate.is_active,
                        createdAt: candidate.createdAt!,
                        updatedAt: candidate.updatedAt!
                    });

                } catch (error: any) {
                    results.failed++;
                    if (line) {
                        const values = line.split(',').map((v: string) => v.trim());
                        results.errors.push({
                            row: rowNumber,
                            email: values[emailIndex] || 'N/A',
                            error: error.message
                        });
                    }
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
}
