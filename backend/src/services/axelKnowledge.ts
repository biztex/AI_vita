/**
 * AXEL Knowledge Layer
 * ─────────────────────────────────────────────────────────────────────
 * This module implements the value chain the client described:
 *
 *   遺伝子データ
 *      ↓ humanizeConstitution()    — body-type interpretation
 *   体質傾向（人が分かる言葉）
 *      ↓ insightsForHealthGoal()   — registered-dietitian style insight tables
 *   目標 × 体質 に対する助言の素材
 *      ↓ buildJudgmentPerspective() — executive-decision lens
 *   性格 × 状況に応じた判断視点
 *      ↓ injected into the AI prompt
 *   AIコンシェルジュの応答
 *
 * The AI prompt no longer sees raw scores or category names — those are
 * pre-processed here into plain-language phrases the AI can use directly.
 *
 * Tables are intentionally text-template based (not ML) so a registered
 * dietitian or human reviewer can audit and tune them.
 */

// ─────────────────────────────────────────────────────────────────────
// 1. Gene data → Body-type (体質傾向) interpretation
// ─────────────────────────────────────────────────────────────────────

type GeneTotalScore = number | null | undefined;

interface GeneConstitutionEntry {
  totalScore?: GeneTotalScore;
  subItems?: { label: string; score?: GeneTotalScore }[];
}

interface GeneNutritionEntry {
  totalScore?: GeneTotalScore;
  surveyScore?: GeneTotalScore;
  geneScore?: GeneTotalScore;
}

interface GriiceGeneData {
  constitution?: Record<string, GeneConstitutionEntry>;
  nutritionStrategy?: Record<string, GeneNutritionEntry>;
  muscleFiber?: { score?: number; label?: string; position?: string };
}

/** Categorise a 1–5 score into a tri-state qualitative band. */
function band(s: GeneTotalScore): 'low' | 'mid' | 'high' {
  if (s == null || isNaN(Number(s))) return 'mid';
  const n = Number(s);
  if (n <= 2) return 'low';
  if (n >= 4) return 'high';
  return 'mid';
}

/** Pull a constitution category's qualitative band, defaulting to mid. */
function cband(d: GriiceGeneData | null | undefined, label: string): 'low' | 'mid' | 'high' {
  return band(d?.constitution?.[label]?.totalScore);
}

/** Pull a nutrition strategy total band. */
function nband(d: GriiceGeneData | null | undefined, label: string): 'low' | 'mid' | 'high' {
  return band(d?.nutritionStrategy?.[label]?.totalScore);
}

/**
 * humanizeConstitution()
 *   Convert raw Griice gene data into plain-language sentences AXEL can
 *   weave into responses without ever uttering "score=1" or category names.
 *
 *   Returns 0–6 short sentences. Returns empty array if no data.
 */
export function humanizeConstitution(geneRaw: GriiceGeneData | null | undefined): string[] {
  if (!geneRaw || (!geneRaw.constitution && !geneRaw.nutritionStrategy)) return [];

  const observations: string[] = [];

  // — 血糖・糖質との付き合い方 —
  const sugar = cband(geneRaw, '血糖');
  const carb = nband(geneRaw, '炭水化物');
  if (sugar === 'low' || carb === 'low') {
    observations.push('糖質の波に影響を受けやすく、食事の順序や量で体調や集中が左右されやすいタイプです');
  } else if (sugar === 'high' && carb === 'high') {
    observations.push('血糖の安定はかなり保たれやすいタイプです');
  }

  // — 筋線維 / 瞬発・持久パフォーマンス —
  const fiberScore = geneRaw.muscleFiber?.score;
  const sprint = cband(geneRaw, '瞬発パフォーマンス');
  const endurance = cband(geneRaw, '持久パフォーマンス');
  if (fiberScore != null && fiberScore <= 2) {
    observations.push('お身体は瞬発系に向きやすく、短時間で力を出す動きが得意なタイプです');
  } else if (fiberScore != null && fiberScore >= 4) {
    observations.push('お身体は持久系に向きやすく、コツコツ続ける動きで力を発揮しやすいタイプです');
  } else if (sprint === 'low' && endurance === 'high') {
    observations.push('瞬発よりは持久のほうが向くタイプで、コツコツ続ける運動が体に馴染みやすいです');
  } else if (sprint === 'high' && endurance === 'low') {
    observations.push('瞬発に強さがあり、短時間で集中する運動が向くタイプです');
  }

  // — ストレス・睡眠 —
  const sleepStress = cband(geneRaw, 'ストレス・睡眠');
  if (sleepStress === 'low') {
    observations.push('睡眠の深さやストレスの抜け方は、生活リズムの整え方で大きく差が出るタイプです');
  }

  // — 体脂肪・過食傾向 —
  const fat = cband(geneRaw, '体脂肪');
  if (fat === 'low') {
    observations.push('体脂肪との付き合い方は、食事内容よりも食べ方や時間帯の影響を受けやすいタイプです');
  }

  // — 美肌・コラーゲン —
  const skin = cband(geneRaw, 'シミ・そばかす／頭髪');
  if (skin === 'low') {
    observations.push('紫外線や酸化ストレスの影響を受けやすいので、日焼け対策と抗酸化食材が効きやすいタイプです');
  }

  // — 血管・血圧 —
  const vascular = cband(geneRaw, '血管・血圧');
  if (vascular === 'low') {
    observations.push('血管・血圧の調整は塩分や水分のリズムが効きやすいタイプです');
  }

  // — コレステロール・脂質 —
  const lipid = nband(geneRaw, '脂質');
  if (lipid === 'low') {
    observations.push('脂質の質と量に影響を受けやすく、良質な油への切り替えで違いが出やすいタイプです');
  }

  // — タンパク質 —
  const protein = nband(geneRaw, 'たんぱく質');
  if (protein === 'low') {
    observations.push('たんぱく質の摂り方で体の回復やコンディションが変わりやすいタイプです');
  }

  // — ビタミン・ミネラル(鉄・骨) —
  const minerals = nband(geneRaw, 'ミネラル（鉄・骨）');
  if (minerals === 'low') {
    observations.push('鉄やカルシウムの不足が冷えやだるさに繋がりやすいので、緑黄色野菜と魚介がよく合うタイプです');
  }

  return observations;
}

// ─────────────────────────────────────────────────────────────────────
// 2. Goal × constitution → registered-dietitian insight
// ─────────────────────────────────────────────────────────────────────

/**
 * Concrete user goals the AI may encounter. We map common phrasings to
 * canonical keys so the insight table can be reused regardless of how
 * the user phrased it.
 */
export type HealthGoalKey =
  | 'weight_loss'
  | 'sleep'
  | 'fatigue'
  | 'focus'
  | 'skin'
  | 'aging'
  | 'sports_distance'
  | 'sports_endurance'
  | 'muscle_gain';

/** Detect a goal from free-form user text. Returns null if none match. */
export function detectHealthGoal(text: string): HealthGoalKey | null {
  const s = text.toLowerCase();
  if (/痩|やせ|ダイエット|体重|減量/.test(text)) return 'weight_loss';
  if (/眠|睡眠|寝つき|入眠|不眠/.test(text)) return 'sleep';
  if (/疲|だる|回復|消耗/.test(text)) return 'fatigue';
  if (/集中|注意|頭がぼ|頭が回/.test(text)) return 'focus';
  if (/シミ|しみ|そばかす|肌荒れ|肌の/.test(text)) return 'skin';
  if (/若々し|アンチエイジ|老化|シワ|しわ/.test(text)) return 'aging';
  if (/飛距離|ゴルフ|スプリント|瞬発|スイング/.test(text)) return 'sports_distance';
  if (/持久|マラソン|長距離|ジョギング/.test(text)) return 'sports_endurance';
  if (/筋肉|筋力|筋トレ|たくましく/.test(text)) return 'muscle_gain';
  if (s.includes('weight') || s.includes('lose')) return 'weight_loss';
  if (s.includes('sleep')) return 'sleep';
  return null;
}

/**
 * The registered-dietitian style insight table.
 * Each entry returns 3–5 small concrete actions tuned to the user's body type.
 * The AI then translates these into natural conversation.
 *
 * Knowledge sources are general nutritional science + common dietitian practice.
 * In production this would ideally be reviewed by a registered dietitian.
 */
export function insightsForHealthGoal(
  goal: HealthGoalKey,
  geneRaw: GriiceGeneData | null | undefined,
): string[] {
  switch (goal) {
    case 'weight_loss': {
      const sugar = cband(geneRaw, '血糖');
      const fat = cband(geneRaw, '体脂肪');
      const carb = nband(geneRaw, '炭水化物');
      const tips: string[] = [];
      if (sugar === 'low' || carb === 'low') {
        tips.push('夕食のお米やパンは普段の半分にして、その分おかずをゆっくり味わうのが効きます');
        tips.push('食事は野菜・たんぱく質・主食の順で口に運ぶと、血糖の波が穏やかになります');
        tips.push('白米を雑穀米やもち麦入りに変えるだけで、満腹感の持続が変わってきます');
      }
      if (fat === 'low') {
        tips.push('夜21時以降の食事は、量より内容の影響が大きいので、揚げ物や甘いものを朝〜昼に回すと変化が出やすいです');
        tips.push('体重よりも体脂肪率と腰回りで進捗を見ると、本当の変化が見えやすいです');
      }
      tips.push('食事の前に水を1杯飲んでから食べ始めると、過食を抑えやすくなります');
      tips.push('運動より食事のタイミングが効きやすいタイプなので、夕食を1時間早めるだけでも違いが出ます');
      tips.push('週末の体重を平均化して見ると、一日ごとの増減に振り回されずに済みます');
      return tips;
    }

    case 'sleep': {
      const sleepStress = cband(geneRaw, 'ストレス・睡眠');
      const tips: string[] = [];
      if (sleepStress === 'low') {
        tips.push('就寝1時間前のスマホを離す、寝る前に温かい飲み物を一杯、これだけで睡眠の深さが変わってきます');
        tips.push('朝起きたらすぐにカーテンを開け、5分でも光を浴びるとセロトニンが整います');
        tips.push('夕方以降のカフェイン（コーヒー・緑茶・チョコレート）は寝つきに想像以上に響くので、15時以降は控えめに');
      }
      tips.push('就寝2時間前までに夕食を済ませると、寝つきが楽になります');
      tips.push('室温18〜22度、湿度50〜60%が深い睡眠に最も入りやすい環境です');
      tips.push('寝る前のアルコールは入眠を助けますが、夜中の覚醒を増やしますので、量は控えめに');
      return tips;
    }

    case 'fatigue': {
      const protein = nband(geneRaw, 'たんぱく質');
      const iron = nband(geneRaw, 'ミネラル（鉄・骨）');
      const sugar = cband(geneRaw, '血糖');
      const tips: string[] = [];
      if (protein === 'low') {
        tips.push('朝食に卵かヨーグルトを必ずひと品加えると、午後の消耗が違ってきます');
        tips.push('間食を甘いものからチーズ・ナッツ・ゆで卵に切り替えると、夕方の疲労が減ります');
      }
      if (iron === 'low') {
        tips.push('週に2回は赤身の魚や肉、緑黄色野菜を意識すると、だるさが軽くなります');
        tips.push('鉄分はビタミンCと一緒に摂ると吸収が上がるので、ほうれん草とレモンの組み合わせなどが効きます');
      }
      if (sugar === 'low') {
        tips.push('昼食の炭水化物の量と種類で、午後の眠気が大きく変わるタイプなので、白米より雑穀米が向いています');
      }
      tips.push('15時前後にナッツや小魚を一口つまむと、夕方までの集中が保てます');
      tips.push('週に1日は何もしない日を作ると、心身の回復が進みます');
      tips.push('水分不足は疲労感に直結するので、1日1.5〜2リットルを目安にこまめに摂ってください');
      return tips;
    }

    case 'focus': {
      const sugar = cband(geneRaw, '血糖');
      const sleepStress = cband(geneRaw, 'ストレス・睡眠');
      const tips: string[] = [];
      if (sugar === 'low') {
        tips.push('昼食を炭水化物中心にすると午後の集中が落ちやすいので、たんぱく質を主軸に組み立てるのが効きます');
        tips.push('朝食を抜くと血糖の乱高下が起きやすいので、簡単でも一口食べる方が脳が安定します');
      }
      if (sleepStress === 'low') {
        tips.push('集中力の質は睡眠の質に直結しているので、まずは睡眠時間を15分でも増やしてみてください');
      }
      tips.push('午後の判断が鈍る前に、カフェインより5分の散歩の方が後を引かずに整います');
      tips.push('25分集中して5分休む、というポモドーロ式が前頭葉の疲労を防ぎやすいです');
      tips.push('深い呼吸を10回するだけで、副交感神経が整い、集中が再起動します');
      return tips;
    }

    case 'skin': {
      const skin = cband(geneRaw, 'シミ・そばかす／頭髪');
      const lipid = nband(geneRaw, '脂質');
      const tips: string[] = [];
      if (skin === 'low') {
        tips.push('紫外線対策を季節問わず徹底、日焼け止めを朝のルーチンに入れるだけで違いが出ます');
        tips.push('ビタミンCを含む果物（キウイ、いちご、柑橘）を毎朝1つ取り入れてみてください');
        tips.push('シミができてからより、できる前の予防が大事なタイプなので、UV対策を最優先で');
      }
      if (lipid === 'low') {
        tips.push('オメガ3を含む魚（サーモン、サバ、イワシ）を週2回、肌のハリに直結します');
      }
      tips.push('夜10時から深夜2時の間に深い睡眠を取れると、肌の回復が進みやすいです');
      tips.push('水分を1日1.5リットル、肌の細胞は水分量で見え方が大きく変わります');
      tips.push('糖質の摂りすぎは肌の糖化（くすみ・たるみ）に直結するので、甘いものは控えめに');
      return tips;
    }

    case 'aging': {
      const lipid = nband(geneRaw, '脂質');
      const skin = cband(geneRaw, 'シミ・そばかす／頭髪');
      const tips: string[] = [];
      if (lipid === 'low') {
        tips.push('調理油をオリーブオイルや亜麻仁油に替えると、酸化のスピードが穏やかになります');
        tips.push('良質な脂質（アボカド、ナッツ、青魚）を意識すると、細胞膜から若さを保ちやすくなります');
      }
      if (skin === 'low') {
        tips.push('紫外線は最大の老化要因なので、季節問わず日焼け止めを朝のルーチンに');
      }
      tips.push('抗酸化の高い色の濃い野菜（ブロッコリー、ほうれん草、トマト）を毎日両手1杯');
      tips.push('運動は週3回30分の有酸素より、毎日10分のスクワットの方が若さを保ちやすいです');
      tips.push('良質な睡眠は最強のアンチエイジング、まず7時間を目指してください');
      tips.push('ストレスは老化を加速するので、瞑想や深呼吸を1日5分の習慣に');
      return tips;
    }

    case 'sports_distance': {
      const fiberScore = geneRaw?.muscleFiber?.score;
      const sprint = cband(geneRaw, '瞬発パフォーマンス');
      const tips: string[] = [];
      if (fiberScore != null && fiberScore <= 2) {
        tips.push('瞬発系の素質を活かす、短時間の体幹トレと素振りの反復が距離に直結しやすいです');
        tips.push('プライオメトリクス（ジャンプ系のトレーニング）が向いているタイプです');
      }
      if (sprint === 'high') {
        tips.push('短い時間で集中して力を出すのが向いているので、1セット5〜10分の高強度トレーニングが効きます');
      }
      tips.push('運動後30分以内に、卵か豆乳でたんぱく質を補給するとパフォーマンスが伸びます');
      tips.push('柔軟性を保つストレッチを毎晩5分、これだけで動きの伸びが変わってきます');
      tips.push('週1回は完全休養日を作ると、超回復で力が上がります');
      tips.push('体重を1kg減らすだけで飛距離は変わるので、適正体重の維持も大切です');
      return tips;
    }

    case 'sports_endurance': {
      const endurance = cband(geneRaw, '持久パフォーマンス');
      const tips: string[] = [];
      tips.push('LSD（ゆっくり長く走る）を週1回、心拍を上げすぎない時間を増やすと持久が育ちます');
      tips.push('運動中の補給を水と少量の糖分にすると、後半まで保ちやすくなります');
      if (endurance === 'high') {
        tips.push('持久系に向いている素質を活かすには、徐々に距離を伸ばすペーシングが効果的です');
      }
      tips.push('運動前2時間にバナナや軽い炭水化物を摂ると、エネルギー切れを防げます');
      tips.push('鉄分が不足すると持久力に直結するので、レバーや赤身肉を意識してください');
      return tips;
    }

    case 'muscle_gain': {
      const protein = nband(geneRaw, 'たんぱく質');
      const tips: string[] = [];
      tips.push('食事を分けて摂る（3食 + 軽食2回）と、たんぱく質の合成が進みやすくなります');
      if (protein === 'low') {
        tips.push('体重1kgあたり1.2〜1.6gのたんぱく質を目安に、肉・魚・卵・大豆をバランス良く');
      } else if (geneRaw) {
        // Only imply a constitution assessment when gene data actually exists.
        tips.push('体重1kgあたり1.0〜1.2gのたんぱく質が目安、無理に増やさなくて大丈夫です');
      } else {
        tips.push('体重1kgあたり1.2g前後のたんぱく質を、まず目安にしてみてください');
      }
      tips.push('筋トレ後48時間以内にもう一度同じ部位を刺激すると、伸びが加速します');
      tips.push('炭水化物を抜くと筋肉がつきにくいので、エネルギー源も意識してください');
      tips.push('週2〜3回の筋トレ、それ以外の日は完全休養が筋肉の成長には大事です');
      return tips;
    }

    default:
      return [];
  }
}

// ─────────────────────────────────────────────────────────────────────
// 3. Personality × situation → judgment perspective
// ─────────────────────────────────────────────────────────────────────

interface JudgmentInputs {
  thinkingStyle?: string;   // 戦略型 / 分析型 / 直感型 / 共感型
  decisionTheme?: string;   // free text user-stated decision area
  stage?: string;           // 創業期 / 拡大期 / 安定期 / 転換期
  recentStateLevel?: number | null;
  recentFatigueLevel?: number | null;
}

/** Detect the kind of decision being discussed from free text. */
export type JudgmentTheme =
  | 'organization_expansion'  // 組織拡大・採用
  | 'fundraising'             // 資金調達
  | 'pivot'                   // 事業ピボット
  | 'succession'              // 事業承継・後継
  | 'partnership'             // 提携・M&A
  | 'leadership'              // リーダーシップ
  | 'work_life'               // ワークライフバランス
  | 'family'                  // 家族・人間関係
  | 'generic';                // その他の判断

export function detectJudgmentTheme(text: string): JudgmentTheme {
  if (/組織|採用|拡大|チーム|人事/.test(text)) return 'organization_expansion';
  if (/資金|調達|シリーズ|投資|ファンド|VC/.test(text)) return 'fundraising';
  if (/ピボット|転換|方針転換|撤退|撤退|事業転換/.test(text)) return 'pivot';
  if (/承継|後継|事業継承|引退|引継ぎ/.test(text)) return 'succession';
  if (/提携|M&A|買収|アライアンス|JV/.test(text)) return 'partnership';
  if (/リーダー|統率|メンバー|モチベ|エンゲージ/.test(text)) return 'leadership';
  if (/ワークライフ|プライベート|趣味|休暇/.test(text)) return 'work_life';
  if (/家族|妻|夫|子|親|家庭/.test(text)) return 'family';
  return 'generic';
}

/**
 * Theme × thinking-style insight table.
 * Returns 2–4 specific perspectives the executive concierge brings.
 */
export function insightsForJudgmentTheme(
  theme: JudgmentTheme,
  thinkingStyle?: string,
  stage?: string,
): string[] {
  const insights: string[] = [];

  switch (theme) {
    case 'organization_expansion':
      insights.push('採用の判断は、スキルより文化適合性を見る方が、長期で組織が安定しやすいです');
      insights.push('権限委譲は、結果より過程の透明性を確認する方が、信頼関係が育ちやすいです');
      if (stage === '拡大期') {
        insights.push('拡大期に最も枯渇しがちなのは経営者の時間です。意思決定の頻度より速度を上げる方が組織が動きやすくなります');
      }
      break;

    case 'fundraising':
      insights.push('バリュエーションよりも、投資家との対話の質を優先する方が、長期的なパートナーシップが育ちます');
      insights.push('調達時は、希薄化より「次のラウンドで何が見えていれば良いか」を逆算する方が組み立てやすいです');
      insights.push('調達のタイミングは、必要になる6ヶ月前に動き始めるのが余裕を持って交渉できる目安です');
      break;

    case 'pivot':
      insights.push('ピボットは「やめる勇気」より「次の仮説を持つ準備」が整っているかが鍵です');
      insights.push('既存事業の継続コストと、ピボットの機会コストを並べてみると、判断材料が揃いやすいです');
      insights.push('チームへの説明は「なぜ今か」より「なぜ我々が」を伝える方が、納得感が生まれやすいです');
      break;

    case 'succession':
      insights.push('事業承継は3〜5年の長期プロセス、急がず段階的に権限を譲っていくのが現実的です');
      insights.push('後継者の選定は能力より「事業への思い」を見る方が、長期的に上手くいきやすいです');
      break;

    case 'partnership':
      insights.push('提携は契約より文化、相手企業の意思決定スピードと自社のそれが合うかが最大の判断軸です');
      insights.push('M&Aは買う側より売る側の本音を聞くことが、後悔の少ない判断に繋がります');
      break;

    case 'leadership':
      insights.push('メンバーのモチベーションは、給与より「意思決定への参加感」で大きく変わります');
      insights.push('チームへのフィードバックは、結果ではなく行動を具体的に褒める方が、再現性のある成長に繋がります');
      break;

    case 'work_life':
      insights.push('経営者のプライベートは、企業の業績にも長期的に影響します。ご自身の時間を確保するのも経営判断のひとつです');
      insights.push('週に半日だけでも、仕事から完全に離れる時間を持つと、判断の質が上がります');
      break;

    case 'family':
      insights.push('家族との関係は、経営の質に直結する最重要のステークホルダーです');
      insights.push('家族との時間は、量より質。短時間でも完全に意識を向ける方が、関係性が深まります');
      break;

    case 'generic':
    default:
      // No theme-specific knowledge; rely on thinking-style perspective only
      break;
  }

  return insights;
}

/**
 * Build the "judgment perspective" the executive concierge brings.
 * Combines thinking style + body state + decision theme into 0–5 short phrases.
 */
export function buildJudgmentPerspective(inp: JudgmentInputs): string[] {
  const perspectives: string[] = [];
  const ts = inp.thinkingStyle ?? '';

  if (ts === '戦略型') {
    perspectives.push('長期視座を活かして、3年後どうなっていたいか、という視点で見ると整理しやすいかもしれません');
    perspectives.push('完璧主義に陥りがちなので、8割で動き始めて走りながら微調整するスタイルが効きやすいです');
  }
  if (ts === '分析型') {
    perspectives.push('情報を集めすぎる前に、「ここまで分かれば決める」という基準を先に置く方が前に進みやすいです');
    perspectives.push('数字に説得力を求めすぎず、最後の一押しは「腹に落ちるか」を信じても大丈夫なタイプです');
  }
  if (ts === '直感型') {
    perspectives.push('最初に湧いた直感を、24時間寝かせてから検証するパターンが効きやすい方です');
    perspectives.push('論理で武装しすぎる場面では、直感を「データの一種」として扱う方が判断がブレません');
  }
  if (ts === '共感型') {
    perspectives.push('利害関係者の表情や雰囲気から拾える情報を、判断材料として正面から信じても大丈夫です');
    perspectives.push('相手を思いやりすぎて自分の意思決定が遅れる場面があるかもしれません。「自分はどうしたいか」を先に決めると進みます');
  }

  if (inp.stage === '創業期') {
    perspectives.push('創業期は完璧な判断より、素早く動いて軌道修正する方が前に進みやすい時期です');
  } else if (inp.stage === '拡大期') {
    perspectives.push('拡大期は、ご自身が全部見るより「任せる」判断が組織を強くします');
  } else if (inp.stage === '安定期') {
    perspectives.push('安定期は、現状維持よりも「次の山」を見据える判断が長期の安定を生みます');
  } else if (inp.stage === '転換期') {
    perspectives.push('転換期は、過去の成功体験を一度脇に置く勇気が、新しい局面を切り開きます');
  }

  if (inp.recentStateLevel != null && inp.recentStateLevel >= 4) {
    perspectives.push('お身体が重い時の判断は、後で振り返ると質が落ちやすいので、急ぎでなければ翌朝に持ち越すと整います');
  }
  if (inp.recentFatigueLevel != null && inp.recentFatigueLevel >= 4) {
    perspectives.push('疲労が強い時は選択肢を増やすより、選択肢を絞る方向で考えた方が決まりやすいです');
  }

  return perspectives;
}

// ─────────────────────────────────────────────────────────────────────
// 4. Compose: build the full knowledge block the AI prompt receives
// ─────────────────────────────────────────────────────────────────────

interface KnowledgeBlockInputs {
  geneRaw: GriiceGeneData | null | undefined;
  thinkingStyle?: string;
  decisionTheme?: string;
  stage?: string;
  healthGoals?: HealthGoalKey[];
  recentStateLevel?: number | null;
  recentFatigueLevel?: number | null;
  userMessageText?: string;  // for ad-hoc goal detection
}

/**
 * Build the complete "domain knowledge" block the AI sees.
 * This is pre-translated text, ready to be referenced naturally by AXEL.
 */
export function buildKnowledgeBlock(inp: KnowledgeBlockInputs): string {
  const sections: string[] = [];

  // — 体質傾向（gene → humanized observations） —
  const constitution = humanizeConstitution(inp.geneRaw);
  if (constitution.length > 0) {
    sections.push(
      `【AXEL が内部に保持しているご利用者の体質傾向（人として表現したもの。応答内ではこの言葉を自然に使い、決して数値・カテゴリ名は読み上げない）】\n` +
      constitution.map((s) => `・${s}`).join('\n'),
    );
  }

  // — 目標別の助言素材（dietitian insights for stated goals） —
  const allGoals = new Set<HealthGoalKey>(inp.healthGoals ?? []);
  if (inp.userMessageText) {
    const detected = detectHealthGoal(inp.userMessageText);
    if (detected) allGoals.add(detected);
  }
  if (allGoals.size > 0) {
    const goalSections: string[] = [];
    for (const g of allGoals) {
      const tips = insightsForHealthGoal(g, inp.geneRaw);
      if (tips.length > 0) {
        const goalLabel: Record<HealthGoalKey, string> = {
          weight_loss: '体重・体型を整えたい',
          sleep: '睡眠を整えたい',
          fatigue: '疲労を残したくない',
          focus: '集中力を保ちたい',
          skin: '肌の状態を良くしたい',
          aging: '若々しさを保ちたい',
          sports_distance: '飛距離・運動パフォーマンス',
          sports_endurance: '持久力',
          muscle_gain: '筋肉をつけたい',
        };
        goalSections.push(`◆ ${goalLabel[g]}\n` + tips.map((t) => `  ・${t}`).join('\n'));
      }
    }
    if (goalSections.length > 0) {
      sections.push(
        `【AXEL が内部に保持している、ご利用者の目標に対する助言素材（管理栄養士の知見ベース。応答ではこれを話の流れに合わせて1〜2つだけ使う）】\n` +
        goalSections.join('\n\n'),
      );
    }
  }

  // — 判断視点（thinking style × stage × body state） —
  const judgments = buildJudgmentPerspective({
    thinkingStyle: inp.thinkingStyle,
    decisionTheme: inp.decisionTheme,
    stage: (inp as any).stage,
    recentStateLevel: inp.recentStateLevel,
    recentFatigueLevel: inp.recentFatigueLevel,
  });
  if (judgments.length > 0) {
    sections.push(
      `【AXEL が内部に保持している判断視点（ご利用者の思考スタイル・状況から導かれる視点。応答ではこれを「あなたらしい○○」「あなたなら」という形で自然に織り込む）】\n` +
      judgments.map((s) => `・${s}`).join('\n'),
    );
  }

  // — テーマ別の判断助言（decision theme insights） —
  // Detect the theme from the user's current message AND from any stored decisionTheme.
  let detectedTheme: JudgmentTheme = 'generic';
  if (inp.userMessageText) {
    detectedTheme = detectJudgmentTheme(inp.userMessageText);
  }
  if (detectedTheme === 'generic' && inp.decisionTheme) {
    detectedTheme = detectJudgmentTheme(inp.decisionTheme);
  }
  if (detectedTheme !== 'generic') {
    const themeTips = insightsForJudgmentTheme(detectedTheme, inp.thinkingStyle, (inp as any).stage);
    if (themeTips.length > 0) {
      sections.push(
        `【AXEL が内部に保持している、このテーマ「${detectedTheme}」に関する判断助言（応答では話の流れに合わせて1〜2つだけ使う）】\n` +
        themeTips.map((s) => `・${s}`).join('\n'),
      );
    }
  }

  return sections.join('\n\n');
}

// Re-export for tests / demos
export { type GriiceGeneData, type KnowledgeBlockInputs };
