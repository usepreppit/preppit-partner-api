import mongoose, { Document } from 'mongoose';
import { IUser } from '../../../application/users/types/user.types';

/**
 * User Daily Sessions Model
 * Tracks daily session allocation and usage for each user
 * Separates subscription sessions (daily reset) from bonus sessions (no reset)
 */

export interface IUserDailySessions extends Document {
    userId: mongoose.Schema.Types.ObjectId | IUser;
    
    // Subscription-based sessions (reset daily at midnight)
    subscriptionDailySessions: number; // Total sessions from active subscriptions
    subscriptionUsedSessions: number; // Subscription sessions consumed today
    subscriptionRemainingSessions: number; // Subscription sessions left today
    
    // Bonus/Additional sessions (no daily reset, persist until used)
    bonusSessions: number; // One-time purchased sessions that don't reset
    
    // Combined totals for easy access
    totalDailySessions: number; // subscriptionDailySessions + bonusSessions
    usedSessions: number; // Total sessions consumed today
    remainingSessions: number; // Total sessions left (subscription + bonus)
    
    lastResetDate: Date; // Last time subscription sessions were reset
    nextResetDate: Date; // When next reset should happen
    subscriptionSources: Array<{
        subscriptionId: mongoose.Schema.Types.ObjectId;
        sessionsContributed: number;
    }>; // Track which subscriptions contributed sessions
    createdAt?: Date;
    updatedAt?: Date;
}

const UserDailySessionsSchema = new mongoose.Schema<IUserDailySessions>({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        unique: true,
        index: true 
    },
    
    // Subscription sessions (reset daily)
    subscriptionDailySessions: { 
        type: Number, 
        required: true, 
        default: 0,
        min: 0 
    },
    subscriptionUsedSessions: { 
        type: Number, 
        required: true, 
        default: 0,
        min: 0 
    },
    subscriptionRemainingSessions: { 
        type: Number, 
        required: true, 
        default: 0,
        min: 0 
    },
    
    // Bonus sessions (no reset, persist until used)
    bonusSessions: { 
        type: Number, 
        required: true, 
        default: 0,
        min: 0 
    },
    
    // Combined totals
    totalDailySessions: { 
        type: Number, 
        required: true, 
        default: 0,
        min: 0 
    },
    usedSessions: { 
        type: Number, 
        required: true, 
        default: 0,
        min: 0 
    },
    remainingSessions: { 
        type: Number, 
        required: true, 
        default: 0,
        min: 0 
    },
    
    lastResetDate: { 
        type: Date, 
        default: Date.now 
    },
    nextResetDate: { 
        type: Date, 
        default: () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0); // Reset at midnight
            return tomorrow;
        }
    },
    subscriptionSources: [{
        subscriptionId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Subscriptions' 
        },
        sessionsContributed: { 
            type: Number, 
            required: true 
        }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Index for efficient queries
UserDailySessionsSchema.index({ userId: 1, lastResetDate: -1 });

// Pre-save middleware to update remainingSessions
UserDailySessionsSchema.pre('save', function(next) {
    this.remainingSessions = Math.max(0, this.totalDailySessions - this.usedSessions);
    this.updatedAt = new Date();
    next();
});

export const UserDailySessionsModel = mongoose.model<IUserDailySessions>('UserDailySessions', UserDailySessionsSchema);
