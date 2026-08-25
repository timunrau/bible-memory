import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  buildDailyActivityData,
  buildMasteredOverTimeData,
  calculateCurrentStreak,
} from './activity-stats.js'

describe('local-date activity statistics', () => {
  const originalTimezone = process.env.TZ

  beforeAll(() => {
    process.env.TZ = 'America/Winnipeg'
  })

  afterAll(() => {
    if (originalTimezone === undefined) {
      delete process.env.TZ
    } else {
      process.env.TZ = originalTimezone
    }
  })

  const lateEveningLocalTimestamp = '2026-08-08T04:30:00.000Z'
  const verse = {
    reference: 'Psalm 1:1-3',
    memorizationStatus: 'mastered',
    masteredAt: lateEveningLocalTimestamp,
    reviewHistory: [{ date: lateEveningLocalTimestamp }],
  }

  it('groups late-evening activity under its local day instead of its UTC day', () => {
    expect(buildDailyActivityData(
      [verse],
      new Date('2026-08-08T12:00:00.000Z')
    )).toEqual({
      labels: ['2026-08-07'],
      reviews: [3],
      mastered: [3],
    })
  })

  it('groups cumulative mastery by local day', () => {
    expect(buildMasteredOverTimeData([verse])).toEqual({
      labels: ['2026-08-07'],
      data: [3],
    })
  })

  it('calculates streaks from local review dates', () => {
    expect(calculateCurrentStreak(
      [verse],
      new Date('2026-08-08T12:00:00.000Z')
    )).toBe(1)
  })

  it('counts mastered days alongside review days in the current streak', () => {
    const verses = [
      {
        reviewHistory: [{ date: '2026-08-24T17:00:00.000Z' }],
      },
      {
        memorizationStatus: 'mastered',
        masteredAt: '2026-08-23T17:00:00.000Z',
      },
      {
        reviewHistory: [{ date: '2026-08-22T17:00:00.000Z' }],
      },
    ]

    expect(calculateCurrentStreak(
      verses,
      new Date('2026-08-24T18:00:00.000Z')
    )).toBe(3)
  })
})
