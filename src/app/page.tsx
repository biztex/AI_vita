import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Reveal } from "@/components/reveal"
import { cn } from "@/lib/utils"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Brain,
  HeartPulse,
  Sparkles,
  ArrowRight,
  ArrowDown,
  ArrowUpRight,
  Check,
  Link2,
  CreditCard,
  Dna,
  Users,
  Activity,
} from "lucide-react"

// ── Palette ──────────────────────────────────────────
const GOLD = "#C9A86A"

// ── Editorial primitives ─────────────────────────────

function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "lp-kicker text-[11px] font-medium uppercase tracking-[0.32em] text-white/45",
        className,
      )}
    >
      {children}
    </span>
  )
}

function SectionHead({
  index,
  label,
  title,
  lead,
  align = "left",
  accent = "gold",
  className,
}: {
  index: string
  label: string
  title: React.ReactNode
  lead?: React.ReactNode
  align?: "left" | "center"
  accent?: "gold" | "teal"
  className?: string
}) {
  const accentText = accent === "gold" ? "text-[#C9A86A]" : "text-primary"
  return (
    <div className={cn(align === "center" ? "text-center" : "text-left", className)}>
      <div
        className={cn(
          "flex items-center gap-4",
          align === "center" && "justify-center",
        )}
      >
        <span className={cn("font-mincho text-xl font-medium tabular-nums", accentText)}>
          {index}
        </span>
        <span className="h-px w-8 bg-white/25" />
        <Kicker>{label}</Kicker>
      </div>
      <h2 className="mt-6 font-mincho text-[1.7rem] font-medium leading-[1.55] tracking-[0.01em] text-white sm:text-3xl md:text-[2.4rem] md:leading-[1.5]">
        {title}
      </h2>
      {lead && (
        <p
          className={cn(
            "mt-6 text-[15px] leading-[2] text-white/55",
            align === "center" && "mx-auto max-w-2xl",
            align === "left" && "max-w-xl",
          )}
        >
          {lead}
        </p>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="lp-root flex flex-col overflow-hidden bg-[#0F2342]">
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative flex min-h-[94vh] items-center justify-center px-6 py-32">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-32 -top-32 h-[640px] w-[640px] rounded-full bg-[#C9A86A]/[0.07] blur-[140px]" />
          <div className="absolute left-1/2 top-[-20%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/[0.04] blur-[140px]" />
          <div className="absolute bottom-[-20%] right-[8%] h-[420px] w-[420px] rounded-full bg-primary/[0.05] blur-[130px]" />
          <div className="absolute inset-0 lp-hairline-grid opacity-60" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="mx-auto max-w-3xl text-center">
          <Reveal variant="fade" duration={900}>
            <div className="mb-10 flex flex-col items-center gap-6">
              <Kicker>For Executives</Kicker>
              <div className="flex items-center gap-5">
                <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#C9A86A]/60" />
                <span className="font-mincho text-[1.6rem] font-bold tracking-[0.42em] text-[#C9A86A] pl-[0.42em]">
                  AXEL
                </span>
                <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#C9A86A]/60" />
              </div>
            </div>
          </Reveal>

          <Reveal variant="fade-up" delay={120} duration={900}>
            <h1 className="font-mincho text-[2rem] font-medium leading-[1.65] tracking-[0.02em] text-white sm:text-4xl sm:leading-[1.55] md:text-[2.9rem]">
              判断と、身体は、
              <br />
              <span className="text-[#C9A86A]">ひとつにできる。</span>
            </h1>
          </Reveal>

          <Reveal variant="fade-up" delay={260} duration={900}>
            <p className="mx-auto mt-10 max-w-xl text-[15px] leading-[2.1] text-white/60">
              AXEL は、判断支援と健康支援を
              <br className="sm:hidden" />
              ひとつに統合した、
              <br />
              経営陣のための AI コンシェルジュです。
            </p>
          </Reveal>

          <Reveal variant="fade-up" delay={400} duration={900}>
            <div className="mt-12 flex flex-col items-center justify-center gap-5 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="group h-auto rounded-full bg-[#C9A86A] px-9 py-4 text-[15px] font-bold tracking-wide text-[#0F2342] shadow-[0_8px_30px_-8px_rgba(201,168,106,0.5)] transition-all duration-300 hover:bg-[#d8bd86] hover:shadow-[0_12px_40px_-8px_rgba(201,168,106,0.6)]"
              >
                <Link href="/contact" className="flex items-center gap-2">
                  AXEL について相談する
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Link
                href="#about"
                className="group flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
              >
                AXEL とは何か、を見る
                <span className="inline-block transition-transform duration-300 group-hover:translate-y-0.5">↓</span>
              </Link>
            </div>
          </Reveal>

          <Reveal variant="fade" delay={560} duration={1000}>
            <div className="mt-16 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs tracking-wide text-white/45">
              <span>判断支援 ExecuWell</span>
              <span className="h-3 w-px bg-white/15" />
              <span>健康支援 VitaAI</span>
              <span className="h-3 w-px bg-white/15" />
              <span>遺伝子 × AI × 管理栄養士</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════ 01 — ISSUE ═══════════════ */}
      <section className="relative border-y border-white/[0.06] bg-black/15 px-6 py-28 md:py-36">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <SectionHead
              index="01"
              label="The Reality"
              accent="gold"
              title={
                <>
                  鋭い決断の裏にある、
                  <br />
                  誰にも言えない本音。
                </>
              }
              lead="最終判断を担う立場であるほど、口にしづらい感覚があります。判断と身体は、本来切り離せないものです。にもかかわらず、"
            />
          </Reveal>

          <div className="mt-16">
            {[
              "重要な判断を迫られた夜、社内に相談できる相手がいない。",
              "朝から集中力が上がらず、以前より疲れが抜けにくくなった。",
              "このまま10年後も経営し続けられるか、ふと、不安になる瞬間がある。",
            ].map((pain, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="flex items-baseline gap-6 border-b border-white/[0.08] py-6">
                  <span className="font-mincho text-base text-[#C9A86A]/60 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-[15px] leading-relaxed text-white/85">{pain}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal variant="fade" delay={200} duration={1000}>
            <figure className="mx-auto mt-16 max-w-2xl text-center">
              <p className="text-sm text-white/40">この本音に、感覚ではなく</p>
              <blockquote className="mt-5 font-mincho text-[1.6rem] font-medium leading-[1.65] text-white sm:text-3xl md:text-[2.2rem]">
                「根拠」で向き合うために、
                <br />
                AXEL は生まれました。
              </blockquote>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════ 02 — WHAT IS AXEL ═══════════════ */}
      <section id="about" className="relative px-6 py-28 md:py-36">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHead
              index="02"
              label="What is AXEL"
              align="center"
              accent="gold"
              title={
                <>
                  <span className="text-[#C9A86A]">AXEL</span>とは、
                  <br className="sm:hidden" />
                  判断と健康をひとつに支える AI です。
                </>
              }
              lead="ExecuWell（判断支援エンジン）と VitaAI（健康支援エンジン）が、ひとつの AXEL として連携稼働。ユーザーは「判断」と「身体」を分けず、ひとりの経営者として相談できます。"
            />
          </Reveal>

          {/* Integration diagram */}
          <Reveal variant="fade" delay={150}>
            <div className="mt-16 grid items-stretch gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] md:grid-cols-[1fr_auto_1fr_auto_1fr]">
              {/* ExecuWell engine */}
              <div className="h-full border-l-2 border-primary/50 bg-[#13294d]/40 p-7 md:p-9">
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <Kicker className="text-primary/70">Engine A</Kicker>
                    <p className="mt-2 font-mincho text-2xl font-medium text-white">ExecuWell</p>
                  </div>
                  <Brain className="h-5 w-5 text-primary/70" strokeWidth={1.5} />
                </div>
                <p className="text-xs font-semibold tracking-wide text-white/90">判断支援エンジン</p>
                <ul className="mt-4 space-y-2.5 text-[13px] leading-relaxed text-white/55">
                  <li>・思考特性 / 判断履歴の蓄積</li>
                  <li>・対話による思考整理</li>
                  <li>・あなた基準の最適解</li>
                </ul>
              </div>

              <div className="flex items-center justify-center bg-[#0F2342] px-2 py-4 md:py-0">
                <span className="font-mincho text-2xl text-white/40">＋</span>
              </div>

              {/* VitaAI engine */}
              <div className="h-full border-l-2 border-[#C9A86A]/50 bg-[#13294d]/40 p-7 md:p-9">
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <Kicker className="text-[#C9A86A]/70">Engine B</Kicker>
                    <p className="mt-2 font-mincho text-2xl font-medium text-white">VitaAI</p>
                  </div>
                  <HeartPulse className="h-5 w-5 text-[#C9A86A]/70" strokeWidth={1.5} />
                </div>
                <p className="text-xs font-semibold tracking-wide text-white/90">健康支援エンジン</p>
                <ul className="mt-4 space-y-2.5 text-[13px] leading-relaxed text-white/55">
                  <li>・遺伝子分析で体質把握</li>
                  <li>・管理栄養士 × AI の個別プラン</li>
                  <li>・3ヶ月ごとの再設計</li>
                </ul>
              </div>

              <div className="flex items-center justify-center bg-[#0F2342] px-2 py-6 md:py-0">
                <ArrowRight className="h-5 w-5 text-white/40" />
              </div>

              {/* AXEL */}
              <div className="h-full border-l-2 border-[#C9A86A] bg-gradient-to-br from-[#C9A86A]/15 to-transparent p-7 md:p-9">
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <Kicker className="text-[#C9A86A]">Integrated</Kicker>
                    <p className="mt-2 font-mincho text-3xl font-bold tracking-wider text-[#C9A86A]">
                      AXEL
                    </p>
                  </div>
                  <Sparkles className="h-5 w-5 text-[#C9A86A]" strokeWidth={1.5} />
                </div>
                <p className="text-xs font-semibold tracking-wide text-white/90">統合 AI コンシェルジュ</p>
                <ul className="mt-4 space-y-2.5 text-[13px] leading-relaxed text-white/65">
                  <li>・判断と健康をひとつの応答に</li>
                  <li>・思考特性＋遺伝子＋ログを横断</li>
                  <li>・経営陣を統合的に支える</li>
                </ul>
              </div>
            </div>
          </Reveal>

          {/* Sample AXEL response */}
          <Reveal variant="fade-up" delay={250}>
            <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.02] p-7 md:p-9">
              <Kicker>AXEL からの応答例</Kicker>
              <div className="mt-5 rounded-xl border border-[#C9A86A]/30 bg-[#0F2342] p-5">
                <p className="font-mincho text-sm leading-loose text-white/85">
                  <span className="font-bold text-[#C9A86A]">【AXEL】</span>
                  本日13時の役員会、判断状態は良好ですが、昨夜の睡眠スコアと午前のログから集中力は午後やや低下傾向です。あなたの遺伝子傾向（ストレス耐性 中）と意思決定パターン（情報過多時に決断疲れ）を踏まえ、議題は事前に2点まで絞っておくことを推奨します。会議直前の軽食はタンパク質中心が効果的です。
                </p>
              </div>
              <p className="mt-5 text-[12px] leading-relaxed text-white/45">
                ExecuWell の観点でも、VitaAI の観点でもなく ── AXEL ひとつから、判断と身体を横断したひとつの応答が返ります。
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════ 03 — FOR EXECUTIVES ═══════════════ */}
      <section className="relative border-y border-white/[0.06] bg-black/15 px-6 py-28 md:py-36">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHead
              index="03"
              label="For Whom"
              accent="gold"
              title={
                <>
                  AXEL は、
                  <br className="sm:hidden" />
                  こんな方のためにあります。
                </>
              }
              lead="「判断の質」と「身体の状態」を、長期で最大化したい方へ。"
            />
          </Reveal>

          <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] md:grid-cols-3">
            {[
              {
                title: "経営者・創業者",
                desc: "孤独な最終判断を繰り返す中で、思考を整理できる相手と、長期戦を戦える身体を求めている方。",
              },
              {
                title: "役員・管理職",
                desc: "経営と現場の間で意思決定の質が問われる中、自分のパフォーマンスに根拠を持ちたい方。",
              },
              {
                title: "次世代リーダー",
                desc: "これから責任が重くなる立場で、判断基準とコンディションの土台を早めに整えたい方。",
              },
            ].map((p, i) => (
              <Reveal key={i} variant="fade-up" delay={i * 120}>
                <div className="relative h-full border-l-2 border-[#C9A86A]/40 bg-[#13294d]/40 p-9 transition-colors duration-300 hover:bg-[#13294d]/70 md:p-10">
                  <span className="font-mincho text-sm text-[#C9A86A]/60 tabular-nums">
                    0{i + 1}
                  </span>
                  <h4 className="mt-5 font-mincho text-xl font-medium text-white">
                    {p.title}
                  </h4>
                  <p className="mt-4 text-[14.5px] leading-[2] text-white/55">{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ 04 — AXEL JOURNEY ═══════════════ */}
      <section className="relative px-6 py-28 md:py-36">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHead
              index="04"
              label="AXEL Journey"
              accent="gold"
              title={
                <>
                  AXEL は、
                  <br className="sm:hidden" />
                  5つのステップで始まります。
                </>
              }
              lead="アカウント連携から、AXEL の日常運用開始まで。各段階の進捗はマイページからいつでもご確認いただけます。"
            />
          </Reveal>

          <div className="mt-16">
            {[
              {
                step: "01",
                title: "アカウント連携",
                desc: "ご契約用アカウントを作成し、LINE と連携。ここから AXEL ジャーニーが始まります。",
                icon: <Link2 className="h-4 w-4" />,
              },
              {
                step: "02",
                title: "プラン選択",
                desc: "AXEL（統合）／ExecuWell 単独／VitaAI 単独 からご契約プランを選択いただきます。",
                icon: <CreditCard className="h-4 w-4" />,
              },
              {
                step: "03",
                title: "遺伝子検査キットお届け",
                desc: "ご自宅に検査キットをお届け。返送後、結果到着時に LINE で自動通知いたします。",
                icon: <Dna className="h-4 w-4" />,
              },
              {
                step: "04",
                title: "管理栄養士による初回面談",
                desc: "遺伝子分析結果をもとに、管理栄養士が個別設計シートを作成。AI が即時参照します。",
                icon: <Users className="h-4 w-4" />,
              },
              {
                step: "05",
                title: "AXEL 体験スタート",
                desc: "判断と健康を統合的に支える AXEL の日常運用が始まります。3ヶ月ごとに見直し。",
                icon: <Activity className="h-4 w-4" />,
              },
            ].map((s, i) => (
              <Reveal key={i} variant="fade-up" delay={i * 100}>
                <div className="flex items-start gap-5 border-b border-white/[0.08] py-6 md:gap-7 md:py-7">
                  <div className="flex flex-col items-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#C9A86A]/40 bg-[#C9A86A]/10 text-[#C9A86A]">
                      {s.icon}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-4">
                      <span className="font-mincho text-base text-[#C9A86A]/60 tabular-nums">
                        STEP {s.step}
                      </span>
                      <h4 className="font-mincho text-lg font-medium text-white md:text-xl">
                        {s.title}
                      </h4>
                    </div>
                    <p className="mt-2.5 text-[14px] leading-relaxed text-white/55 md:text-[14.5px]">
                      {s.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ 05 — INSIDE AXEL: ExecuWell engine ═══════════════ */}
      <section className="relative border-y border-white/[0.06] bg-black/15 px-6 py-28 md:py-36">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHead
              index="05"
              label="Inside AXEL ｜ Engine A"
              accent="teal"
              title={
                <>
                  判断支援エンジン
                  <br />
                  <span className="text-primary">ExecuWell</span>
                </>
              }
              lead="思考特性・実績・意思決定傾向を蓄積し、判断を共に導く、24時間の相談機能。AXEL の「判断」側の脳として動作します。"
            />
          </Reveal>

          <div className="mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-3">
            {[
              {
                kicker: "24/7",
                title: "孤独な夜の相談相手",
                desc: "重要な判断の前夜、誰にも話せない時間に、AXEL がいつでも応える存在として動作します。",
              },
              {
                kicker: "Structure",
                title: "思考の整理と言語化",
                desc: "対話を通じて思考を整理し、判断軸を明確にします。AXEL が言語化を支援します。",
              },
              {
                kicker: "Learning",
                title: "深まり続ける理解",
                desc: "判断の積み重ねが、より精度の高い意思決定支援につながります。AXEL があなたを理解し続けます。",
              },
            ].map((v, i) => (
              <Reveal key={i} variant="fade-up" delay={i * 120}>
                <div className="border-t border-primary/30 pt-6">
                  <Kicker className="text-primary/80">{v.kicker}</Kicker>
                  <h4 className="mt-3 font-mincho text-lg font-medium text-white">
                    {v.title}
                  </h4>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-white/55">{v.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ 06 — INSIDE AXEL: VitaAI engine ═══════════════ */}
      <section className="relative px-6 py-28 md:py-36">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHead
              index="06"
              label="Inside AXEL ｜ Engine B"
              accent="gold"
              title={
                <>
                  健康支援エンジン
                  <br />
                  <span className="text-[#C9A86A]">VitaAI</span>
                </>
              }
              lead="遺伝子分析と管理栄養士監修の個別設計シートにもとづく、コンディション支援機能。AXEL の「身体」側の脳として動作します。"
            />
          </Reveal>

          <div className="mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-3">
            {[
              {
                kicker: "Cognition",
                title: "判断力を維持する",
                desc: "集中力・疲労・ストレスへの耐性を整え、AXEL の判断機能の質を支えます。",
              },
              {
                kicker: "Longevity",
                title: "健康を維持する",
                desc: "血圧・脂質・体組成などを整え、長く現役でいられる状態をつくります。",
              },
              {
                kicker: "Recovery",
                title: "回復力を高める",
                desc: "疲労回復・筋肉・栄養バランスを整え、継続的にパフォーマンスを発揮できる身体へ。",
              },
            ].map((v, i) => (
              <Reveal key={i} variant="fade-up" delay={i * 120}>
                <div className="border-t border-[#C9A86A]/30 pt-6">
                  <Kicker className="text-[#C9A86A]/80">{v.kicker}</Kicker>
                  <h4 className="mt-3 font-mincho text-lg font-medium text-white">
                    {v.title}
                  </h4>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-white/55">{v.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ 07 — A DAY WITH AXEL ═══════════════ */}
      <section className="relative border-y border-white/[0.06] bg-black/15 px-6 py-28 md:py-36">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHead
              index="07"
              label="A Day with AXEL"
              align="center"
              accent="gold"
              title="AXEL のある、ある一日。"
              lead="AXEL は1日を通じて、判断と身体を統合的に支援します。"
            />
          </Reveal>

          <div className="mt-16 grid gap-5 md:grid-cols-2">
            {[
              {
                time: "07:00",
                title: "朝の AXEL インサイト",
                desc: "昨夜の睡眠スコアと今日の予定から、当日の集中力ピーク帯と注意ポイントを LINE で配信。",
                tag: "Push",
              },
              {
                time: "09:30",
                title: "コンディション記録",
                desc: "5秒で状態・疲労を3段階入力。AXEL が即時フィードバックを返します。",
                tag: "LIFF",
              },
              {
                time: "14:00",
                title: "重要な判断の相談",
                desc: "「この件、どう進めるべきか」LINE で送ると、判断と体調の両方を踏まえた応答が返ります。",
                tag: "Chat",
              },
              {
                time: "22:00",
                title: "閾値検知時のアラート",
                desc: "個別設計シートの閾値を超えた場合、AXEL が自動でアラート push を送信します。",
                tag: "Alert",
              },
            ].map((m, i) => (
              <Reveal key={i} variant="fade-up" delay={i * 120}>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mincho text-2xl font-medium text-[#C9A86A]">
                      {m.time}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40">
                      {m.tag}
                    </span>
                  </div>
                  <h4 className="mt-4 font-mincho text-lg font-medium text-white">
                    {m.title}
                  </h4>
                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-white/55">{m.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal variant="fade" delay={200}>
            <div className="mt-14 border-t border-[#C9A86A]/20 pt-12 text-center">
              <p className="font-mincho text-xl font-medium leading-[1.8] text-white md:text-2xl">
                3ヶ月ごとに、管理栄養士が個別設計を見直し。
                <br />
                AXEL は、あなたの最新の状態に合わせて進化します。
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════ 08 — PRICING ═══════════════ */}
      <section className="relative px-6 py-28 md:py-36">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHead
              index="08"
              label="Pricing"
              align="center"
              accent="gold"
              title="プラン"
              lead="AXEL（統合プラン）を中心に、ご希望に応じて単独プランもご用意しています。"
            />
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {/* AXEL Integrated — featured */}
            <Reveal variant="fade-up" delay={120} className="md:order-2">
              <PricingCard
                featured
                badge="AXEL ／ 統合プラン"
                name="AXEL"
                subname="判断 × 健康"
                range="経営陣の本格運用に"
                monthly="¥18,000"
                features={[
                  "ExecuWell ＋ VitaAI を統合運用",
                  "AXEL モード（統合 AI コンシェルジュ）",
                  "遺伝子分析 ＋ 個別設計シート",
                  "管理栄養士 × AI × 3ヶ月レビュー",
                ]}
                cta="AXEL について相談する"
                href="/contact?plan=integrated"
              />
            </Reveal>

            {/* ExecuWell solo */}
            <Reveal variant="fade-right" delay={0} className="md:order-1">
              <PricingCard
                name="ExecuWell 単独"
                subname="判断支援のみ"
                range="判断機能だけが必要な方へ"
                monthly="¥10,000"
                features={[
                  "ExecuWell（判断支援エンジン）",
                  "思考特性 × 判断履歴の蓄積",
                  "24時間の対話による思考整理",
                ]}
                cta="このプランで相談する"
                href="/contact?plan=executive"
                accent="teal"
              />
            </Reveal>

            {/* VitaAI solo */}
            <Reveal variant="fade-left" delay={240} className="md:order-3">
              <PricingCard
                name="VitaAI 単独"
                subname="健康支援のみ"
                range="健康機能だけが必要な方へ"
                monthly="¥10,000"
                features={[
                  "VitaAI（健康支援エンジン）",
                  "遺伝子分析 × 個別設計",
                  "管理栄養士 × 3ヶ月レビュー",
                ]}
                cta="このプランで相談する"
                href="/contact?plan=vita"
                accent="gold-soft"
              />
            </Reveal>
          </div>

          <Reveal delay={150}>
            <p className="mx-auto mt-12 max-w-3xl text-center text-xs leading-relaxed text-white/40">
              ※ 表示は税別月額です。初期費用（遺伝子検査キット・管理栄養士による初回設計）は別途。
              ※ 福利厚生費・研修費など、全額経費での計上を前提とした運用が可能です（詳細は顧問税理士にご確認ください）。
              ※ 本サービスは医療行為ではありません。
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════ 09 — FAQ ═══════════════ */}
      <section className="relative border-y border-white/[0.06] bg-black/15 px-6 py-28 md:py-36">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <SectionHead
              index="09"
              label="FAQ"
              align="center"
              accent="teal"
              title="よくあるご質問"
            />
          </Reveal>

          <Reveal delay={100}>
            <Accordion type="single" collapsible className="mt-12 w-full">
              {FAQS.map((q, i) => (
                <AccordionItem key={i} value={`q${i}`} className="border-white/[0.08]">
                  <AccordionTrigger className="py-6 hover:no-underline">
                    <div className="flex w-full items-baseline gap-5 text-left">
                      <span className="font-mincho text-base text-[#C9A86A]/60 tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-mincho text-[15.5px] font-medium leading-snug text-white">
                        {q.q}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-11 text-[14px] leading-[2] text-white/65">
                    {q.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════ CLOSING ═══════════════ */}
      <section className="relative px-6 py-32 md:py-40">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C9A86A]/[0.06] blur-[150px]" />
          <div className="absolute inset-0 lp-hairline-grid opacity-40" />
        </div>

        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <div className="mb-8 flex items-center justify-center gap-4">
              <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#C9A86A]/60" />
              <span className="font-mincho text-sm font-bold tracking-[0.5em] text-[#C9A86A] pl-[0.5em]">
                AXEL
              </span>
              <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#C9A86A]/60" />
            </div>
            <h2 className="font-mincho text-[1.8rem] font-medium leading-[1.7] text-white sm:text-3xl md:text-[2.5rem]">
              判断と、身体を、
              <br />
              <span className="text-[#C9A86A]">ひとつに。</span>
            </h2>
          </Reveal>

          <Reveal variant="fade-up" delay={150}>
            <p className="mx-auto mt-10 max-w-md text-[15px] leading-[2] text-white/55">
              10年後も第一線で意思決定を続けるために。
              <br className="hidden sm:block" />
              AXEL は、経営陣のための統合 AI コンシェルジュです。
            </p>
          </Reveal>

          <Reveal variant="fade-up" delay={350}>
            <Button
              size="lg"
              asChild
              className="group mt-10 h-auto rounded-full bg-[#C9A86A] px-10 py-4 text-[15px] font-bold tracking-wide text-[#0F2342] shadow-[0_10px_40px_-10px_rgba(201,168,106,0.55)] transition-all duration-300 hover:bg-[#d8bd86] hover:shadow-[0_16px_50px_-10px_rgba(201,168,106,0.65)]"
            >
              <Link href="/contact" className="flex items-center gap-2">
                AXEL について相談する
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </Button>
            <p className="mt-6 text-xs tracking-wide text-white/35">
              ご相談・資料請求は無料です。通常2営業日以内にご返信いたします。
            </p>
          </Reveal>
        </div>
      </section>
    </div>
  )
}

// ── Pricing card ─────────────────────────────────────

function PricingCard({
  featured,
  badge,
  name,
  subname,
  range,
  monthly,
  features,
  cta,
  href,
  accent = "gold",
}: {
  featured?: boolean
  badge?: string
  name: string
  subname?: string
  range: string
  monthly: string
  features: string[]
  cta: string
  href: string
  accent?: "gold" | "teal" | "gold-soft"
}) {
  const accentClass = accent === "teal" ? "text-primary" : "text-[#C9A86A]"
  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-2xl p-8 transition-all duration-300 md:p-9",
        featured
          ? "border-2 border-[#C9A86A] bg-gradient-to-br from-[#C9A86A]/[0.08] to-transparent shadow-[0_20px_60px_-30px_rgba(201,168,106,0.55)] md:scale-[1.02]"
          : "border border-white/10 bg-white/[0.02] hover:border-white/20",
      )}
    >
      {featured && badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#C9A86A] px-3.5 py-1 text-[10px] font-bold tracking-[0.15em] text-[#0F2342] whitespace-nowrap">
          {badge}
        </span>
      )}

      <div>
        <h3
          className={cn(
            "font-mincho text-2xl font-bold",
            featured ? "text-[#C9A86A]" : "text-white",
          )}
        >
          {name}
        </h3>
        {subname && (
          <p className="mt-0.5 text-xs tracking-[0.2em] text-white/40 uppercase">{subname}</p>
        )}
        <p className="mt-2 text-xs tracking-wide text-white/55">{range}</p>
      </div>

      <div className="mt-8">
        <p className="text-[11px] tracking-wide text-white/40">月額（税別）</p>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className={cn("font-mincho text-4xl font-semibold tabular-nums", accentClass)}>
            {monthly}
          </span>
          <span className="text-sm text-white/45">/ 名</span>
        </div>
      </div>

      <div className="my-7 h-px w-full bg-white/[0.08]" />

      <ul className="mb-9 flex-1 space-y-3">
        {features.map((f, i) => (
          <li
            key={i}
            className="flex items-baseline gap-3 text-[13.5px] leading-relaxed text-white/75"
          >
            <Check className={cn("mt-0.5 h-3.5 w-3.5 flex-shrink-0", accentClass)} strokeWidth={2.5} />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        className={cn(
          "h-auto w-full rounded-full py-3.5 text-sm font-bold tracking-wide transition-all duration-300",
          featured
            ? "bg-[#C9A86A] text-[#0F2342] hover:bg-[#d8bd86] shadow-md shadow-[#C9A86A]/25"
            : "border border-white/20 bg-transparent text-white hover:border-white/40 hover:bg-white/5",
        )}
      >
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  )
}

// ── FAQ data ─────────────────────────────────────────

const FAQS = [
  {
    q: "AXEL は、ExecuWell や VitaAI と何が違いますか？",
    a: "AXEL は、判断支援（ExecuWell）と健康支援（VitaAI）を1つの応答に統合した、経営陣のための AI コンシェルジュです。ExecuWell と VitaAI は AXEL を構成する2つのエンジンであり、AXEL モードではこれらが連動して、ひとつの統合された応答を返します。",
  },
  {
    q: "医療行為にあたりますか？",
    a: "本サービスは医療行為ではありません。遺伝的傾向と生活習慣データをもとに、日々のコンディション改善をサポートするプログラムです。診断・治療が必要な症状は、必ず医療機関にご相談ください。",
  },
  {
    q: "遺伝子データやAIとの会話内容のプライバシーは守られますか？",
    a: "遺伝子データ・対話ログは、あなた本人のアドバイス生成以外の目的には利用しません。厳格なアクセス管理のもと保管し、第三者提供は一切行いません。",
  },
  {
    q: "遺伝子分析はどのように行いますか？",
    a: "自宅に届く簡易キットで唾液を採取し、ご返送いただくだけです。来院は不要で、通常2〜3週間で結果をもとに管理栄養士が初期プランを設計します。結果到着時には LINE で自動通知いたします。",
  },
  {
    q: "AXEL（統合プラン）の途中で、単独プランに変更できますか？",
    a: "月単位でのプラン変更が可能です。変更時はマイページから操作いただくか、サポートまでご連絡ください。",
  },
  {
    q: "経費として計上できますか？",
    a: "福利厚生費・研修費など、全額経費での計上を前提とした運用が可能です。具体的な勘定科目や処理方法については、顧問税理士にご確認ください。",
  },
  {
    q: "どれくらいで変化を実感できますか？",
    a: "個人差はありますが、行動ルールの定着により1〜3ヶ月で睡眠・集中・疲労感などの変化を感じる方が多くいらっしゃいます。3ヶ月ごとの定期レビューで、継続的に最適化します。",
  },
]
