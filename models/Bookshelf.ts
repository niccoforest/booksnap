import mongoose, { Schema, Document } from 'mongoose'

export interface IBookshelf extends Document {
  userId: mongoose.Types.ObjectId
  title: string
  description?: string
  books: mongoose.Types.ObjectId[]
  isPublic: boolean
  slug: string
  coverBookId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const BookshelfSchema = new Schema<IBookshelf>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, maxlength: 300 },
    books: [{ type: Schema.Types.ObjectId, ref: 'Book' }],
    isPublic: { type: Boolean, default: true },
    slug: { type: String, unique: true, sparse: true, index: true },
    coverBookId: { type: Schema.Types.ObjectId, ref: 'Book' },
  },
  { timestamps: true }
)

export const Bookshelf = mongoose.models.Bookshelf || mongoose.model<IBookshelf>('Bookshelf', BookshelfSchema)
