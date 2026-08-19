"use client"

import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Database, DownloadCloud, Save, Loader2, CheckCircle2 } from "lucide-react"
import { apiClient } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { toast } from "react-toastify"

type VitaPayload = {
  user_id: string
  genetic_summary: Record<string, number>
  sports_profile: Record<string, number>
}

type ExecuWellPayload = {
  user_id: string
  personality: {
    mbti?: string
    enneagram?: number
    disc?: string
  }
  background: {
    industries_experienced?: string[]
    current_roles?: string[]
    licenses?: string[]
    business_goal?: string
  }
  preferences: {
    values?: string[]
    interests?: string[]
  }
  ai_behavior_policy: {
    tone?: string
    motivation_style?: string
    analysis_depth?: string
  }
}

const vitaSample = `{
  "user_id": "test_user_001",
  "genetic_summary": {
    "mental_stress": 2,
    "sleep": 3,
    "body_fat": 2,
    "glycation": 2,
    "muscle": 3,
    "vessel_blood_pressure": 2,
    "hair": 2,
    "spots_freckles": 4,
    "bone": 2,
    "cholesterol": 2
  },
  "sports_profile": {
    "muscle_fiber": 2,
    "explosiveness": 3,
    "endurance": 2,
    "injury_risk_muscle": 4,
    "injury_risk_fatigue": 4,
    "injury_risk_joint": 4,
    "iron_deficiency": 5
  }
}`

const execuSample: ExecuWellPayload = {
  user_id: "test_user_001",
  personality: {
    mbti: "ISTJ-A",
    enneagram: 5,
    disc: "C",
  },
  background: {
    industries_experienced: ["航空情報サービス", "学習塾運営", "不動産業", "旅行業", "広告業", "太陽光発電事業"],
    current_roles: ["株式会社サンプルA代表", "株式会社サンプルB代表", "AIアドバイザー"],
    licenses: ["宅地建物取引士", "一般旅行業務取扱主任者", "AIアドバイザーの資格"],
    business_goal: "年商5億円を達成する",
  },
  preferences: {
    values: ["あせらず、あわてず、あきらめず", "調和と穏やかな生活を重視"],
    interests: ["サウナ", "ジム", "甘いもの", "旬のフルーツ", "一人の時間"],
  },
  ai_behavior_policy: {
    tone: "positive_supportive",
    motivation_style: "encouraging",
    analysis_depth: "strategic_consulting_level",
  },
}

const mbtiList = [
  "INTJ",
  "ENTJ",
  "INTP",
  "ENTP",
  "INFJ",
  "ENFJ",
  "INFP",
  "ENFP",
  "ISTJ",
  "ESTJ",
  "ISFJ",
  "ESFJ",
  "ISTP",
  "ESTP",
  "ISFP",
  "ESFP",
] as const

const businessChallenges = [
  "事業成長とスケーリング",
  "プレッシャー下での意思決定",
  "チームマネジメントと文化",
  "イノベーションと市場適応",
  "財務管理",
  "ワークライフバランス",
  "ストレス管理",
  "ステークホルダーコミュニケーション",
]

export default function InformationPage() {
  const { user } = useAuth()
  const [vitaJson, setVitaJson] = useState("")
  const [vitaError, setVitaError] = useState<string | null>(null)
  const [vitaSaved, setVitaSaved] = useState(false)
  const [vitaLoading, setVitaLoading] = useState(false)
  const [execuForm, setExecuForm] = useState({
    mbti: "",
    enneagram: 5,
    disc: "",
    industries: [] as string[],
    currentRoles: [] as string[],
    licenses: [] as string[],
    businessGoal: "",
    values: [] as string[],
    interests: [] as string[],
    businessChallenges: [] as string[],
    healthScore: 50,
    selfScore: 60,
    tone: "",
    motivationStyle: "",
    analysisDepth: "",
  })
  const [execuSaved, setExecuSaved] = useState(false)
  const [execuLoading, setExecuLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Load existing profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setLoadingProfile(false)
        return
      }

      try {
        const response = await apiClient.profile.get()
        const profile = response.profile

        // Load VitaAI data
        if (profile.vitaAI?.rawPayload) {
          setVitaJson(JSON.stringify(profile.vitaAI.rawPayload, null, 2))
          setVitaSaved(true)
        }

        // Load ExecuWell data
        if (profile.execuWell) {
          const execu = profile.execuWell
          setExecuForm({
            mbti: execu.mbti || "",
            enneagram: execu.enneagram || 5,
            disc: execu.disc || "",
            industries: execu.industries || [],
            currentRoles: execu.currentRoles || [],
            licenses: execu.licenses || [],
            businessGoal: execu.businessGoal || "",
            values: execu.values || [],
            interests: execu.interests || [],
            businessChallenges: execu.businessChallenges || [],
            healthScore: execu.healthScore || 50,
            selfScore: execu.selfScore || 60,
            tone: execu.tone || "",
            motivationStyle: execu.motivationStyle || "",
            analysisDepth: execu.analysisDepth || "",
          })
          setExecuSaved(true)
        }
      } catch (error) {
        console.error("[assessment] Failed to load profile:", error)
        // Don't show error toast for 404 (no profile yet)
      } finally {
        setLoadingProfile(false)
      }
    }

    loadProfile()
  }, [user])

  const handleLoadVitaSample = () => {
    setVitaJson(vitaSample)
    setVitaError(null)
    setVitaSaved(false)
  }

  const handleSaveVita = async () => {
    if (!user) {
      toast.error("ログインが必要です", {
        position: "top-right",
        autoClose: 3000,
      })
      return
    }

    try {
      const parsed: VitaPayload = JSON.parse(vitaJson)
      if (!parsed?.genetic_summary && !parsed?.sports_profile) {
        throw new Error("genetic_summary または sports_profile が必要です")
      }

      setVitaError(null)
      setVitaLoading(true)

      await apiClient.profile.saveVitaAI({
        genetic_summary: parsed.genetic_summary,
        sports_profile: parsed.sports_profile,
        testId: parsed.user_id ? `IDENSIL-${parsed.user_id}` : undefined,
        rawPayload: parsed,
      })

      setVitaSaved(true)
      toast.success("VitaAIプロファイルをデータベースに保存しました", {
        position: "top-right",
        autoClose: 3000,
      })
    } catch (error) {
      setVitaSaved(false)
      const errorMessage = error instanceof Error ? error.message : "Invalid JSON"
      setVitaError(errorMessage)
      toast.error(`保存エラー: ${errorMessage}`, {
        position: "top-right",
        autoClose: 5000,
      })
    } finally {
      setVitaLoading(false)
    }
  }

  const handleLoadExecuSample = () => {
    setExecuForm({
      mbti: execuSample.personality.mbti || "",
      enneagram: execuSample.personality.enneagram || 0,
      disc: execuSample.personality.disc || "",
      industries: execuSample.background.industries_experienced || [],
      currentRoles: execuSample.background.current_roles || [],
      licenses: execuSample.background.licenses || [],
      businessGoal: execuSample.background.business_goal || "",
      values: execuSample.preferences.values || [],
      interests: execuSample.preferences.interests || [],
      businessChallenges: [],
      healthScore: 50,
      selfScore: 60,
      tone: execuSample.ai_behavior_policy.tone || "",
      motivationStyle: execuSample.ai_behavior_policy.motivation_style || "",
      analysisDepth: execuSample.ai_behavior_policy.analysis_depth || "",
    })
    setExecuSaved(false)
  }

  const toggleSet = (key: keyof typeof execuForm, value: string) => {
    setExecuForm((prev) => {
      const list = new Set(prev[key] as string[])
      list.has(value) ? list.delete(value) : list.add(value)
      return { ...prev, [key]: Array.from(list) }
    })
  }

  const handleSaveExecu = async () => {
    if (!user) {
      toast.error("ログインが必要です", {
        position: "top-right",
        autoClose: 3000,
      })
      return
    }

    try {
      setExecuLoading(true)

      await apiClient.profile.saveExecuWell({
        mbti: execuForm.mbti || undefined,
        enneagram: execuForm.enneagram || undefined,
        disc: execuForm.disc || undefined,
        industries: execuForm.industries,
        currentRoles: execuForm.currentRoles,
        licenses: execuForm.licenses,
        businessGoal: execuForm.businessGoal || undefined,
        values: execuForm.values,
        interests: execuForm.interests,
        businessChallenges: execuForm.businessChallenges,
        healthScore: execuForm.healthScore,
        selfScore: execuForm.selfScore,
        tone: execuForm.tone || undefined,
        motivationStyle: execuForm.motivationStyle || undefined,
        analysisDepth: execuForm.analysisDepth || undefined,
      })

      setExecuSaved(true)
      toast.success("ExecuWellプロファイルをデータベースに保存しました", {
        position: "top-right",
        autoClose: 3000,
      })
    } catch (error) {
      setExecuSaved(false)
      const errorMessage = error instanceof Error ? error.message : "保存に失敗しました"
      toast.error(`保存エラー: ${errorMessage}`, {
        position: "top-right",
        autoClose: 5000,
      })
    } finally {
      setExecuLoading(false)
    }
  }

  const mbtiRows = useMemo(() => {
    const rows = []
    for (let i = 0; i < mbtiList.length; i += 4) rows.push(mbtiList.slice(i, i + 4))
    return rows
  }, [])

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">診断センター</p>
        <h1 className="text-3xl font-bold">プロフィールデータを更新</h1>
        <p className="text-muted-foreground">
          ExecuWell / VitaAI 向けの診断データをアップロードし、AI推奨をパーソナライズします。
        </p>
      </div>

      <Tabs defaultValue="vita" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="execu">ExecuWell</TabsTrigger>
          <TabsTrigger value="vita">VitaAI</TabsTrigger>
        </TabsList>

        {/* VitaAI */}
        <TabsContent value="vita" className="space-y-6">
          {/* <Card className="border-dashed bg-muted/40">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">遺伝子データ未登録</p>
                <p className="text-sm text-muted-foreground">
                  IDENSILの遺伝子検査データ（JSON）を登録すると、健康レコメンドが有効になります。
                </p>
              </div>
            </CardContent>
          </Card> */}

          <Card>
            <CardHeader>
              <CardTitle>遺伝子データをアップロード</CardTitle>
              <CardDescription>診断データを貼り付けるか、サンプルデータで表示を確認できます。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Database className="h-4 w-4" />
                  <span>対応フォーマット: VitaAI 診断データ（JSON）</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleLoadVitaSample}>
                  <DownloadCloud className="mr-2 h-4 w-4" />
                  サンプルを読み込む
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vita-json">JSON</Label>
                <Textarea
                  id="vita-json"
                  placeholder="遺伝子データのJSONを貼り付け"
                  className="min-h-[280px]"
                  value={vitaJson}
                  onChange={(e) => {
                    setVitaJson(e.target.value)
                    setVitaError(null)
                    setVitaSaved(false)
                  }}
                />
                <p className="text-xs text-muted-foreground">user_id とスコア(1-5)を含めたJSON形式</p>
              </div>

              {vitaError && <p className="text-sm text-destructive">JSONエラー: {vitaError}</p>}
              {vitaSaved && (
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>データベースに保存済み</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button onClick={handleSaveVita} disabled={vitaLoading || !vitaJson.trim()}>
                  {vitaLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      遺伝子データを保存
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  データベースに保存されます
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ExecuWell */}
        <TabsContent value="execu" className="space-y-6">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">β版</Badge>
            <span className="text-sm text-muted-foreground">性格・経営プロファイルを入力してください</span>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>性格診断 (MBTIベース)</CardTitle>
                  <CardDescription>該当タイプを選択し、Enneagram / DISC を入力</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={handleLoadExecuSample}>
                  <DownloadCloud className="mr-2 h-4 w-4" />
                  サンプル反映
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3">
                {mbtiRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {row.map((type) => (
                      <Button
                        key={type}
                        variant={execuForm.mbti.startsWith(type) ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => setExecuForm((prev) => ({ ...prev, mbti: type }))}
                      >
                        <span className="font-semibold">{type}</span>
                        <span className="ml-auto text-xs text-muted-foreground">MBTI</span>
                      </Button>
                    ))}
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="enneagram">エニアグラム</Label>
                  <Input
                    id="enneagram"
                    type="number"
                    min={1}
                    max={9}
                    value={execuForm.enneagram}
                    onChange={(e) => setExecuForm((prev) => ({ ...prev, enneagram: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="disc">DISC</Label>
                  <Input
                    id="disc"
                    placeholder="例: D / I / S / C"
                    value={execuForm.disc}
                    onChange={(e) => setExecuForm((prev) => ({ ...prev, disc: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>経営者プロフィール</CardTitle>
              <CardDescription>経験業種・役割・資格・目標を入力</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>経験業種</Label>
                <Textarea
                  placeholder="カンマ区切りで入力"
                  value={execuForm.industries.join(", ")}
                  onChange={(e) =>
                    setExecuForm((prev) => ({ ...prev, industries: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) }))
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>現在の役割</Label>
                  <Textarea
                    placeholder="カンマ区切りで入力"
                    value={execuForm.currentRoles.join(", ")}
                    onChange={(e) =>
                      setExecuForm((prev) => ({
                        ...prev,
                        currentRoles: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>資格</Label>
                  <Textarea
                    placeholder="カンマ区切りで入力"
                    value={execuForm.licenses.join(", ")}
                    onChange={(e) =>
                      setExecuForm((prev) => ({ ...prev, licenses: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>ビジネス目標</Label>
                <Input
                  placeholder="例: 年商5億円を達成する"
                  value={execuForm.businessGoal}
                  onChange={(e) => setExecuForm((prev) => ({ ...prev, businessGoal: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>志向性 / 課題</CardTitle>
              <CardDescription>価値観・興味・直面している課題を選択</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>価値観</Label>
                  <Textarea
                    placeholder="カンマ区切りで入力"
                    value={execuForm.values.join(", ")}
                    onChange={(e) =>
                      setExecuForm((prev) => ({ ...prev, values: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>興味・生活習慣</Label>
                  <Textarea
                    placeholder="カンマ区切りで入力"
                    value={execuForm.interests.join(", ")}
                    onChange={(e) =>
                      setExecuForm((prev) => ({
                        ...prev,
                        interests: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>現在のビジネス課題（複数選択可）</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  {businessChallenges.map((item) => (
                    <label key={item} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50">
                      <Checkbox
                        checked={execuForm.businessChallenges.includes(item)}
                        onCheckedChange={() => toggleSet("businessChallenges", item)}
                      />
                      <div>
                        <p className="font-medium">{item}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>コンディション / セルフスコア</CardTitle>
              <CardDescription>現在の状態をスライダーで評価</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>現在の健康コンディション</Label>
                <Slider
                  value={[execuForm.healthScore]}
                  onValueChange={([value]) => setExecuForm((prev) => ({ ...prev, healthScore: value }))}
                  min={0}
                  max={100}
                  step={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>悪い</span>
                  <span>やや悪い</span>
                  <span>普通</span>
                  <span>良い</span>
                  <span>非常に良い</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>セルフ評価スコア</Label>
                <Slider
                  value={[execuForm.selfScore]}
                  onValueChange={([value]) => setExecuForm((prev) => ({ ...prev, selfScore: value }))}
                  min={0}
                  max={100}
                  step={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>悪い</span>
                  <span>やや悪い</span>
                  <span>普通</span>
                  <span>良い</span>
                  <span>非常に良い</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {execuSaved && (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              <span>データベースに保存済み</span>
            </div>
          )}

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <Button size="lg" onClick={handleSaveExecu} disabled={execuLoading}>
              {execuLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  ExecuWell 情報を保存
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              データベースに保存されます
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

