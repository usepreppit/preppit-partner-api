import mongoose, { Document, Types } from 'mongoose';


export interface IExamEnrollment extends Document {
    userId: Types.ObjectId;
    examId: Types.ObjectId;
    exam_date?: Date;
    exam_practice_frequency?: string;
    joinedAt: Date;
}


const ExamEnrollmentSchema = new mongoose.Schema<IExamEnrollment>({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    exam_date: { type: Date },
    exam_practice_frequency: { type: String },
    joinedAt: { type: Date, default: Date.now }
});

ExamEnrollmentSchema.virtual("exams", {
    ref: "Exam",
    localField: "examId",
    foreignField: "_id",
    justOne: true
});

ExamEnrollmentSchema.set("toJSON", { virtuals: true });
ExamEnrollmentSchema.set("toObject", { virtuals: true });

ExamEnrollmentSchema.index({ userId: 1, examId: 1 }, { unique: true }); // Ensure unique enrollment per user per exam

export const ExamEnrollmentModel = mongoose.model<IExamEnrollment>('ExamEnrollment', ExamEnrollmentSchema);
