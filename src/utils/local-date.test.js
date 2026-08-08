import { describe, expect, it } from 'vitest'
import {
  getLocalCalendarDayDifference,
  getReviewDayState,
  isVerseDueForReview,
} from './local-date.js'

describe('local calendar-day review scheduling', () => {
  const now = new Date(2026, 7, 8, 9, 0)

  it('treats a review later on the same day as due', () => {
    const laterToday = new Date(2026, 7, 8, 23, 30)

    expect(getReviewDayState(laterToday, now)).toEqual({
      daysUntil: 0,
      due: true,
      label: 'Due',
    })
  })

  it('uses compact day labels for future days', () => {
    expect(getReviewDayState(new Date(2026, 7, 9, 1, 0), now)?.label).toBe('1d')
    expect(getReviewDayState(new Date(2026, 7, 11, 1, 0), now)?.label).toBe('3d')
  })

  it('includes overdue and unscheduled mastered verses', () => {
    expect(isVerseDueForReview({
      memorizationStatus: 'mastered',
      nextReviewDate: new Date(2026, 7, 7, 23, 59).toISOString(),
    }, now)).toBe(true)
    expect(isVerseDueForReview({
      memorizationStatus: 'mastered',
      nextReviewDate: null,
    }, now)).toBe(true)
  })

  it('excludes future and unmastered verses', () => {
    expect(isVerseDueForReview({
      memorizationStatus: 'mastered',
      nextReviewDate: new Date(2026, 7, 9, 0, 0).toISOString(),
    }, now)).toBe(false)
    expect(isVerseDueForReview({
      memorizationStatus: 'unmemorized',
      nextReviewDate: new Date(2026, 7, 7, 0, 0).toISOString(),
    }, now)).toBe(false)
  })

  it('handles month and year boundaries', () => {
    expect(getLocalCalendarDayDifference(
      new Date(2027, 0, 1, 0, 5),
      new Date(2026, 11, 31, 23, 55)
    )).toBe(1)
  })

  it('counts calendar days across daylight-saving transitions', () => {
    expect(getLocalCalendarDayDifference(
      new Date(2026, 2, 9, 0, 30),
      new Date(2026, 2, 7, 23, 30)
    )).toBe(2)
  })

  it('preserves existing handling for malformed nonempty dates', () => {
    expect(isVerseDueForReview({
      memorizationStatus: 'mastered',
      nextReviewDate: 'not-a-date',
    }, now)).toBe(false)
  })
})
