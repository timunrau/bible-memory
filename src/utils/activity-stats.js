import { countVersesInReference } from './verse-count.js'
import { getLocalDateKey } from './local-date.js'

export function calculateCurrentStreak(verses = [], now = new Date()) {
  const reviewDates = new Set()

  verses.forEach((verse) => {
    verse.reviewHistory?.forEach((review) => {
      const dateKey = getLocalDateKey(review.date)
      if (dateKey) reviewDates.add(dateKey)
    })
  })

  if (reviewDates.size === 0) return 0

  const today = new Date(now)
  const todayKey = getLocalDateKey(today)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = getLocalDateKey(yesterday)

  if (!reviewDates.has(todayKey) && !reviewDates.has(yesterdayKey)) return 0

  let streak = 0
  const checkDate = reviewDates.has(todayKey) ? today : yesterday

  while (reviewDates.has(getLocalDateKey(checkDate))) {
    streak++
    checkDate.setDate(checkDate.getDate() - 1)
  }

  return streak
}

export function buildMasteredOverTimeData(verses = []) {
  const countByDate = {}

  verses.forEach((verse) => {
    if (verse.memorizationStatus !== 'mastered' || !verse.masteredAt) return

    const dateKey = getLocalDateKey(verse.masteredAt)
    if (!dateKey) return

    const verseCount = countVersesInReference(verse.reference)
    countByDate[dateKey] = (countByDate[dateKey] || 0) + verseCount
  })

  const dates = Object.keys(countByDate).sort()
  let cumulative = 0

  return {
    labels: dates,
    data: dates.map((date) => {
      cumulative += countByDate[date]
      return cumulative
    }),
  }
}

export function buildDailyActivityData(verses = [], now = new Date()) {
  const reviewsByDate = {}
  const masteredByDate = {}
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - 30)
  const cutoffKey = getLocalDateKey(cutoff)

  verses.forEach((verse) => {
    const verseCount = countVersesInReference(verse.reference)

    verse.reviewHistory?.forEach((review) => {
      const dateKey = getLocalDateKey(review.date)
      if (dateKey && dateKey >= cutoffKey) {
        reviewsByDate[dateKey] = (reviewsByDate[dateKey] || 0) + verseCount
      }
    })

    if (verse.memorizationStatus === 'mastered' && verse.masteredAt) {
      const dateKey = getLocalDateKey(verse.masteredAt)
      if (dateKey && dateKey >= cutoffKey) {
        masteredByDate[dateKey] = (masteredByDate[dateKey] || 0) + verseCount
      }
    }
  })

  const labels = [...new Set([
    ...Object.keys(reviewsByDate),
    ...Object.keys(masteredByDate),
  ])].sort()

  return {
    labels,
    reviews: labels.map(date => reviewsByDate[date] || 0),
    mastered: labels.map(date => masteredByDate[date] || 0),
  }
}
