import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bot, Home } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted-foreground/10">
            <Bot className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">404</h1>
          <p className="text-xl text-muted-foreground">ページが見つかりません</p>
        </div>
        <Button onClick={() => navigate("/")} className="gap-2">
          <Home className="h-4 w-4" />
          ホームに戻る
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
