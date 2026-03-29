import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock global fetch if needed
global.fetch = vi.fn()

// Mock process.env
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'
process.env.JWT_SECRET = 'test-secret'
