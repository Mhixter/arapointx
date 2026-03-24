import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldOff, MessageCircle } from "lucide-react";

export default function SuspendedPage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const reason = params.get("reason") || "Your account has been suspended by the administrator.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full border-red-200 shadow-lg">
        <CardContent className="pt-8 pb-8 text-center space-y-5">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <ShieldOff className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Account Suspended</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{decodeURIComponent(reason)}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-xs text-red-700 border border-red-100">
            If you believe this is a mistake, please contact our support team for assistance.
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => window.location.href = "mailto:support@arapoint.com"}
            >
              <MessageCircle className="h-4 w-4" />
              Contact Support
            </Button>
            <Button
              variant="ghost"
              className="w-full text-sm text-muted-foreground"
              onClick={() => navigate("/login")}
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
