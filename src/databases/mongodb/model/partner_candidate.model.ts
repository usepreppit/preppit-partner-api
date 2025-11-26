// Purpose: Interface for Partner-Candidate relationship (many-to-many)
// A candidate can be onboarded by multiple partners, and a partner can onboard multiple candidates

export interface IPartnerCandidate {
    _id?: string | number;
    partner_id: string | number; // Reference to the partner
    candidate_id: string | number; // Reference to the user (candidate)
    batch_id: string | number; // Reference to the batch
    is_paid_for: boolean; // Partner subscription status for this candidate
    invite_status: 'pending' | 'accepted' | 'expired'; // Invite acceptance status
    invite_sent_at?: Date; // When invite was sent
    invite_accepted_at?: Date; // When invite was accepted
    createdAt?: Date;
    updatedAt?: Date;
}
