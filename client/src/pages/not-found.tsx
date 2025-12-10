import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold">404 الصفحة غير موجودة</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            عذراً، الصفحة التي تبحث عنها غير موجودة.
          </p>

          <Button asChild className="mt-6 w-full">
            <Link href="/">
              <Home className="h-4 w-4" />
              العودة للصفحة الرئيسية
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
