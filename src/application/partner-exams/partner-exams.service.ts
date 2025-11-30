import { inject, injectable } from 'inversify';
import { PartnerExamsRepository } from './models/partner-exams.repository';
import { ApiError } from '../../helpers/error.helper';
import { Logger } from '../../startup/logger';

export interface PartnerExam {
    exam_id: string;
    exam_name: string;
    exam_code: string;
    description: string;
    duration_minutes: number;
    passing_score: number;
    total_scenarios: number;
    total_questions: number;
    total_sessions: number;
    completed_sessions: number;
    average_score: number;
    is_active: boolean;
    created_at: Date;
}

export interface PartnerExamsData {
    exams: PartnerExam[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface ExamDetails {
    exam_id: string;
    exam_name: string;
    exam_code: string;
    description: string;
    duration_minutes: number;
    passing_score: number;
    total_scenarios: number;
    total_questions: number;
    scenarios: Array<{
        scenario_id: string;
        scenario_title: string;
        question_count: number;
    }>;
    statistics: {
        total_sessions: number;
        completed_sessions: number;
        in_progress_sessions: number;
        average_score: number;
        pass_rate: number;
        total_candidates_attempted: number;
    };
}

export interface ExamQuestion {
    question_id: string;
    scenario_id: string;
    scenario_title: string;
    question_text: string;
    question_type: string;
    options?: any[];
    correct_answer?: string;
    points: number;
    difficulty: string;
    order: number;
}

export interface ExamQuestionsData {
    questions: ExamQuestion[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    exam_name: string;
    scenario_name?: string;
}

export interface ExamSession {
    session_id: string;
    candidate_id: string;
    candidate_name: string;
    candidate_email: string;
    batch_name: string;
    status: 'in_progress' | 'completed' | 'abandoned';
    score: number | null;
    total_questions: number;
    answered_questions: number;
    start_time: Date;
    end_time: Date | null;
    duration_minutes: number | null;
    passed: boolean | null;
}

export interface ExamSessionsData {
    sessions: ExamSession[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    exam_name: string;
    summary: {
        total_sessions: number;
        completed: number;
        in_progress: number;
        abandoned: number;
        average_score: number;
        pass_rate: number;
    };
}

export interface SessionDetails {
    session_id: string;
    exam_id: string;
    exam_name: string;
    candidate: {
        candidate_id: string;
        name: string;
        email: string;
        batch_name: string;
    };
    status: string;
    score: number | null;
    passed: boolean | null;
    start_time: Date;
    end_time: Date | null;
    duration_minutes: number | null;
    total_questions: number;
    answered_questions: number;
    answers: Array<{
        question_id: string;
        question_text: string;
        scenario_title: string;
        candidate_answer: any;
        correct_answer: any;
        is_correct: boolean;
        points_earned: number;
        points_possible: number;
    }>;
}

export interface ExamScenario {
    scenario_id: string;
    scenario_title: string;
    description: string;
    question_count: number;
    total_points: number;
    order: number;
}

@injectable()
export class PartnerExamsService {
    constructor(
        @inject('PartnerExamsRepository') private partnerExamsRepository: PartnerExamsRepository,
        @inject(Logger) private logger: Logger
    ) {}

    async getPartnerExams(
        partner_id: string,
        page: number = 1,
        limit: number = 20,
        search: string = ''
    ): Promise<PartnerExamsData> {
        try {
            if (page < 1) page = 1;
            if (limit < 1 || limit > 100) limit = 20;

            const examsData = await this.partnerExamsRepository.getPartnerExams(
                partner_id,
                page,
                limit,
                search
            );
            return examsData;
        } catch (error) {
            this.logger.error('Error getting partner exams:', error);
            throw new ApiError(500, 'Failed to retrieve exams');
        }
    }

    async getExamDetails(partner_id: string, exam_id: string): Promise<ExamDetails> {
        try {
            const examDetails = await this.partnerExamsRepository.getExamDetails(
                partner_id,
                exam_id
            );
            
            if (!examDetails) {
                throw new ApiError(404, 'Exam not found');
            }
            
            return examDetails;
        } catch (error) {
            this.logger.error('Error getting exam details:', error);
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Failed to retrieve exam details');
        }
    }

    async getExamQuestions(
        partner_id: string,
        exam_id: string,
        page: number = 1,
        limit: number = 50,
        scenario_id: string = ''
    ): Promise<ExamQuestionsData> {
        try {
            if (page < 1) page = 1;
            if (limit < 1 || limit > 100) limit = 50;

            const questionsData = await this.partnerExamsRepository.getExamQuestions(
                partner_id,
                exam_id,
                page,
                limit,
                scenario_id
            );
            
            if (!questionsData) {
                throw new ApiError(404, 'Exam not found');
            }
            
            return questionsData;
        } catch (error) {
            this.logger.error('Error getting exam questions:', error);
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Failed to retrieve exam questions');
        }
    }

    async getExamSessions(
        partner_id: string,
        exam_id: string,
        page: number = 1,
        limit: number = 20,
        filters: {
            candidate_id?: string;
            status?: string;
            start_date?: string;
            end_date?: string;
        } = {}
    ): Promise<ExamSessionsData> {
        try {
            if (page < 1) page = 1;
            if (limit < 1 || limit > 100) limit = 20;

            const sessionsData = await this.partnerExamsRepository.getExamSessions(
                partner_id,
                exam_id,
                page,
                limit,
                filters
            );
            
            if (!sessionsData) {
                throw new ApiError(404, 'Exam not found');
            }
            
            return sessionsData;
        } catch (error) {
            this.logger.error('Error getting exam sessions:', error);
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Failed to retrieve exam sessions');
        }
    }

    async getSessionDetails(
        partner_id: string,
        exam_id: string,
        session_id: string
    ): Promise<SessionDetails> {
        try {
            const sessionDetails = await this.partnerExamsRepository.getSessionDetails(
                partner_id,
                exam_id,
                session_id
            );
            
            if (!sessionDetails) {
                throw new ApiError(404, 'Session not found');
            }
            
            return sessionDetails;
        } catch (error) {
            this.logger.error('Error getting session details:', error);
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Failed to retrieve session details');
        }
    }

    async getExamScenarios(partner_id: string, exam_id: string): Promise<ExamScenario[]> {
        try {
            const scenarios = await this.partnerExamsRepository.getExamScenarios(
                partner_id,
                exam_id
            );
            
            if (!scenarios) {
                throw new ApiError(404, 'Exam not found');
            }
            
            return scenarios;
        } catch (error) {
            this.logger.error('Error getting exam scenarios:', error);
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Failed to retrieve exam scenarios');
        }
    }
}
