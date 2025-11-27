// Partner Dashboard Types

export interface KeyMetrics {
    total_candidates_enrolled: number;
    completed_sessions_this_month: number;
    completed_sessions_all_time: number;
    average_candidate_score: number;
    average_candidate_performance: string; // "Excellent" | "Good" | "Fair" | "Needs Improvement"
    candidates_paid: number; // Number of candidates marked as paid
    candidates_pending_payment: number; // Number of candidates not yet paid
    invites_accepted: number; // Number of candidates who accepted invite
    invites_pending: number; // Number of pending invites
}

export interface FinanceMetrics {
    revenue_and_payouts: {
        total_revenue_generated: number;
        total_payouts: number;
        pending_payout: number;
        currency: string;
    };
    practice_sessions: {
        purchased: number;
        utilized: number;
        utilization_rate: number; // percentage
    };
}

export interface PracticeMetrics {
    practice_sessions_taken: {
        total: number;
        this_month: number;
        this_week: number;
    };
    feedback_trends: {
        positive: number;
        neutral: number;
        negative: number;
        average_rating: number; // out of 5
    };
    popular_exam_types: Array<{
        exam_type: string;
        session_count: number;
    }>;
}

export interface NextStepItem {
    id: string;
    title: string;
    description: string;
    status: 'completed' | 'pending';
    action_url?: string;
    completed_at?: Date;
}

export interface NextSteps {
    items: NextStepItem[];
    completion_percentage: number;
}

export interface PartnerDashboardData {
    key_metrics: KeyMetrics;
    finance_metrics: FinanceMetrics;
    practice_metrics: PracticeMetrics;
    next_steps: NextSteps;
}

export interface CandidateEnrollment {
    candidate_id: string;
    candidate_name: string;
    enrolled_at: Date;
    exam_type: string;
    sessions_completed: number;
    average_score: number;
}

export interface RecentActivity {
    id: string;
    type: 'session_completed' | 'candidate_enrolled' | 'payment_received' | 'feedback_received';
    description: string;
    timestamp: Date;
    metadata?: any;
}
