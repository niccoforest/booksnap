import mongoose, { Schema, Document } from 'mongoose'

export interface IActivity extends Document {
  userId: mongoose.Types.ObjectId
  type: 'book_added' | 'book_finished' | 'book_rated' | 'goal_achieved'
  bookId?: mongoose.Types.ObjectId
  payload?: any
  createdAt: Date
}

const ActivitySchema = new Schema<IActivity>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { 
      type: String, 
      enum: ['book_added', 'book_finished', 'book_rated', 'goal_achieved'], 
      required: true 
    },
    bookId: { type: Schema.Types.ObjectId, ref: 'Book' },
    payload: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

export const Activity = mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema)
