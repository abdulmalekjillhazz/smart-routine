// Scores a quiz. Pure function, so the same rule can be tested in isolation.
// quiz: [{ answerIndex }]   answers: [number]
export function scoreQuiz(quiz, answers) {
  if (!Array.isArray(answers) || answers.length !== quiz.length) {
    throw new TypeError('answer count must match question count');
  }
  const results = quiz.map((q, i) => ({ correct: answers[i] === q.answerIndex, answerIndex: q.answerIndex }));
  return { score: results.filter((r) => r.correct).length, total: quiz.length, results };
}
