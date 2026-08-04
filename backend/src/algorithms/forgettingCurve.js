const calculateSM2 = (
  grade,
  easeFactor = 2.5,
  interval = 0,
  repetitions = 0,
) => {
  let newEaseFactor = easeFactor;
  let newInterval = interval;
  let newRepetitions = repetitions;

  const MAX_INTERVAL = 3650;

  if (grade === 1) {
    newRepetitions = 0;
    newInterval = 1;
    newEaseFactor = easeFactor - 0.2;
  } else if (grade === 2) {
    newRepetitions += 1;
    newInterval = interval === 0 ? 1 : interval * 1.2;
    newEaseFactor = easeFactor - 0.15;
  } else if (grade === 3) {
    newRepetitions += 1;

    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = interval * easeFactor;
    }
  } else if (grade === 4) {
    newRepetitions += 1;

    if (newRepetitions === 1) {
      newInterval = 4;
    } else if (newRepetitions === 2) {
      newInterval = 10;
    } else {
      newInterval = interval * easeFactor * 1.3;
    }

    newEaseFactor = easeFactor + 0.15;
  }

  newEaseFactor = Math.max(1.3, newEaseFactor);

  newInterval = Math.min(Math.round(newInterval), MAX_INTERVAL);
  newInterval = Math.max(1, newInterval);

  newEaseFactor = parseFloat(newEaseFactor.toFixed(2));

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    newEaseFactor,
    newInterval,
    newRepetitions,
    nextReviewDate,
  };
};

const calculateMemoryRetention = (lastReviewDate, interval) => {
  if (!lastReviewDate || interval <= 0) return 0;

  const now = new Date();
  const lastReview = new Date(lastReviewDate);

  const daysElapsed = Math.max(
    0,
    (now - lastReview) / (1000 * 60 * 60 * 24),
  );

  if (daysElapsed === 0) return 100;

  const retention = Math.exp(-daysElapsed / interval) * 100;

  return parseFloat(retention.toFixed(2));
};

module.exports = {
  calculateSM2,
  calculateMemoryRetention,
};