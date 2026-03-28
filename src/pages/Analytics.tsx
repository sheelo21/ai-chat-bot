import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, TrendingUp, Users, Calendar, Clock, BarChart3, PieChart } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ja } from "date-fns/locale";

type ChatMessage = {
  id: string;
  content: string;
  role: string;
  session_id: string;
  created_at: string;
};

type DailyStats = {
  date: string;
  totalMessages: number;
  uniqueSessions: number;
  userMessages: number;
  assistantMessages: number;
};

type KeywordData = {
  keyword: string;
  count: number;
};

type SessionData = {
  session_id: string;
  message_count: number;
  first_message: string;
  created_at: string;
};

const Analytics = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [topKeywords, setTopKeywords] = useState<KeywordData[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const fetchProject = async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .single();
    setProject(data);
  };

  const fetchAnalytics = async () => {
    if (!projectId) return;
    
    // メッセージデータ取得
    const daysAgo = parseInt(period);
    const startDate = subDays(new Date(), daysAgo);
    
    const { data: messagesData } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("project_id", projectId)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (messagesData) {
      setMessages(messagesData as ChatMessage[]);
      
      // 日次統計計算
      const stats = calculateDailyStats(messagesData as ChatMessage[]);
      setDailyStats(stats);
      
      // キーワード分析
      const keywords = extractKeywords(messagesData as ChatMessage[]);
      setTopKeywords(keywords);
      
      // セッション分析
      const sessions = analyzeSessions(messagesData as ChatMessage[]);
      setRecentSessions(sessions);
    }
    
    setLoading(false);
  };

  const calculateDailyStats = (msgs: ChatMessage[]): DailyStats[] => {
    const stats: { [key: string]: DailyStats } = {};
    
    msgs.forEach(msg => {
      const date = format(new Date(msg.created_at), "yyyy-MM-dd");
      if (!stats[date]) {
        stats[date] = {
          date,
          totalMessages: 0,
          uniqueSessions: new Set(),
          userMessages: 0,
          assistantMessages: 0,
        } as any;
      }
      
      stats[date].totalMessages++;
      stats[date].uniqueSessions.add(msg.session_id);
      
      if (msg.role === "user") {
        stats[date].userMessages++;
      } else {
        stats[date].assistantMessages++;
      }
    });
    
    return Object.values(stats).map(stat => ({
      ...stat,
      uniqueSessions: (stat.uniqueSessions as Set<string>).size,
    })).sort((a, b) => a.date.localeCompare(b.date));
  };

  const extractKeywords = (msgs: ChatMessage[]): KeywordData[] => {
    const userMessages = msgs.filter(msg => msg.role === "user");
    const keywordCount: { [key: string]: number } = {};
    
    userMessages.forEach(msg => {
      const words = msg.content
        .toLowerCase()
        .replace(/[^\w\s\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, "")
        .split(/\s+/)
        .filter(word => word.length > 1);
      
      words.forEach(word => {
        keywordCount[word] = (keywordCount[word] || 0) + 1;
      });
    });
    
    return Object.entries(keywordCount)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  };

  const analyzeSessions = (msgs: ChatMessage[]): SessionData[] => {
    const sessionMap: { [key: string]: SessionData } = {};
    
    msgs.forEach(msg => {
      if (!sessionMap[msg.session_id]) {
        const firstMsg = msgs.find(m => m.session_id === msg.session_id && m.role === "user");
        sessionMap[msg.session_id] = {
          session_id: msg.session_id,
          message_count: 0,
          first_message: firstMsg?.content || "",
          created_at: msg.created_at,
        };
      }
      sessionMap[msg.session_id].message_count++;
    });
    
    return Object.values(sessionMap)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);
  };

  useEffect(() => {
    if (user && projectId) {
      fetchProject();
      fetchAnalytics();
    }
  }, [user, projectId, period]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalMessages = messages.length;
  const totalSessions = new Set(messages.map(m => m.session_id)).size;
  const avgMessagesPerSession = totalSessions > 0 ? (totalMessages / totalSessions).toFixed(1) : "0";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/project/${projectId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{project?.name} - 分析</h1>
          </div>
          <div className="flex gap-2">
            {(["7", "30", "90"] as const).map(days => (
              <Button
                key={days}
                variant={period === days ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(days)}
              >
                {days}日間
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* 概要カード */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総メッセージ数</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMessages.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">過去{period}日間</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">セッション数</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSessions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">ユニークユーザー</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均メッセージ数</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgMessagesPerSession}</div>
              <p className="text-xs text-muted-foreground">セッションあたり</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">アクティブ率</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalSessions > 0 ? Math.round((totalMessages / totalSessions) * 10) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">エンゲージメント</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="daily" className="space-y-6">
          <TabsList>
            <TabsTrigger value="daily" className="gap-2">
              <Calendar className="h-4 w-4" />
              日次推移
            </TabsTrigger>
            <TabsTrigger value="keywords" className="gap-2">
              <PieChart className="h-4 w-4" />
              キーワード分析
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-2">
              <Clock className="h-4 w-4" />
              最近のセッション
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <Card>
              <CardHeader>
                <CardTitle>日次統計</CardTitle>
                <CardDescription>メッセージ数とセッション数の推移</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dailyStats.map(stat => (
                    <div key={stat.date} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{format(new Date(stat.date), "MM月dd日", { locale: ja })}</p>
                        <p className="text-sm text-muted-foreground">
                          {stat.userMessages} ユーザーメッセージ / {stat.assistantMessages} AI応答
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{stat.totalMessages}</p>
                        <p className="text-sm text-muted-foreground">{stat.uniqueSessions} セッション</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keywords">
            <Card>
              <CardHeader>
                <CardTitle>頻出キーワード</CardTitle>
                <CardDescription>ユーザーがよく使う言葉トップ20</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topKeywords.map((item, index) => (
                    <div key={item.keyword} className="flex items-center justify-between p-2 rounded">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <span className="font-medium">{item.keyword}</span>
                      </div>
                      <Badge variant="outline">{item.count} 回</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>最近のセッション</CardTitle>
                <CardDescription>最新のチャットセッション詳細</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentSessions.map(session => (
                    <div key={session.session_id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">セッションID: {session.session_id.slice(0, 8)}...</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(session.created_at), "yyyy/MM/dd HH:mm")}
                          </p>
                        </div>
                        <Badge variant="outline">{session.message_count} メッセージ</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        最初の質問: {session.first_message}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Analytics;
