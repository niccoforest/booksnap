import mongoose, { Schema, Document } from 'mongoose'

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  active: boolean
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema)
