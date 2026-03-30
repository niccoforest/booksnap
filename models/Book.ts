import mongoose, { Schema, Document } from 'mongoose'

export interface IBook extends Document {
  isbn?: string
  title: string
  authors: string[]
  publisher?: string
  publishedYear?: number
  genres: string[]
  coverUrl?: string
  description?: string
  pageCount?: number
  language?: string
  openLibraryKey?: string
  googleBooksId?: string
  createdAt: Date
}

const BookSchema = new Schema<IBook>(
  {
    isbn: { type: String, index: true, sparse: true },
    title: { type: String, required: true },
    authors: { type: [String], default: [] },
    publisher: { type: String },
    publishedYear: { type: Number },
    genres: { type: [String], default: [] },
    coverUrl: { type: String },
    description: { type: String },
    pageCount: { type: Number },
    language: { type: String },
    openLibraryKey: { type: String },
    googleBooksId: { type: String },
  },
  { timestamps: true }
)

BookSchema.index({ title: 'text', authors: 'text' })
BookSchema.index({ genres: 1 })
BookSchema.index({ language: 1 })
BookSchema.index({ publishedYear: 1 })
BookSchema.index({ pageCount: 1 })

export const Book = mongoose.models.Book || mongoose.model<IBook>('Book', BookSchema)
