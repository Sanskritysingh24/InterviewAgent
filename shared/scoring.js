// Shared by the React client and Express server for answer-card score bands.
export const ANSWER_SCORE_THRESHOLDS = Object.freeze({
  good: 70,
  average: 40,
});

export const verdictForScore = (score) => {
  const value = Number(score) || 0;
  if (value >= ANSWER_SCORE_THRESHOLDS.good) return "good";
  if (value >= ANSWER_SCORE_THRESHOLDS.average) return "average";
  return "poor";
};
