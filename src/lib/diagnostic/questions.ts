// MyAI Personal Diagnostic - 21 Questions
// Covers MBTI (Q1-Q6), DISC (Q7-Q12), Enneagram (Q13-Q21)

export type QuestionCategory = "MBTI" | "DISC" | "Enneagram"

export type QuestionOption = {
  id: string
  label: string
  icon?: string // Lucide icon name for accessibility
}

export type DiagnosticQuestion = {
  id: number
  category: QuestionCategory
  question: string
  questionIcon?: string // Lucide icon name
  options: QuestionOption[]
}

export const CATEGORY_INFO: Record<QuestionCategory, { title: string; description: string; icon: string; color: string; bgColor: string; range: string }> = {
  MBTI: {
    title: "MBTI（性格4軸）",
    description: "あなたの思考・行動パターンを4つの軸で分析します。外向/内向、直感/感覚、思考/感情、知覚/判断の組み合わせから16タイプを判定。",
    icon: "🧠",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/30",
    range: "Q1〜Q6",
  },
  DISC: {
    title: "DISCタイプ",
    description: "チームでの行動スタイルを4つのタイプで分析します。主導型(D)、感化型(I)、安定型(S)、慎重型(C)のどれが強いかを判定。",
    icon: "🎯",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/30",
    range: "Q7〜Q12",
  },
  Enneagram: {
    title: "エニアグラム",
    description: "あなたの内面的な動機・恐れ・理想像から9つの性格タイプを分析。自己理解を深め、成長の方向性を見つけます。",
    icon: "✨",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/30",
    range: "Q13〜Q21",
  },
}

export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  // ── MBTI Questions (Q1-Q6) ──
  {
    id: 1,
    category: "MBTI",
    question: "どちらの方があなたを元気にしますか？",
    questionIcon: "Zap",
    options: [
      { id: "A", label: "人と過ごす時間", icon: "Users" },
      { id: "B", label: "一人の静かな時間", icon: "User" },
    ],
  },
  {
    id: 2,
    category: "MBTI",
    question: "初めての場所に行くとき、あなたの考えは？",
    questionIcon: "MapPin",
    options: [
      { id: "A", label: "なんとかなるでしょ！", icon: "Sparkles" },
      { id: "B", label: "事前に情報をしっかり集める", icon: "Search" },
    ],
  },
  {
    id: 3,
    category: "MBTI",
    question: "他人の相談を受けるとき、あなたの対応は？",
    questionIcon: "MessageCircle",
    options: [
      { id: "A", label: "問題の原因を論理的に考える", icon: "Brain" },
      { id: "B", label: "相手の気持ちを優先する", icon: "Heart" },
    ],
  },
  {
    id: 4,
    category: "MBTI",
    question: "旅行に行くときのスタイルは？",
    questionIcon: "Plane",
    options: [
      { id: "A", label: "行き当たりばったりで自由に", icon: "Compass" },
      { id: "B", label: "しっかり計画してから", icon: "CalendarCheck" },
    ],
  },
  {
    id: 5,
    category: "MBTI",
    question: "会議の最中、あなたは？",
    questionIcon: "Presentation",
    options: [
      { id: "A", label: "アイデアをどんどん出す", icon: "Lightbulb" },
      { id: "B", label: "具体的な話に集中する", icon: "ListChecks" },
    ],
  },
  {
    id: 6,
    category: "MBTI",
    question: "物事を決めるときの傾向は？",
    questionIcon: "Scale",
    options: [
      { id: "A", label: "思考で割り切る", icon: "Calculator" },
      { id: "B", label: "直感的にしっくりくるかで決める", icon: "Heart" },
    ],
  },

  // ── DISC Questions (Q7-Q12) ──
  {
    id: 7,
    category: "DISC",
    question: "チームでのあなたの役割は？",
    questionIcon: "UsersRound",
    options: [
      { id: "A", label: "方向性を決める", icon: "Flag" },
      { id: "B", label: "雰囲気を盛り上げる", icon: "PartyPopper" },
      { id: "C", label: "調整役", icon: "GitMerge" },
      { id: "D", label: "裏付けで支える", icon: "BookOpen" },
    ],
  },
  {
    id: 8,
    category: "DISC",
    question: "緊急事態が起きたら？",
    questionIcon: "AlertTriangle",
    options: [
      { id: "A", label: "即決して動く", icon: "Zap" },
      { id: "B", label: "みんなを安心させる", icon: "ShieldCheck" },
      { id: "C", label: "まず落ち着かせる", icon: "Wind" },
      { id: "D", label: "原因分析から始める", icon: "Microscope" },
    ],
  },
  {
    id: 9,
    category: "DISC",
    question: "誰かと対立したときの対応は？",
    questionIcon: "Swords",
    options: [
      { id: "A", label: "押し切る", icon: "MoveRight" },
      { id: "B", label: "笑ってやり過ごす", icon: "Smile" },
      { id: "C", label: "譲って収める", icon: "Handshake" },
      { id: "D", label: "事実で話す", icon: "FileText" },
    ],
  },
  {
    id: 10,
    category: "DISC",
    question: "嬉しい評価はどれ？",
    questionIcon: "Award",
    options: [
      { id: "A", label: "決断力がある", icon: "Target" },
      { id: "B", label: "明るく楽しい", icon: "Sun" },
      { id: "C", label: "やさしくて穏やか", icon: "Flower2" },
      { id: "D", label: "正確で頼れる", icon: "CheckCircle2" },
    ],
  },
  {
    id: 11,
    category: "DISC",
    question: "仕事の進め方は？",
    questionIcon: "Briefcase",
    options: [
      { id: "A", label: "スピード重視", icon: "Gauge" },
      { id: "B", label: "柔軟さ重視", icon: "Activity" },
      { id: "C", label: "安定重視", icon: "Anchor" },
      { id: "D", label: "品質重視", icon: "Gem" },
    ],
  },
  {
    id: 12,
    category: "DISC",
    question: "上司に望むのは？",
    questionIcon: "UserCog",
    options: [
      { id: "A", label: "明快な指示", icon: "ListOrdered" },
      { id: "B", label: "気さくさと信頼", icon: "HandHeart" },
      { id: "C", label: "安心感", icon: "Home" },
      { id: "D", label: "論理的な説明", icon: "ScrollText" },
    ],
  },

  // ── Enneagram Questions (Q13-Q21) ──
  {
    id: 13,
    category: "Enneagram",
    question: "最も避けたいことは？",
    questionIcon: "ShieldAlert",
    options: [
      { id: "1", label: "間違える" },
      { id: "2", label: "見捨てられる" },
      { id: "3", label: "無能と思われる" },
      { id: "4", label: "自分を否定される" },
      { id: "5", label: "無知でいる" },
      { id: "6", label: "裏切られる" },
      { id: "7", label: "退屈・束縛" },
      { id: "8", label: "支配される" },
      { id: "9", label: "対立" },
    ],
  },
  {
    id: 14,
    category: "Enneagram",
    question: "理想の自分は？",
    questionIcon: "Star",
    options: [
      { id: "1", label: "正義感がある" },
      { id: "2", label: "人の役に立つ" },
      { id: "3", label: "成果を出す" },
      { id: "4", label: "自分らしく生きる" },
      { id: "5", label: "賢くありたい" },
      { id: "6", label: "誠実でいたい" },
      { id: "7", label: "楽しく自由に" },
      { id: "8", label: "強く信念を持つ" },
      { id: "9", label: "平和と調和を守る" },
    ],
  },
  {
    id: 15,
    category: "Enneagram",
    question: "他人に言われて嬉しいのは？",
    questionIcon: "MessageCircle",
    options: [
      { id: "1", label: "「あなたは正しい」" },
      { id: "2", label: "「あなたのおかげで助かった」" },
      { id: "3", label: "「すごい成果だね」" },
      { id: "4", label: "「あなたは特別だ」" },
      { id: "5", label: "「あなたは本当に詳しい」" },
      { id: "6", label: "「あなたは信頼できる」" },
      { id: "7", label: "「あなたといると楽しい」" },
      { id: "8", label: "「あなたは頼りになる」" },
      { id: "9", label: "「あなたがいると安心する」" },
    ],
  },
  {
    id: 16,
    category: "Enneagram",
    question: "心の底で信じている価値観は？",
    questionIcon: "Heart",
    options: [
      { id: "1", label: "正しくあるべき" },
      { id: "2", label: "人を助けるべき" },
      { id: "3", label: "成功を目指すべき" },
      { id: "4", label: "自分らしくあるべき" },
      { id: "5", label: "知識を深めるべき" },
      { id: "6", label: "約束を守るべき" },
      { id: "7", label: "人生を楽しむべき" },
      { id: "8", label: "自分の力で切り開くべき" },
      { id: "9", label: "争いを避けるべき" },
    ],
  },
  {
    id: 17,
    category: "Enneagram",
    question: "成長したと実感するときは？",
    questionIcon: "TrendingUp",
    options: [
      { id: "1", label: "自分の基準を緩められたとき" },
      { id: "2", label: "見返りなく人に尽くせたとき" },
      { id: "3", label: "結果だけでなく過程を大事にできたとき" },
      { id: "4", label: "感情に振り回されず冷静でいられたとき" },
      { id: "5", label: "人と深く関われたとき" },
      { id: "6", label: "不安の中でも行動できたとき" },
      { id: "7", label: "一つのことに集中できたとき" },
      { id: "8", label: "弱さを見せられたとき" },
      { id: "9", label: "自分の意見をはっきり言えたとき" },
    ],
  },
  {
    id: 18,
    category: "Enneagram",
    question: "あなたが疲れるときは？",
    questionIcon: "BatteryLow",
    options: [
      { id: "1", label: "ルールが守られないとき" },
      { id: "2", label: "人に尽くしすぎたとき" },
      { id: "3", label: "結果が出せないとき" },
      { id: "4", label: "自分を理解されないとき" },
      { id: "5", label: "人に関わりすぎたとき" },
      { id: "6", label: "先が見えないとき" },
      { id: "7", label: "選択肢がないとき" },
      { id: "8", label: "コントロールを失ったとき" },
      { id: "9", label: "対立に巻き込まれたとき" },
    ],
  },
  {
    id: 19,
    category: "Enneagram",
    question: "他者との関係で気をつけていることは？",
    questionIcon: "Users",
    options: [
      { id: "1", label: "批判的になりすぎないこと" },
      { id: "2", label: "相手に依存しすぎないこと" },
      { id: "3", label: "競争心を出しすぎないこと" },
      { id: "4", label: "感情的になりすぎないこと" },
      { id: "5", label: "距離を取りすぎないこと" },
      { id: "6", label: "疑い深くなりすぎないこと" },
      { id: "7", label: "楽しさだけに逃げないこと" },
      { id: "8", label: "威圧的にならないこと" },
      { id: "9", label: "自分を後回しにしすぎないこと" },
    ],
  },
  {
    id: 20,
    category: "Enneagram",
    question: "自分を変えたいと思う瞬間は？",
    questionIcon: "RefreshCw",
    options: [
      { id: "1", label: "完璧を求めすぎて疲れたとき" },
      { id: "2", label: "人に尽くしすぎて自分を見失ったとき" },
      { id: "3", label: "成功にこだわりすぎて空虚を感じたとき" },
      { id: "4", label: "孤独を感じたとき" },
      { id: "5", label: "考えすぎて動けなかったとき" },
      { id: "6", label: "心配しすぎて身動きが取れなかったとき" },
      { id: "7", label: "楽しさを追い求めて大事なものを見失ったとき" },
      { id: "8", label: "強さにこだわりすぎて人を傷つけたとき" },
      { id: "9", label: "何も主張できず後悔したとき" },
    ],
  },
  {
    id: 21,
    category: "Enneagram",
    question: "人生で一番大事にしているものは？",
    questionIcon: "Crown",
    options: [
      { id: "1", label: "意志と正義" },
      { id: "2", label: "つながりと愛" },
      { id: "3", label: "達成と成功" },
      { id: "4", label: "自己表現と美" },
      { id: "5", label: "知識と理解" },
      { id: "6", label: "安心と信頼" },
      { id: "7", label: "自由と喜び" },
      { id: "8", label: "力と自立" },
      { id: "9", label: "調和と平和" },
    ],
  },
]
