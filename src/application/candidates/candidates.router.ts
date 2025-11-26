import { Router } from 'express';
import { container } from '../../startup/di/container';
import { CandidatesController } from './candidates.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireOnboardingComplete } from '../../middlewares/onboarding.middleware';
import { validate_create_batch, validate_create_candidate } from '../../validation/candidates.validation';
import { sendError } from '../../helpers/validator.helper';

const route = Router();
route.use(authMiddleware);
route.use(requireOnboardingComplete);

const candidatesController = container.get<CandidatesController>(CandidatesController);

export default (app: Router) => {
    app.use('/candidates', route);

    // Get all candidates with their batches
    route.get(
        '/',
        candidatesController.GetAllCandidates.bind(candidatesController)
    );

    // Get all batches for partner
    route.get(
        '/batches',
        candidatesController.GetAllBatches.bind(candidatesController)
    );
    
    // Create a new candidate batch
    route.post(
        '/batches',
        (req, res, next) => {
            validate_create_batch(req.body, (err: any, status: boolean) => {
                if (!status) {
                    return sendError(res, err);
                }
                next();
            });
        },
        candidatesController.CreateBatch.bind(candidatesController)
    );

    // Create a single candidate
    route.post(
        '/',
        (req, res, next) => {
            validate_create_candidate(req.body, (err: any, status: boolean) => {
                if (!status) {
                    return sendError(res, err);
                }
                next();
            });
        },
        candidatesController.CreateCandidate.bind(candidatesController)
    );

    // Upload candidates via CSV (uses express-fileupload middleware)
    route.post(
        '/upload-csv',
        candidatesController.UploadCandidatesCSV.bind(candidatesController)
    );

    // Mark candidate as paid (partner only)
    route.patch(
        '/:candidate_id/mark-paid',
        candidatesController.MarkCandidateAsPaid.bind(candidatesController)
    );

    // Accept candidate invite (public - no auth required for this endpoint)
    // Note: This route should be registered without authMiddleware if used publicly
    route.post(
        '/:candidate_id/accept-invite',
        candidatesController.AcceptCandidateInvite.bind(candidatesController)
    );
};
