import { inject, injectable } from 'inversify';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import {
    PartnerExamsData,
    ExamDetails,
    ExamQuestionsData,
    ExamSessionsData,
    SessionDetails,
    ExamScenario
} from '../partner-exams.service';

@injectable()
export class PartnerExamsRepository {
    constructor(
        @inject('ExamModel') private examModel: Model<any>,
        @inject('ExamScenariosModel') private examScenariosModel: Model<any>,
        @inject('PracticeModel') private practiceModel: Model<any>
    ) {}

    async getPartnerExams(
        partner_id: string,
        page: number,
        limit: number,
        search: string
    ): Promise<PartnerExamsData> {
        const skip = (page - 1) * limit;
        
        // Build search filter
        const searchFilter = search ? {
            $or: [
                { exam_name: { $regex: search, $options: 'i' } },
                { exam_code: { $regex: search, $options: 'i' } }
            ]
        } : {};

        // Get all exams with session statistics
        const pipeline: any[] = [
            { $match: { is_active: true, ...searchFilter } },
            {
                $lookup: {
                    from: 'examscenarios',
                    localField: '_id',
                    foreignField: 'exam_id',
                    as: 'scenarios'
                }
            },
            {
                $lookup: {
                    from: 'practices',
                    let: { exam_id: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$exam_id', '$$exam_id'] },
                                practice_type: 'exam'
                            }
                        },
                        {
                            $lookup: {
                                from: 'partnercandidates',
                                localField: 'user_id',
                                foreignField: 'candidate_id',
                                as: 'partnerCandidate'
                            }
                        },
                        { $unwind: { path: '$partnerCandidate', preserveNullAndEmptyArrays: false } },
                        {
                            $match: {
                                'partnerCandidate.partner_id': new mongoose.Types.ObjectId(partner_id)
                            }
                        }
                    ],
                    as: 'sessions'
                }
            },
            {
                $addFields: {
                    total_scenarios: { $size: '$scenarios' },
                    total_questions: {
                        $sum: {
                            $map: {
                                input: '$scenarios',
                                as: 'scenario',
                                in: { $size: { $ifNull: ['$$scenario.questions', []] } }
                            }
                        }
                    },
                    total_sessions: { $size: '$sessions' },
                    completed_sessions: {
                        $size: {
                            $filter: {
                                input: '$sessions',
                                as: 'session',
                                cond: { $eq: ['$$session.status', 'completed'] }
                            }
                        }
                    },
                    average_score: {
                        $avg: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: '$sessions',
                                        as: 'session',
                                        cond: { $eq: ['$$session.status', 'completed'] }
                                    }
                                },
                                as: 'session',
                                in: '$$session.score'
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    exam_id: '$_id',
                    exam_name: 1,
                    exam_code: 1,
                    description: 1,
                    duration_minutes: 1,
                    passing_score: 1,
                    total_scenarios: 1,
                    total_questions: 1,
                    total_sessions: 1,
                    completed_sessions: 1,
                    average_score: { $round: [{ $ifNull: ['$average_score', 0] }, 2] },
                    is_active: 1,
                    created_at: '$createdAt'
                }
            },
            { $sort: { exam_name: 1 } }
        ];

        // Get total count
        const countPipeline = [...pipeline, { $count: 'total' }];
        const countResult = await this.examModel.aggregate(countPipeline);
        const total = countResult[0]?.total || 0;

        // Get paginated results
        const exams = await this.examModel.aggregate([
            ...pipeline,
            { $skip: skip },
            { $limit: limit }
        ]);

        return {
            exams,
            total,
            page,
            limit,
            total_pages: Math.ceil(total / limit)
        };
    }

    async getExamDetails(partner_id: string, exam_id: string): Promise<ExamDetails | null> {
        const exam = await this.examModel.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(exam_id), is_active: true } },
            {
                $lookup: {
                    from: 'examscenarios',
                    localField: '_id',
                    foreignField: 'exam_id',
                    as: 'scenarios'
                }
            },
            {
                $lookup: {
                    from: 'practices',
                    let: { exam_id: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$exam_id', '$$exam_id'] },
                                practice_type: 'exam'
                            }
                        },
                        {
                            $lookup: {
                                from: 'partnercandidates',
                                localField: 'user_id',
                                foreignField: 'candidate_id',
                                as: 'partnerCandidate'
                            }
                        },
                        { $unwind: { path: '$partnerCandidate', preserveNullAndEmptyArrays: false } },
                        {
                            $match: {
                                'partnerCandidate.partner_id': new mongoose.Types.ObjectId(partner_id)
                            }
                        }
                    ],
                    as: 'sessions'
                }
            },
            {
                $addFields: {
                    scenario_list: {
                        $map: {
                            input: '$scenarios',
                            as: 'scenario',
                            in: {
                                scenario_id: '$$scenario._id',
                                scenario_title: '$$scenario.scenario_title',
                                question_count: { $size: { $ifNull: ['$$scenario.questions', []] } }
                            }
                        }
                    },
                    total_sessions: { $size: '$sessions' },
                    completed_sessions: {
                        $size: {
                            $filter: {
                                input: '$sessions',
                                as: 'session',
                                cond: { $eq: ['$$session.status', 'completed'] }
                            }
                        }
                    },
                    in_progress_sessions: {
                        $size: {
                            $filter: {
                                input: '$sessions',
                                as: 'session',
                                cond: { $eq: ['$$session.status', 'in_progress'] }
                            }
                        }
                    },
                    completed_session_scores: {
                        $map: {
                            input: {
                                $filter: {
                                    input: '$sessions',
                                    as: 'session',
                                    cond: { $eq: ['$$session.status', 'completed'] }
                                }
                            },
                            as: 'session',
                            in: '$$session.score'
                        }
                    },
                    unique_candidates: {
                        $size: {
                            $setUnion: {
                                $map: {
                                    input: '$sessions',
                                    as: 'session',
                                    in: '$$session.user_id'
                                }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    exam_id: '$_id',
                    exam_name: 1,
                    exam_code: 1,
                    description: 1,
                    duration_minutes: 1,
                    passing_score: 1,
                    total_scenarios: { $size: '$scenarios' },
                    total_questions: {
                        $sum: {
                            $map: {
                                input: '$scenarios',
                                as: 'scenario',
                                in: { $size: { $ifNull: ['$$scenario.questions', []] } }
                            }
                        }
                    },
                    scenarios: '$scenario_list',
                    statistics: {
                        total_sessions: '$total_sessions',
                        completed_sessions: '$completed_sessions',
                        in_progress_sessions: '$in_progress_sessions',
                        average_score: {
                            $round: [
                                { $avg: { $ifNull: ['$completed_session_scores', [0]] } },
                                2
                            ]
                        },
                        pass_rate: {
                            $cond: {
                                if: { $gt: ['$completed_sessions', 0] },
                                then: {
                                    $round: [
                                        {
                                            $multiply: [
                                                {
                                                    $divide: [
                                                        {
                                                            $size: {
                                                                $filter: {
                                                                    input: '$completed_session_scores',
                                                                    as: 'score',
                                                                    cond: { $gte: ['$$score', '$passing_score'] }
                                                                }
                                                            }
                                                        },
                                                        '$completed_sessions'
                                                    ]
                                                },
                                                100
                                            ]
                                        },
                                        2
                                    ]
                                },
                                else: 0
                            }
                        },
                        total_candidates_attempted: '$unique_candidates'
                    }
                }
            }
        ]);

        return exam[0] || null;
    }

    async getExamQuestions(
        _partner_id: string,
        exam_id: string,
        page: number,
        limit: number,
        scenario_id: string
    ): Promise<ExamQuestionsData | null> {
        const skip = (page - 1) * limit;

        // Verify exam exists
        const exam = await this.examModel.findById(exam_id);
        if (!exam) return null;

        // Build scenario filter
        const scenarioFilter = scenario_id 
            ? { _id: new mongoose.Types.ObjectId(scenario_id) }
            : { exam_id: new mongoose.Types.ObjectId(exam_id) };

        // Get scenarios with questions
        const scenarios = await this.examScenariosModel.find(scenarioFilter);

        // Flatten all questions
        const allQuestions: any[] = [];
        scenarios.forEach(scenario => {
            if (scenario.questions && scenario.questions.length > 0) {
                scenario.questions.forEach((question: any, index: number) => {
                    allQuestions.push({
                        question_id: question._id || `${scenario._id}_${index}`,
                        scenario_id: scenario._id,
                        scenario_title: scenario.scenario_title,
                        question_text: question.question_text || question.text,
                        question_type: question.question_type || question.type || 'multiple_choice',
                        options: question.options || [],
                        correct_answer: question.correct_answer || question.answer,
                        points: question.points || 1,
                        difficulty: question.difficulty || 'medium',
                        order: question.order || index + 1
                    });
                });
            }
        });

        const total = allQuestions.length;
        const paginatedQuestions = allQuestions.slice(skip, skip + limit);

        const scenarioName = scenario_id 
            ? scenarios[0]?.scenario_title 
            : undefined;

        return {
            questions: paginatedQuestions,
            total,
            page,
            limit,
            total_pages: Math.ceil(total / limit),
            exam_name: exam.exam_name,
            scenario_name: scenarioName
        };
    }

    async getExamSessions(
        partner_id: string,
        exam_id: string,
        page: number,
        limit: number,
        filters: {
            candidate_id?: string;
            status?: string;
            start_date?: string;
            end_date?: string;
        }
    ): Promise<ExamSessionsData | null> {
        const skip = (page - 1) * limit;

        // Verify exam exists
        const exam = await this.examModel.findById(exam_id);
        if (!exam) return null;

        // Build match filters
        const matchFilter: any = {
            exam_id: new mongoose.Types.ObjectId(exam_id),
            practice_type: 'exam'
        };

        if (filters.status) {
            matchFilter.status = filters.status;
        }

        if (filters.start_date || filters.end_date) {
            matchFilter.createdAt = {};
            if (filters.start_date) {
                matchFilter.createdAt.$gte = new Date(filters.start_date);
            }
            if (filters.end_date) {
                matchFilter.createdAt.$lte = new Date(filters.end_date);
            }
        }

        const pipeline: any[] = [
            { $match: matchFilter },
            {
                $lookup: {
                    from: 'partnercandidates',
                    localField: 'user_id',
                    foreignField: 'candidate_id',
                    as: 'partnerCandidate'
                }
            },
            { $unwind: { path: '$partnerCandidate', preserveNullAndEmptyArrays: false } },
            {
                $match: {
                    'partnerCandidate.partner_id': new mongoose.Types.ObjectId(partner_id)
                }
            }
        ];

        // Add candidate filter if specified
        if (filters.candidate_id) {
            pipeline.push({
                $match: {
                    user_id: new mongoose.Types.ObjectId(filters.candidate_id)
                }
            });
        }

        pipeline.push(
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'candidate'
                }
            },
            { $unwind: '$candidate' },
            {
                $lookup: {
                    from: 'candidatebatches',
                    localField: 'partnerCandidate.batch_id',
                    foreignField: '_id',
                    as: 'batch'
                }
            },
            {
                $addFields: {
                    duration_minutes: {
                        $cond: {
                            if: '$end_time',
                            then: {
                                $dateDiff: {
                                    startDate: '$start_time',
                                    endDate: '$end_time',
                                    unit: 'minute'
                                }
                            },
                            else: null
                        }
                    }
                }
            },
            {
                $project: {
                    session_id: '$_id',
                    candidate_id: '$user_id',
                    candidate_name: { $concat: ['$candidate.firstname', ' ', { $ifNull: ['$candidate.lastname', ''] }] },
                    candidate_email: '$candidate.email',
                    batch_name: { $arrayElemAt: ['$batch.batch_name', 0] },
                    status: 1,
                    score: 1,
                    total_questions: { $size: { $ifNull: ['$questions', []] } },
                    answered_questions: {
                        $size: {
                            $filter: {
                                input: { $ifNull: ['$answers', []] },
                                as: 'answer',
                                cond: { $ne: ['$$answer', null] }
                            }
                        }
                    },
                    start_time: 1,
                    end_time: 1,
                    duration_minutes: 1,
                    passed: {
                        $cond: {
                            if: { $and: [{ $ne: ['$score', null] }, { $eq: ['$status', 'completed'] }] },
                            then: { $gte: ['$score', exam.passing_score] },
                            else: null
                        }
                    }
                }
            },
            { $sort: { start_time: -1 } }
        );

        // Get total count
        const countPipeline = [...pipeline, { $count: 'total' }];
        const countResult = await this.practiceModel.aggregate(countPipeline);
        const total = countResult[0]?.total || 0;

        // Get paginated sessions
        const sessions = await this.practiceModel.aggregate([
            ...pipeline,
            { $skip: skip },
            { $limit: limit }
        ]);

        // Get summary statistics
        const summaryPipeline = pipeline.slice(0, -1); // Remove sort
        summaryPipeline.push({
            $group: {
                _id: null,
                total_sessions: { $sum: 1 },
                completed: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                in_progress: {
                    $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
                },
                abandoned: {
                    $sum: { $cond: [{ $eq: ['$status', 'abandoned'] }, 1, 0] }
                },
                scores: {
                    $push: {
                        $cond: [
                            { $eq: ['$status', 'completed'] },
                            '$score',
                            null
                        ]
                    }
                },
                passed_count: {
                    $sum: {
                        $cond: [
                            { $gte: ['$score', exam.passing_score] },
                            1,
                            0
                        ]
                    }
                }
            }
        });

        const summaryResult = await this.practiceModel.aggregate(summaryPipeline);
        const summary = summaryResult[0] || {
            total_sessions: 0,
            completed: 0,
            in_progress: 0,
            abandoned: 0,
            scores: [],
            passed_count: 0
        };

        const validScores = summary.scores.filter((s: number) => s !== null);
        const averageScore = validScores.length > 0 
            ? validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length 
            : 0;
        const passRate = summary.completed > 0 
            ? (summary.passed_count / summary.completed) * 100 
            : 0;

        return {
            sessions,
            total,
            page,
            limit,
            total_pages: Math.ceil(total / limit),
            exam_name: exam.exam_name,
            summary: {
                total_sessions: summary.total_sessions,
                completed: summary.completed,
                in_progress: summary.in_progress,
                abandoned: summary.abandoned,
                average_score: Math.round(averageScore * 100) / 100,
                pass_rate: Math.round(passRate * 100) / 100
            }
        };
    }

    async getSessionDetails(
        partner_id: string,
        exam_id: string,
        session_id: string
    ): Promise<SessionDetails | null> {
        const session = await this.practiceModel.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(session_id),
                    exam_id: new mongoose.Types.ObjectId(exam_id),
                    practice_type: 'exam'
                }
            },
            {
                $lookup: {
                    from: 'partnercandidates',
                    localField: 'user_id',
                    foreignField: 'candidate_id',
                    as: 'partnerCandidate'
                }
            },
            { $unwind: { path: '$partnerCandidate', preserveNullAndEmptyArrays: false } },
            {
                $match: {
                    'partnerCandidate.partner_id': new mongoose.Types.ObjectId(partner_id)
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'candidate'
                }
            },
            { $unwind: '$candidate' },
            {
                $lookup: {
                    from: 'candidatebatches',
                    localField: 'partnerCandidate.batch_id',
                    foreignField: '_id',
                    as: 'batch'
                }
            },
            {
                $lookup: {
                    from: 'exams',
                    localField: 'exam_id',
                    foreignField: '_id',
                    as: 'exam'
                }
            },
            { $unwind: '$exam' },
            {
                $addFields: {
                    duration_minutes: {
                        $cond: {
                            if: '$end_time',
                            then: {
                                $dateDiff: {
                                    startDate: '$start_time',
                                    endDate: '$end_time',
                                    unit: 'minute'
                                }
                            },
                            else: null
                        }
                    }
                }
            },
            {
                $project: {
                    session_id: '$_id',
                    exam_id: 1,
                    exam_name: '$exam.exam_name',
                    candidate: {
                        candidate_id: '$user_id',
                        name: { $concat: ['$candidate.firstname', ' ', { $ifNull: ['$candidate.lastname', ''] }] },
                        email: '$candidate.email',
                        batch_name: { $arrayElemAt: ['$batch.batch_name', 0] }
                    },
                    status: 1,
                    score: 1,
                    passed: {
                        $cond: {
                            if: { $and: [{ $ne: ['$score', null] }, { $eq: ['$status', 'completed'] }] },
                            then: { $gte: ['$score', '$exam.passing_score'] },
                            else: null
                        }
                    },
                    start_time: 1,
                    end_time: 1,
                    duration_minutes: 1,
                    total_questions: { $size: { $ifNull: ['$questions', []] } },
                    answered_questions: {
                        $size: {
                            $filter: {
                                input: { $ifNull: ['$answers', []] },
                                as: 'answer',
                                cond: { $ne: ['$$answer', null] }
                            }
                        }
                    },
                    answers: { $ifNull: ['$answers', []] },
                    questions: { $ifNull: ['$questions', []] }
                }
            }
        ]);

        if (!session || session.length === 0) return null;

        const sessionData = session[0];

        // Format answers with question details
        const formattedAnswers = sessionData.questions.map((question: any, index: number) => {
            const answer = sessionData.answers[index];
            return {
                question_id: question._id || question.id,
                question_text: question.question_text || question.text,
                scenario_title: question.scenario_title || 'N/A',
                candidate_answer: answer?.answer || answer,
                correct_answer: question.correct_answer || question.answer,
                is_correct: answer?.is_correct || false,
                points_earned: answer?.points_earned || 0,
                points_possible: question.points || 1
            };
        });

        return {
            session_id: sessionData.session_id,
            exam_id: sessionData.exam_id,
            exam_name: sessionData.exam_name,
            candidate: sessionData.candidate,
            status: sessionData.status,
            score: sessionData.score,
            passed: sessionData.passed,
            start_time: sessionData.start_time,
            end_time: sessionData.end_time,
            duration_minutes: sessionData.duration_minutes,
            total_questions: sessionData.total_questions,
            answered_questions: sessionData.answered_questions,
            answers: formattedAnswers
        };
    }

    async getExamScenarios(_partner_id: string, exam_id: string): Promise<ExamScenario[] | null> {
        // Verify exam exists
        const exam = await this.examModel.findById(exam_id);
        if (!exam) return null;

        const scenarios = await this.examScenariosModel.aggregate([
            { $match: { exam_id: new mongoose.Types.ObjectId(exam_id) } },
            {
                $project: {
                    scenario_id: '$_id',
                    scenario_title: 1,
                    description: 1,
                    question_count: { $size: { $ifNull: ['$questions', []] } },
                    total_points: {
                        $sum: {
                            $map: {
                                input: { $ifNull: ['$questions', []] },
                                as: 'question',
                                in: { $ifNull: ['$$question.points', 1] }
                            }
                        }
                    },
                    order: { $ifNull: ['$order', 0] }
                }
            },
            { $sort: { order: 1, scenario_title: 1 } }
        ]);

        return scenarios;
    }
}
