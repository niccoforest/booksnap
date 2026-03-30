import mongoose, { Schema, Document } from 'mongoose'

export interface IChallenge extends Document {
  createdBy: mongoose.Types.ObjectId
  title: string
  description?: string
  type: 'book_count' | 'genre' | 'pages'
  goal: number
  genre?: string
  startDate: Date
  endDate: Date
  isPublic: boolean
  participants: Array<{
    userId: mongoose.Types.ObjectId
    progress: number
    joinedAt: Date
  }>
  createdAt: Date
  updatedAt: Date
}

const ChallengeSchema = new Schema<IChallenge>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, maxlength: 300 },
    type: { type: String, enum: ['book_count', 'genre', 'pages'], required: true },
    goal: { type: Number, required: true, min: 1 },
    genre: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isPublic: { type: Boolean, default: true },
    participants: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        progress: { type: Number, default: 0 },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
)

export const Challenge = mongoose.models.Challenge || mongoose.model<IChallenge>('Challenge', ChallengeSchema)
