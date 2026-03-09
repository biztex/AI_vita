"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, FlaskConical, Send, Eye } from "lucide-react"
import { apiClient } from "@/lib/api"
import { toast } from "react-toastify"

export default function AdminTestPromptPage() {
  const [userId, setUserId] = useState("")
  const [service, setService] = useState<"EXECUWELL" | "VITAAI">("EXECUWELL")
  const [generatedPrompt, setGeneratedPrompt] = useState("")
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false)

  const [testMessage, setTestMessage] = useState("")
  const [aiReply, setAiReply] = useState("")
  const [isLoadingChat, setIsLoadingChat] = useState(false)

  const handlePreviewPrompt = async () => {
    if (!userId.trim()) {
      toast.error("ユーザーIDを入力してください")
      return
    }
    setIsLoadingPrompt(true)
    setGeneratedPrompt("")
    try {
      const resp = await apiClient.request<{ prompt: string }>("/admin/test-prompt", {
        method: "POST",
        body: { userId: userId.trim(), service },
      })
      setGeneratedPrompt(resp.prompt)
    } catch (error: any) {
      toast.error(error?.message || "プロンプト生成に失敗しました")
    } finally {
      setIsLoadingPrompt(false)
    }
  }

  const handleTestChat = async () => {
    if (!userId.trim() || !testMessage.trim()) {
      toast.error("ユーザーIDとメッセージを入力してください")
      return
    }
    setIsLoadingChat(true)
    setAiReply("")
    try {
      const resp = await apiClient.request<{ reply: string }>("/admin/test-chat", {
        method: "POST",
        body: { userId: userId.trim(), service, message: testMessage.trim() },
      })
      setAiReply(resp.reply)
    } catch (error: any) {
      toast.error(error?.message || "テストチャットに失敗しました")
    } finally {
      setIsLoadingChat(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FlaskConical className="w-6 h-6" />
          MyAI プロンプトテスト
        </h1>
        <p className="text-muted-foreground mt-1">
          特定ユーザーのMyAIプロンプトを確認し、テストチャットを実行
        </p>
      </div>

      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle>設定</CardTitle>
          <CardDescription>テスト対象のユーザーIDとサービスを指定</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="userId">ユーザーID（Supabase UID）</Label>
              <Input
                id="userId"
                placeholder="例: abc123-def456-..."
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>サービス</Label>
              <Select value={service} onValueChange={(v) => setService(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXECUWELL">ExecuWell</SelectItem>
                  <SelectItem value="VITAAI">VitaAI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prompt Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            プロンプトプレビュー
          </CardTitle>
          <CardDescription>
            このユーザーに対してMyAIが使うシステムプロンプトのユーザー情報部分
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handlePreviewPrompt} disabled={isLoadingPrompt || !userId.trim()}>
            {isLoadingPrompt ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            プロンプトを生成
          </Button>
          {generatedPrompt && (
            <pre className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap overflow-x-auto max-h-80 border">
              {generatedPrompt}
            </pre>
          )}
        </CardContent>
      </Card>

      {/* Test Chat */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            テストチャット
          </CardTitle>
          <CardDescription>
            指定ユーザーとして1メッセージを送信し、MyAIの応答を確認
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="testMsg">テストメッセージ</Label>
            <Textarea
              id="testMsg"
              placeholder="例: 今日の経営判断について相談したい"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={handleTestChat} disabled={isLoadingChat || !userId.trim() || !testMessage.trim()}>
            {isLoadingChat ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            送信してテスト
          </Button>
          {aiReply && (
            <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap overflow-x-auto max-h-96 border">
              <p className="text-xs font-semibold text-primary mb-2">MyAI 応答：</p>
              {aiReply}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
