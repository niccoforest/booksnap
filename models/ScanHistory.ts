import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IScanEntry {
  bookId: Types.ObjectId
  title: string
  authors: string[]
  coverUrl?: string
  confidence: number
  addedToLibrary: boolean
}

export interface IScanHistory extends Document {
  userId: Types.ObjectId
  scanType: 'cover' | 'spine' | 'multiple' | 'unknown'
  books: IScanEntry[]
  imageThumbnail?: string // base64 ridotto, max ~20KB
  scannedAt: Date
}

const ScanEntrySchema = new Schema<IScanEntry>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    title: { type: String, required: true },
    authors: { type: [String], default: [] },
    coverUrl: { type: String },
    confidence: { type: Number, default: 0 },
    addedToLibrary: { type: Boolean, default: false },
  },
  { _id: false }
)

const ScanHistorySchema = new Schema<IScanHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scanType: { type: String, enum: ['cover', 'spine', 'multiple', 'unknown'], default: 'cover' },
    books: { type: [ScanEntrySchema], default: [] },
    imageThumbnail: { type: String },
    scannedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

// Mantieni al massimo 100 scansioni per utente (le più vecchie vengono eliminate automaticamente)
ScanHistorySchema.index({ userId: 1, scannedAt: -1 })

export const ScanHistory =
  mongoose.models.ScanHistory ||
  mongoose.model<IScanHistory>('ScanHistory', ScanHistorySchema)
