import mongoose, { Schema, Document } from 'mongoose'

export type ReadingStatus = 'to_read' | 'reading' | 'completed' | 'abandoned' | 'lent'

export interface BookEntry {
  bookId: mongoose.Types.ObjectId
  status: ReadingStatus
  rating?: number // 1-5
  review?: string
  tags: string[]
  startedAt?: Date
  finishedAt?: Date
  addedAt: Date
  readInPast?: boolean
  lentTo?: string
  notes?: string
  liked?: boolean    // "Piaciuto" — segnale leggero, cuore
  favorite?: boolean // "Preferito" — segnale forte, stella
  location?: string  // Posizione fisica, es. "Soggiorno", "Scaffale camera"
  behindRow?: boolean // true = libro nascosto dietro un'altra fila
}

export interface ILibrary extends Document {
  userId: mongoose.Types.ObjectId
  name: string
  description?: string
  emoji?: string
  isDefault: boolean
  books: BookEntry[]
  createdAt: Date
}

const BookEntrySchema = new Schema<BookEntry>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    status: {
      type: String,
      enum: ['to_read', 'reading', 'completed', 'abandoned', 'lent'],
      default: 'to_read',
    },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String, maxlength: 2000 },
    tags: { type: [String], default: [] },
    startedAt: { type: Date },
    finishedAt: { type: Date },
    addedAt: { type: Date, default: Date.now },
    lentTo: { type: String },
    notes: { type: String },
    liked: { type: Boolean, default: false },
    favorite: { type: Boolean, default: false },
    location: { type: String, trim: true, maxlength: 100 },
    behindRow: { type: Boolean, default: false },
  },
  { _id: false }
)

const LibrarySchema = new Schema<ILibrary>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    emoji: { type: String, default: '📚' },
    isDefault: { type: Boolean, default: false },
    books: { type: [BookEntrySchema], default: [] },
  },
  { timestamps: true }
)

export const Library = mongoose.models.Library || mongoose.model<ILibrary>('Library', LibrarySchema)
