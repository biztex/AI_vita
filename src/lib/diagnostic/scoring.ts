// MyAI Diagnostic Scoring Engine
// Computes MBTI, DISC, Enneagram (Top 3), Cognitive Tendency from 21 answers

export type DiagnosticAnswers = Record<string, string> // { "1": "A", "2": "B", ... "21": "3" }

export type DiagnosticResult = {
  mbtiType: string
  mbtiLabel: string
  discType: string
  discLabel: string
  enneagramTop3: number[]
  cognitiveTrend: string
  summary: string
}

// ──────────────────────────────────────
// MBTI Descriptions
// ──────────────────────────────────────
const MBTI_DESCRIPTIONS: Record<string, string> = {
  ISTJ: "責任感が強く、秩序と計画を重視する実務家",
  ISFJ: "思いやり深く、安定を大切にする守護者",
  INFJ: "理想を追い求め、深い洞察力を持つ提唱者",
  INTJ: "戦略的思考で高い目標を目指す建築家",
  ISTP: "冷静な観察力と実践力を備えた巨匠",
  ISFP: "感性豊かで自由を愛する冒険家",
  INFP: "内面の価値観に忠実な理想主義者",
  INTP: "論理的分析と知的探求を愛する論理学者",
  ESTP: "行動力と適応力に優れた起業家",
  ESFP: "明るく社交的で楽しさを共有するエンターテイナー",
  ENFP: "情熱的で可能性を追求する運動家",
  ENTP: "知的好奇心旺盛で議論を楽しむ討論者",
  ESTJ: "組織力と決断力に長けたリーダー",
  ESFJ: "社交的で他者を大切にする領事",
  ENFJ: "カリスマ性があり人々を導く主人公",
  ENTJ: "大胆な決断力で目標を達成する指揮官",
}

// ──────────────────────────────────────
// DISC Descriptions
// ──────────────────────────────────────
const DISC_LABELS: Record<string, string> = {
  D: "主導タイプ",
  I: "感化タイプ",
  S: "安定タイプ",
  C: "慎重タイプ",
}

const DISC_DESCRIPTIONS: Record<string, string> = {
  D: "決断力と行動力のリーダー。目標達成に向けて突き進む",
  I: "社交的で周囲を巻き込むムードメーカー。楽観的に前進",
  S: "安定と調和を重んじるサポーター。堅実で信頼される",
  C: "正確さと品質にこだわる分析家。論理的で慎重に進む",
}

// ──────────────────────────────────────
// Enneagram Descriptions
// ──────────────────────────────────────
export const ENNEAGRAM_TYPES: Record<number, { name: string; trait: string }> = {
  1: { name: "改革者", trait: "正義感と完璧を追求する" },
  2: { name: "援助者", trait: "思いやりで人を支える" },
  3: { name: "達成者", trait: "成功と効率を追い求める" },
  4: { name: "個性派", trait: "自己表現と独自性を大切にする" },
  5: { name: "観察者", trait: "知識と深い理解を求める" },
  6: { name: "忠実家", trait: "安心と信頼の絆を築く" },
  7: { name: "楽天家", trait: "自由と楽しさを追い求める" },
  8: { name: "挑戦者", trait: "力強く自立して道を切り開く" },
  9: { name: "調停者", trait: "平和と調和を守る" },
}

// ──────────────────────────────────────
// Cognitive Tendency
// ──────────────────────────────────────
const COGNITIVE_TRENDS: Record<string, string> = {
  NT: "分析型",
  NF: "直感型",
  ST: "論理型",
  SF: "感覚型",
}

// ──────────────────────────────────────
// Scoring Functions
// ──────────────────────────────────────

function scoreMBTI(answers: DiagnosticAnswers): { type: string; label: string; axes: { ei: string; ns: string; tf: string; pj: string } } {
  // E/I axis: Q1 (A=E, B=I)
  const eCount = answers["1"] === "A" ? 1 : 0
  const iCount = answers["1"] === "B" ? 1 : 0
  const ei = eCount >= iCount ? "E" : "I"

  // N/S axis: Q2 (A=N, B=S), Q5 (A=N, B=S)
  let nCount = 0
  let sCount = 0
  if (answers["2"] === "A") nCount++; else sCount++
  if (answers["5"] === "A") nCount++; else sCount++
  const ns = nCount >= sCount ? "N" : "S"

  // T/F axis: Q3 (A=T, B=F), Q6 (A=T, B=F)
  let tCount = 0
  let fCount = 0
  if (answers["3"] === "A") tCount++; else fCount++
  if (answers["6"] === "A") tCount++; else fCount++
  const tf = tCount >= fCount ? "T" : "F"

  // P/J axis: Q4 (A=P, B=J)
  const pj = answers["4"] === "A" ? "P" : "J"

  const type = `${ei}${ns}${tf}${pj}`
  const label = MBTI_DESCRIPTIONS[type] || "独自のパーソナリティを持つタイプ"

  return { type, label, axes: { ei, ns, tf, pj } }
}

function scoreDISC(answers: DiagnosticAnswers): { type: string; label: string } {
  // Q7-Q12: A=D, B=I, C=S, D=C
  const discMap: Record<string, string> = { A: "D", B: "I", C: "S", D: "C" }
  const counts: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 }

  for (let q = 7; q <= 12; q++) {
    const answer = answers[String(q)]
    if (answer && discMap[answer]) {
      counts[discMap[answer]]++
    }
  }

  // Find the type with highest count
  let maxType = "C"
  let maxCount = 0
  for (const [type, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count
      maxType = type
    }
  }

  return {
    type: maxType,
    label: DISC_LABELS[maxType] || "慎重タイプ",
  }
}

function scoreEnneagram(answers: DiagnosticAnswers): number[] {
  // Q13-Q21: answer id maps directly to enneagram type (1-9)
  const counts: Record<number, number> = {}
  for (let i = 1; i <= 9; i++) counts[i] = 0

  for (let q = 13; q <= 21; q++) {
    const answer = answers[String(q)]
    const typeNum = parseInt(answer, 10)
    if (typeNum >= 1 && typeNum <= 9) {
      counts[typeNum]++
    }
  }

  // Sort by count descending, then by type ascending for tie-breaking
  const sorted = Object.entries(counts)
    .sort(([aType, aCount], [bType, bCount]) => {
      if (bCount !== aCount) return bCount - aCount
      return parseInt(aType) - parseInt(bType)
    })
    .map(([type]) => parseInt(type))

  return sorted.slice(0, 3)
}

function getCognitiveTrend(ns: string, tf: string): string {
  const key = `${ns}${tf}`
  return COGNITIVE_TRENDS[key] || "バランス型"
}

function generateSummary(
  mbtiType: string,
  discType: string,
  enneagramTop3: number[],
  cognitiveTrend: string
): string {
  const enneaMain = ENNEAGRAM_TYPES[enneagramTop3[0]]
  const discDesc = DISC_DESCRIPTIONS[discType] || ""
  const mbtiDesc = MBTI_DESCRIPTIONS[mbtiType] || ""

  // Generate a natural summary combining all results
  const fragments: string[] = []

  if (enneaMain) {
    fragments.push(`${enneaMain.trait}${enneaMain.name}`)
  }

  // Add MBTI-derived trait
  if (mbtiType.includes("T")) {
    fragments.push("論理的で一貫性のある判断力を持つ")
  } else {
    fragments.push("共感力が高く人の気持ちに寄り添える")
  }

  if (mbtiType.includes("J")) {
    fragments.push("計画的に物事を進めるタイプ")
  } else {
    fragments.push("柔軟に状況に適応するタイプ")
  }

  return fragments.join("。") + "。"
}

// ──────────────────────────────────────
// Main Scoring Function
// ──────────────────────────────────────
export function computeDiagnosticResult(answers: DiagnosticAnswers): DiagnosticResult {
  const mbti = scoreMBTI(answers)
  const disc = scoreDISC(answers)
  const enneagramTop3 = scoreEnneagram(answers)
  const cognitiveTrend = getCognitiveTrend(mbti.axes.ns, mbti.axes.tf)
  const summary = generateSummary(mbti.type, disc.type, enneagramTop3, cognitiveTrend)

  return {
    mbtiType: mbti.type,
    mbtiLabel: mbti.label,
    discType: disc.type,
    discLabel: disc.label,
    enneagramTop3,
    cognitiveTrend,
    summary,
  }
}

export { MBTI_DESCRIPTIONS, DISC_LABELS, DISC_DESCRIPTIONS }
