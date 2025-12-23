import mongoose, { Document, Types } from 'mongoose';

const Scenario_Status = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    ARCHIVED: 'archived',
    DELETED: 'deleted'
}

export interface IExamScenarios extends Document {
    examId: Types.ObjectId;
    question_details: any;
    available_references?: object[];
    reference_check: boolean;
    image_check: boolean;
    document_url?: string;
    page_number?: number;
    status?: string;
    provider?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const ExamScenariosSchema = new mongoose.Schema<IExamScenarios>({
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    question_details: {
        type: Object,
        required: true,
        validate: {
            validator: function (v: any) {
                // Add custom validation logic if needed
                return v && typeof v === 'object';
            },
            message: 'Question details must be a valid object'
        }
    },
    available_references: { type: Array, default: [] },
    reference_check: { type: Boolean, default: false },
    image_check: { type: Boolean, default: false },
    document_url: { type: String, default: '', index: true },
    page_number: { type: Number, default: 0 },
    status: { type: String, enum: Object.values(Scenario_Status), default: Scenario_Status.ACTIVE },
    provider: { type: String, default: 'pharm-achieve' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});



export const ExamScenariosModel = mongoose.model<IExamScenarios>('ExamScenario', ExamScenariosSchema);
