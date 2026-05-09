import { describe, it, expect } from 'vitest'
import {
  studentSchema,
  studentUpdateSchema,
  attendanceSchema,
  scheduleSessionSchema,
  dateRangeSchema,
  searchParamsSchema,
} from '../validation'

describe('studentSchema', () => {
  it('accepts valid student', () => {
    const result = studentSchema.safeParse({ name: 'Alice', size: 'M', category: 'K', eventId: 1 })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = studentSchema.safeParse({ name: '', size: 'M', category: 'K', eventId: 1 })
    expect(result.success).toBe(false)
  })

  it('rejects missing eventId', () => {
    const result = studentSchema.safeParse({ name: 'Alice', size: 'M', category: 'K' })
    expect(result.success).toBe(false)
  })

  it('rejects negative eventId', () => {
    const result = studentSchema.safeParse({ name: 'Alice', size: 'M', category: 'K', eventId: -1 })
    expect(result.success).toBe(false)
  })

  it('trims whitespace from name', () => {
    const result = studentSchema.safeParse({ name: '  Alice  ', size: 'M', category: 'K', eventId: 1 })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe('Alice')
  })
})

describe('studentUpdateSchema', () => {
  it('accepts partial update with id', () => {
    const result = studentUpdateSchema.safeParse({ id: 1, name: 'Bob' })
    expect(result.success).toBe(true)
  })

  it('rejects missing id', () => {
    const result = studentUpdateSchema.safeParse({ name: 'Bob' })
    expect(result.success).toBe(false)
  })
})

describe('attendanceSchema', () => {
  it('accepts valid attendance', () => {
    const result = attendanceSchema.safeParse({ studentId: 1, eventId: 2 })
    expect(result.success).toBe(true)
  })

  it('rejects non-integer studentId', () => {
    const result = attendanceSchema.safeParse({ studentId: 1.5, eventId: 2 })
    expect(result.success).toBe(false)
  })
})

describe('scheduleSessionSchema', () => {
  const now = new Date()
  const later = new Date(now.getTime() + 3600 * 1000)

  it('accepts valid session', () => {
    const result = scheduleSessionSchema.safeParse({
      title: 'Morning Worship',
      start: now,
      end: later,
      eventId: 1,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const result = scheduleSessionSchema.safeParse({
      title: '',
      start: now,
      end: later,
      eventId: 1,
    })
    expect(result.success).toBe(false)
  })
})

describe('dateRangeSchema', () => {
  it('accepts YYYY-MM-DD date', () => {
    const result = dateRangeSchema.safeParse({ date: '2026-07-04' })
    expect(result.success).toBe(true)
  })

  it('rejects non-ISO date format', () => {
    const result = dateRangeSchema.safeParse({ date: '07/04/2026' })
    expect(result.success).toBe(false)
  })

  it('accepts missing date (optional)', () => {
    const result = dateRangeSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

describe('searchParamsSchema', () => {
  it('accepts empty params', () => {
    const result = searchParamsSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('coerces page string to number', () => {
    const result = searchParamsSchema.safeParse({ page: '3' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.page).toBe(3)
  })

  it('rejects limit above 200', () => {
    const result = searchParamsSchema.safeParse({ limit: '201' })
    expect(result.success).toBe(false)
  })
})
