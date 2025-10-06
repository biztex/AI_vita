"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Clock } from "lucide-react"

export default function AdminReportsPage() {
  const [dailyHealthReport, setDailyHealthReport] = useState(true)
  const [economicNews, setEconomicNews] = useState(true)

  const handleSave = () => {
    console.log("[v0] Saving report settings:", { dailyHealthReport, economicNews })
    // Mock save - in production, call API
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Report Management</h1>
        <p className="text-muted-foreground">Configure automated reports and notifications</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Health Report */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Health Report</CardTitle>
            <CardDescription>Automated health insights sent to VitaAI users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="daily-health" className="flex flex-col space-y-1">
                <span className="font-medium">Enable Daily Reports</span>
                <span className="text-sm font-normal text-muted-foreground">Send reports every morning at 9:00 AM</span>
              </Label>
              <Switch id="daily-health" checked={dailyHealthReport} onCheckedChange={setDailyHealthReport} />
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Schedule: Daily at 9:00 AM</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Report Includes:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  Personalized health insights
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  Activity recommendations
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  Nutrition tips
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Economic News Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Economic News Summary</CardTitle>
            <CardDescription>Automated business intelligence sent to ExecuWell users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="economic-news" className="flex flex-col space-y-1">
                <span className="font-medium">Enable News Summaries</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Send summaries every morning at 8:00 AM
                </span>
              </Label>
              <Switch id="economic-news" checked={economicNews} onCheckedChange={setEconomicNews} />
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Schedule: Daily at 8:00 AM</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Summary Includes:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  Market trends and analysis
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  Industry news highlights
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  Strategic recommendations
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="mt-6">
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  )
}
