import mongoose, { Schema, Document } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser extends Document {
  email: string
  username: string
  passwordHash?: string
  googleId?: string
  authProvider: 'local' | 'google' | 'both'
  avatarCustomized?: boolean
  avatar?: string
  bio?: string
  preferences: {
    favoriteGenres: string[]
    genreOverrides?: Map<string, 'boost' | 'suppress'>
    language: string
    theme: 'dark' | 'light'
  }
  aiCache?: {
    insights?: { data: any[]; expiresAt: Date }
    goals?: { data: any[]; expiresAt: Date }
  }
  isPublic: boolean
  followers: mongoose.Types.ObjectId[]
  following: mongoose.Types.ObjectId[]
  profileSlug: string
  createdAt: Date
  comparePassword(candidate: string): Promise<boolean>
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    authProvider: { type: String, enum: ['local', 'google', 'both'], default: 'local' },
    avatarCustomized: { type: Boolean, default: false },
    avatar: { type: String },
    bio: { type: String, maxlength: 300 },
    preferences: {
      favoriteGenres: { type: [String], default: [] },
      genreOverrides: { type: Map, of: String },
      language: { type: String, default: 'it' },
      theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
    },
    aiCache: {
      insights: { data: [Schema.Types.Mixed], expiresAt: Date },
      goals: { data: [Schema.Types.Mixed], expiresAt: Date },
    },
    isPublic: { type: Boolean, default: true },
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    profileSlug: { type: String, unique: true, sparse: true, trim: true },
  },
  { timestamps: true }
)

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.passwordHash) return false
  return bcrypt.compare(candidate, this.passwordHash)
}

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
