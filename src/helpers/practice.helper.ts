export function breakdownPractice(analysis: any) {
    const breakdown: any = {};
    if (!analysis) {
        return breakdown;
    }

    const structured_data = analysis.structuredData;
    const response = {
        patient_name: structured_data?.station_info?.patient_name || null,
        patient_age: structured_data?.station_info?.patient_age || null,
        condition: structured_data?.station_info?.condition || null,
        prescription: structured_data?.station_info?.prescription || null,

        history_taking: structured_data?.evaluation.technical_performance.history_taking || null,
        appropriateness: structured_data?.evaluation.technical_performance.appropriateness || null,
        recommendations: structured_data?.evaluation.technical_performance.recommendations || null,
        patent_safety: structured_data?.evaluation.technical_performance.patient_safety || null,

        soft_skills: structured_data?.evaluation.soft_skills || null,
        general_rating: structured_data?.evaluation.general_rating || null,
        strengths: structured_data?.evaluation.feedback.strengths || null,
        improvements: structured_data?.evaluation.feedback.areas_for_improvement || null,
        examiner_comments: structured_data?.evaluation.feedback.examiner_notes || null,
    }

    return response;
}