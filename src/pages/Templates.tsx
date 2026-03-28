import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Bot, Briefcase, ShoppingBag, GraduationCap, Heart, Wrench } from "lucide-react";

type Template = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  ai_character: string;
  welcome_message: string;
  primary_color: string;
  suggested_urls: string[];
};

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "customer-support",
    name: "カスタマーサポート",
    description: "一般的な顧客対応用のチャットボット。製品・サービスに関する質問に丁寧に回答します。",
    category: "business",
    icon: "Briefcase",
    ai_character: "あなたは親切で丁寧なカスタマーサポート担当者です。お客様の質問に分かりやすく、丁寧にお答えください。製品やサービスに関する詳細な情報を提供し、お客様が満足するまでサポートします。",
    welcome_message: "こんにちは！ご質問をお聞かせください。製品やサービスについて、何でもお答えします。",
    primary_color: "#0ea5e9",
    suggested_urls: ["https://example.com/faq", "https://example.com/products", "https://example.com/contact"]
  },
  {
    id: "ecommerce",
    name: "ECサイト",
    description: "オンラインストア向け。商品検索、注文状況、配送に関する質問に対応します。",
    category: "business", 
    icon: "ShoppingBag",
    ai_character: "あなたはECサイトのアシスタントです。商品の検索、在庫状況、注文履歴、配送状況などに関するお問い合わせに対応します。お客様がスムーズに買い物ができるようサポートしてください。",
    welcome_message: "ようこそ！商品検索やご注文に関するご質問はお気軽にどうぞ。",
    primary_color: "#10b981",
    suggested_urls: ["https://example.com/products", "https://example.com/help", "https://example.com/shipping"]
  },
  {
    id: "education",
    name: "教育機関",
    description: "学校や塾向け。授業内容、課題、スケジュールに関する質問に対応します。",
    category: "education",
    icon: "GraduationCap",
    ai_character: "あなたは教育機関のアシスタントです。授業内容、課題提出、試験日程、学校行事などに関する質問に丁寧にお答えします。生徒さんや保護者の方々が安心して学習できるようサポートしてください。",
    welcome_message: "こんにちは！学校に関するご質問がありましたら、何でもお聞きください。",
    primary_color: "#8b5cf6",
    suggested_urls: ["https://example.com/curriculum", "https://example.com/schedule", "https://example.com/announcements"]
  },
  {
    id: "healthcare",
    name: "医療・ヘルスケア",
    description: "病院やクリニック向け。診療時間、予約、一般的な健康相談に対応します。",
    category: "healthcare",
    icon: "Heart",
    ai_character: "あなたは医療機関の受付アシスタントです。診療時間、予約方法、各科の案内などについてお答えします。ただし、医学的な診断や治療の提案は行わず、必ず医師の診察を受けるよう案内してください。",
    welcome_message: "いらっしゃいませ。診療のご予約や施設に関するご質問をお聞かせください。",
    primary_color: "#ef4444",
    suggested_urls: ["https://example.com/departments", "https://example.com/access", "https://example.com/reservation"]
  },
  {
    id: "technical",
    name: "技術サポート",
    description: "IT・技術サポート向け。トラブルシューティング、マニュアル、FAQに対応します。",
    category: "technical",
    icon: "Wrench",
    ai_character: "あなたは技術サポートの専門家です。ソフトウェアやハードウェアのトラブル、使い方の質問、エラー解決などについて、分かりやすく具体的にご案内します。初心者にも理解できるよう丁寧に説明してください。",
    welcome_message: "技術サポートです。システムの不具合や使い方について、お気軽にご相談ください。",
    primary_color: "#f59e0b",
    suggested_urls: ["https://example.com/manual", "https://example.com/faq", "https://example.com/troubleshooting"]
  }
];

const Templates = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const handleCreateFromTemplate = async (template: Template) => {
    setSelectedTemplate(template);
    setProjectName(`${template.name}のプロジェクト`);
    setProjectDescription(template.description);
    setDialogOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTemplate) return;
    setCreating(true);

    const { error } = await supabase.from("projects").insert({
      name: projectName,
      description: projectDescription,
      user_id: user.id,
      target_urls: selectedTemplate.suggested_urls,
      ai_character: selectedTemplate.ai_character,
      welcome_message: selectedTemplate.welcome_message,
      primary_color: selectedTemplate.primary_color,
    });

    setCreating(false);
    if (error) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "プロジェクトを作成しました" });
      setDialogOpen(false);
      setSelectedTemplate(null);
      setProjectName("");
      setProjectDescription("");
      navigate("/dashboard");
    }
  };

  const getIcon = (iconName: string) => {
    const icons: { [key: string]: any } = {
      Briefcase,
      ShoppingBag,
      GraduationCap,
      Heart,
      Wrench,
      Bot
    };
    return icons[iconName] || Bot;
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">プロジェクトテンプレート</h1>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold mb-2">テンプレートからプロジェクトを作成</h2>
          <p className="text-muted-foreground">
            用途に合わせたテンプレートを選択して、簡単にチャットボットを始めましょう
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const Icon = getIcon(template.icon);
            return (
              <Card key={template.id} className="group cursor-pointer transition-all hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div 
                      className="flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ backgroundColor: template.primary_color + "20" }}
                    >
                      <Icon 
                        className="h-6 w-6" 
                        style={{ color: template.primary_color }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1">ウェルカムメッセージ例:</p>
                      <p className="text-sm text-muted-foreground italic">
                        "{template.welcome_message}"
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">推奨URL ({template.suggested_urls.length}件):</p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {template.suggested_urls.slice(0, 2).map((url, i) => (
                          <div key={i} className="truncate">• {url}</div>
                        ))}
                        {template.suggested_urls.length > 2 && (
                          <div>• 他{template.suggested_urls.length - 2}件...</div>
                        )}
                      </div>
                    </div>
                    <Button 
                      className="w-full mt-4"
                      onClick={() => handleCreateFromTemplate(template)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      このテンプレートで作成
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>プロジェクト作成</DialogTitle>
            </DialogHeader>
            {selectedTemplate && (
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm font-medium">{selectedTemplate.name}テンプレート</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    AIキャラクター、ウェルカムメッセージ、推奨URLが設定されます
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>プロジェクト名</Label>
                  <Input 
                    value={projectName} 
                    onChange={(e) => setProjectName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>説明</Label>
                  <Textarea 
                    value={projectDescription} 
                    onChange={(e) => setProjectDescription(e.target.value)} 
                  />
                </div>
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? "作成中..." : "プロジェクトを作成"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Templates;
