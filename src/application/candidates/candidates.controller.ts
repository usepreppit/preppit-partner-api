import { inject, injectable } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { CandidatesService } from './candidates.service';
import { Logger } from '../../startup/logger';
import { ApiResponse } from '../../helpers/response.helper';
import { CreateBatchDTO, CreateCandidateDTO } from './types/candidates.types';

@injectable()
export class CandidatesController {
    constructor(
        @inject(CandidatesService) private readonly candidatesService: CandidatesService,
        @inject(Logger) private readonly logger: Logger
    ) {}

    async GetAllCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = req.curr_user?._id?.toString() as string;
            
            // Get pagination params from query string
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;

            try {
                const data = await this.candidatesService.getAllCandidatesPaginated(partner_id, page, limit);

                ApiResponse.ok(data, 'Candidates retrieved successfully').send(res);
            } catch (error) {
                next(error);
            }
        } catch (error) {
            this.logger.error('Error in GetAllCandidates:', error);
            next(error);
        }
    }

    async CreateBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = req.curr_user?._id?.toString() as string;
            const batchData: CreateBatchDTO = req.body;

            try {
                const batch = await this.candidatesService.createBatch(partner_id, batchData);

                ApiResponse.created({
                    batch_id: batch._id,
                    batch_name: batch.batch_name,
                    created_at: batch.created_at
                }, 'Batch created successfully').send(res);
            } catch (error) {
                next(error);
            }
        } catch (error) {
            this.logger.error('Error in CreateBatch:', error);
            next(error);
        }
    }

    async CreateCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = req.curr_user?._id?.toString() as string;
            const candidateData: CreateCandidateDTO = req.body;

            try {
                const candidate = await this.candidatesService.createCandidate(partner_id, candidateData);

                ApiResponse.created({
                    candidate_id: candidate._id,
                    firstname: candidate.firstname,
                    lastname: candidate.lastname,
                    email: candidate.email,
                    batch_id: candidate.batch_id
                }, 'Candidate created successfully').send(res);
            } catch (error) {
                next(error);
            }
        } catch (error) {
            this.logger.error('Error in CreateCandidate:', error);
            next(error);
        }
    }

    async UploadCandidatesCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = req.curr_user?._id?.toString() as string;
            const { batch_id } = req.body;
            
            // Check if file was uploaded using express-fileupload
            if (!req.files || !(req.files as any).file) {
                ApiResponse.badRequest('No file uploaded').send(res);
                return;
            }

            const file = (req.files as any).file;

            if (!batch_id) {
                ApiResponse.badRequest('batch_id is required').send(res);
                return;
            }

            try {
                const result = await this.candidatesService.uploadCandidatesCSV(partner_id, batch_id, file);

                ApiResponse.ok(result, 'CSV upload completed').send(res);
            } catch (error) {
                next(error);
            }
        } catch (error) {
            this.logger.error('Error in UploadCandidatesCSV:', error);
            next(error);
        }
    }

    async GetAllBatches(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = req.curr_user?._id?.toString() as string;

            try {
                const batches = await this.candidatesService.getAllBatches(partner_id);

                ApiResponse.ok(batches, 'Batches retrieved successfully').send(res);
            } catch (error) {
                next(error);
            }
        } catch (error) {
            this.logger.error('Error in GetAllBatches:', error);
            next(error);
        }
    }

    async MarkCandidateAsPaid(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = req.curr_user?._id?.toString() as string;
            const { candidate_id } = req.params;

            if (!candidate_id) {
                ApiResponse.badRequest('candidate_id is required').send(res);
                return;
            }

            try {
                const candidate = await this.candidatesService.markCandidateAsPaid(partner_id, candidate_id);

                ApiResponse.ok(candidate, 'Candidate marked as paid').send(res);
            } catch (error) {
                next(error);
            }
        } catch (error) {
            this.logger.error('Error in MarkCandidateAsPaid:', error);
            next(error);
        }
    }

    async AcceptCandidateInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { candidate_id } = req.params;

            if (!candidate_id) {
                ApiResponse.badRequest('candidate_id is required').send(res);
                return;
            }

            try {
                const candidate = await this.candidatesService.acceptCandidateInvite(candidate_id);

                ApiResponse.ok(candidate, 'Invite accepted successfully').send(res);
            } catch (error) {
                next(error);
            }
        } catch (error) {
            this.logger.error('Error in AcceptCandidateInvite:', error);
            next(error);
        }
    }
}
