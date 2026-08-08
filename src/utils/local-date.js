const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

function toValidDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getLocalDateKey(value) {
  const date = toValidDate(value)
  if (!date) return null

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function getLocalCalendarDayDifference(value, relativeTo = new Date()) {
  const date = toValidDate(value)
  const reference = toValidDate(relativeTo)
  if (!date || !reference) return null

  const dateDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const referenceDay = Date.UTC(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate()
  )

  return Math.round((dateDay - referenceDay) / MILLISECONDS_PER_DAY)
}

export function getReviewDayState(nextReviewDate, now = new Date()) {
  if (!nextReviewDate) {
    return { daysUntil: 0, due: true, label: 'Due' }
  }

  const daysUntil = getLocalCalendarDayDifference(nextReviewDate, now)
  if (daysUntil === null) return null

  if (daysUntil <= 0) {
    return { daysUntil, due: true, label: 'Due' }
  }

  return { daysUntil, due: false, label: `${daysUntil}d` }
}

export function isVerseDueForReview(verse, now = new Date()) {
  if (verse?.memorizationStatus !== 'mastered') return false
  if (!verse.nextReviewDate) return true

  return getReviewDayState(verse.nextReviewDate, now)?.due === true
}
