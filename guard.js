const blockedPatterns = [
  /rm\s+-rf\s+\//,
  /mkfs/,
  /dd\s+/,
  /:\(\)\s*{\s*:\|\:&\s*};:/, // fork bomb
];

function isCommandSafe(cmd) {
  for (const pattern of blockedPatterns) {
    if (pattern.test(cmd)) {
      return false;
    }
  }
  return true;
}

module.exports = { isCommandSafe };
