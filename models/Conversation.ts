import mongoose, { Schema, Document } from 'mongoose'

export interface IMessage {
  role: 'user' | 'assistant'
  content?: string
  books?: any[]
  query?: string
  createdAt: Date
}

export interface IConversation extends Document {
  userId: mongoose.Types.ObjectId
  title: string
  messages: IMessage[]
  lastMessageAt: Date
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

const MessageSchema = new Schema<IMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String },
    books: [{ type: Schema.Types.Mixed }], // Can contain book objects for the UI
    query: { type: String }, // User's query for results
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const ConversationSchema = new Schema<IConversation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true }, // Extract from first user message
    messages: { type: [MessageSchema], default: [] },
    lastMessageAt: { type: Date, default: Date.now },
    isArchived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
)

export const Conversation =
  mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema)
