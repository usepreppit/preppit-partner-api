export interface CreateBatchDTO {
    batch_name: string;
}

export interface CreateCandidateDTO {
    batch_id: string;
    firstname: string;
    lastname: string;
    email: string;
}

export interface UploadCandidatesCSVDTO {
    batch_id: string;
    file: any; // Multer file object
}

export interface CandidateWithBatch {
    _id: string;
    firstname: string;
    lastname: string;
    email: string;
    batch_id?: string;
    batch_name?: string;
    is_active: boolean;
    is_paid_for: boolean;
    invite_status: 'pending' | 'accepted' | 'expired';
    invite_sent_at?: Date;
    invite_accepted_at?: Date;
    partner_candidate_id?: string; // ID of the PartnerCandidate relationship record
    createdAt: Date;
    updatedAt: Date;
}

export interface BatchWithCandidateCount {
    _id: string;
    batch_name: string;
    partner_id: string;
    candidate_count: number;
    created_at: Date;
    updated_at: Date;
}

export interface CandidatesListResponse {
    candidates: CandidateWithBatch[];
    batches: BatchWithCandidateCount[];
    total_candidates: number;
    total_batches: number;
    pagination: {
        current_page: number;
        per_page: number;
        total_pages: number;
        has_next: boolean;
        has_previous: boolean;
    };
}

export interface CSVCandidateRow {
    firstname: string;
    lastname: string;
    email: string;
}

export interface CSVUploadResult {
    total_rows: number;
    successful: number;
    failed: number;
    errors: Array<{
        row: number;
        email: string;
        error: string;
    }>;
    candidates: CandidateWithBatch[];
}
