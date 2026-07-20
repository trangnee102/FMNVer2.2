// Hàm xử lý thuật toán Spaced Repetition (dựa trên SM-2)
const calculateSM2 = (grade, easeFactor, interval, repetitions) => {
  let newEaseFactor = easeFactor;
  let newInterval = interval;
  let newRepetitions = repetitions;

  if (grade === 1) {
    // Cấp 1: QUÊN
    newRepetitions = 0;
    newInterval = 1;
    newEaseFactor = easeFactor - 0.2;
  } else if (grade === 2) {
    // Cấp 2: KHÓ
    newRepetitions += 1;
    newInterval = interval === 0 ? 1 : interval * 1.2;
    newEaseFactor = easeFactor - 0.15;
  } else if (grade === 3) {
    // Cấp 3: TỐT
    newRepetitions += 1;
    if (newRepetitions === 1) newInterval = 1;
    else if (newRepetitions === 2) newInterval = 6;
    else newInterval = Math.round(interval * easeFactor);
  } else if (grade === 4) {
    // Cấp 4: DỄ
    newRepetitions += 1;
    if (newRepetitions === 1) newInterval = 1;
    else if (newRepetitions === 2) newInterval = 6;
    else newInterval = Math.round(interval * easeFactor * 1.3);
    newEaseFactor = easeFactor + 0.15;
  }

  // Đảm bảo Hệ số mượt không bao giờ tụt xuống quá 1.3
  newEaseFactor = Math.max(1.3, newEaseFactor);

  return {
    newEaseFactor,
    newInterval: Math.round(newInterval),
    newRepetitions,
  };
};

module.exports = { calculateSM2 };
