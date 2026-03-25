import mongoose, { Schema, Document } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser extends Document {
  email: string
  username: string
  passwordHash: string
  avatar?: string
  bio?: string
  preferences: {
    favoriteGenres: string[]
    language: string
    theme: 'dark' | 'light'
  }
  createdAt: Date
  comparePassword(candidate: string): Promise<boolean>
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    avatar: { type: String },
    bio: { type: String, maxlength: 300 },
    preferences: {
      favoriteGenres: { type: [String], default: [] },
      language: { type: String, default: 'it' },
      theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
    },
  },
  { timestamps: true }
)

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash)
}

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
