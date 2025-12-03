import { inject, injectable } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { CandidatesService } from './candidates.service';
import { Logger } from '../../startup/logger';
import { ApiResponse } from '../../helpers/response.helper';
import { CreateBatchDTO, CreateCandidateDTO, AssignCandidatesToBatchDTO } from './types/candidates.types';

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

            // const file = (req.files as any).file;

            try {
                const result = await this.candidatesService.uploadCandidatesCSV(partner_id, batch_id, req);

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

    async AssignCandidatesToBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = req.curr_user?._id?.toString() as string;
            const assignmentData: AssignCandidatesToBatchDTO = req.body;

            try {
                const result = await this.candidatesService.assignCandidatesToBatch(partner_id, assignmentData);
                ApiResponse.ok(result, result.message).send(res);
            } catch (error) {
                next(error);
            }
        } catch (error) {
            this.logger.error('Error in AssignCandidatesToBatch:', error);
            next(error);
        }
    }

    async AcceptCandidateInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { partner_candidate_id } = req.params;

            if (!partner_candidate_id) {
                ApiResponse.badRequest('partner_candidate_id is required').send(res);
                return;
            }

            try {
                const candidate = await this.candidatesService.acceptCandidateInvite(partner_candidate_id);

                ApiResponse.ok(candidate, 'Invite accepted successfully').send(res);
            } catch (error) {
                next(error);
            }
        } catch (error) {
            this.logger.error('Error in AcceptCandidateInvite:', error);
            next(error);
        }
    }

    async GetUnpaidCandidatesInBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = req.curr_user?._id?.toString() as string;
            const { batch_id } = req.params;

            if (!batch_id) {
                ApiResponse.badRequest('batch_id is required').send(res);
                return;
            }

            try {
                const unpaidInfo = await this.candidatesService.getUnpaidCandidatesInBatch(partner_id, batch_id);
                ApiResponse.ok(unpaidInfo, 'Unpaid candidates retrieved successfully').send(res);
            } catch (error) {
                next(error);
            }
        } catch (error) {
            this.logger.error('Error in GetUnpaidCandidatesInBatch:', error);
            next(error);
        }
    }

    async SunsetBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = req.curr_user?._id?.toString() as string;
            const { batch_id } = req.params;

            if (!batch_id) {
                ApiResponse.badRequest('batch_id is required').send(res);
                return;
            }

            try {
                const result = await this.candidatesService.deactivateSeat(partner_id, batch_id);
                ApiResponse.ok(result, 'Batch sunset successfully').send(res);
            } catch (error) {
                next(error);
            }
        } catch (error) {
            this.logger.error('Error in SunsetBatch:', error);
            next(error);
        }
    }

    async GetAllSeatSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = req.curr_user?._id?.toString() as string;

            try {
                const subscriptions = await this.candidatesService.getAllSeatSubscriptions(partner_id);
                ApiResponse.ok(subscriptions, 'Seat subscriptions retrieved successfully').send(res);
            } catch (error) {
                next(error);
            }
        } catch (error) {
            this.logger.error('Error in GetAllSeatSubscriptions:', error);
            next(error);
        }
    }

    async GetSeatSubscriptionById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = req.curr_user?._id?.toString() as string;
            const { seat_id } = req.params;

            if (!seat_id) {
                ApiResponse.badRequest('seat_id is required').send(res);
                return;
            }

            try {
                const subscription = await this.candidatesService.getSeatSubscriptionById(partner_id, seat_id);
                ApiResponse.ok(subscription, 'Seat subscription retrieved successfully').send(res);
            } catch (error) {
                next(error);
            }
        } catch (error) {
            this.logger.error('Error in GetSeatSubscriptionById:', error);
            next(error);
        }
    }
}
