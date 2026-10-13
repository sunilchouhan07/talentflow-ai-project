
function normalizeSkill(skill) {
  return String(skill || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#./-]/g, "")
    .trim();
}

function calculateMatchScore(candidateSkills, requirements) {
  if (!Array.isArray(candidateSkills) || !requirements) {
    return 0;
  }

  const requiredSkills = String(requirements)
    .split(/[,;\n]/)
    .map(normalizeSkill)
    .filter(Boolean);

  if (requiredSkills.length === 0) {
    return 0;
  }

  const candidateSkillSet = new Set(
    candidateSkills.map(normalizeSkill).filter(Boolean)
  );

  const matchedSkills = requiredSkills.filter(skill =>
    candidateSkillSet.has(skill)
  );

  return Math.round(
    (matchedSkills.length / requiredSkills.length) * 100
  );
}

module.exports = { calculateMatchScore };
