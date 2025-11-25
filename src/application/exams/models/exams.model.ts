import mongoose, { Document, Types } from 'mongoose';

export enum ExamStatus {
    DRAFT = "draft",
    PUBLISHED = "published",
    ARCHIVED = "archived",
}

export interface IExam extends Document {
    title: string
    description?: string
    type:  "osce" | "mcq" | "oral" | "interactive"
    durationMinutes?: number
    sim_name: string
    createdBy: Types.ObjectId
    tags?: string[]
    slug: string
    isRandomized?: boolean
    status: ExamStatus
    createdAt: Date
    updatedAt: Date
}

const ExamSchema = new mongoose.Schema<IExam>({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ["osce", "mcq", "oral", "interactive"], required: true },
    durationMinutes: { type: Number, default: 60 },
    sim_name: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tags: [{ type: String }],
    slug: { type: String, unique: true, required: true },
    isRandomized: { type: Boolean, default: false },
    status: { type: String, enum: Object.values(ExamStatus), default: ExamStatus.DRAFT },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// --- add this virtual ---
// ExamSchema.virtual("exam_scenarios", {
//     ref: "ExamScenario",       // 👈 must match your model name in ExamScenarios.ts
//     localField: "_id",         // exam._id
//     foreignField: "examId",    // matches ExamScenarios.examId
// });

// Also include counts if you want
ExamSchema.virtual("exam_scenario_count", {
    ref: "ExamScenario",
    localField: "_id",
    foreignField: "examId",
    count: true,               // 👈 gives you a number instead of an array
});

// Make sure virtuals appear in JSON/objects
ExamSchema.set("toJSON", { virtuals: true });
ExamSchema.set("toObject", { virtuals: true });

export const ExamModel = mongoose.model<IExam>('Exam', ExamSchema);
