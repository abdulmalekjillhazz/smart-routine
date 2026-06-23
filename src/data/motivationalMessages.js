export const motivationalMessages = [
  "Every routine is a vote for the person you want to become.",
  "Small consistent actions build extraordinary results.",
  "Your future self is watching. Make them proud.",
  "Progress, not perfection.",
  "The secret to getting ahead is getting started.",
  "Discipline is choosing between what you want now and what you want most.",
  "Build the life you deserve, one habit at a time.",
]

export function getRandomMessage() {
  return motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]
}
