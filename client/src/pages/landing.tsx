import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ship, Package, FileText, Shield, BarChart3, Users, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";

export default function Landing() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const features = [
    {
      icon: Ship,
      title: "تتبع الشحنات",
      description: "تتبع الشحنات المستوردة من الإنشاء حتى التخليص الجمركي",
    },
    {
      icon: Package,
      title: "إدارة المخزون",
      description: "إدارة عناصر الشحنات مع حساب الكميات والأسعار تلقائياً",
    },
    {
      icon: FileText,
      title: "توثيق الاستيراد",
      description: "تسجيل تفاصيل الاستيراد بما في ذلك العمولات وتكاليف الشحن",
    },
    {
      icon: Shield,
      title: "إدارة الجمارك",
      description: "تتبع حالة الجمارك والرسوم وتفاصيل كل نوع من العناصر",
    },
    {
      icon: BarChart3,
      title: "تقارير شاملة",
      description: "عرض ملخصات الشحنات والتكاليف وبيانات الجمارك",
    },
    {
      icon: Users,
      title: "صلاحيات المستخدمين",
      description: "أدوار المسؤول والمشغل والمشاهد مع الصلاحيات المناسبة",
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiRequest("POST", "/api/local-login", { username, password });
      window.location.href = "/";
    } catch (error: any) {
      toast({
        title: "فشل تسجيل الدخول",
        description: error.message || "اسم المستخدم أو كلمة المرور غير صحيحة",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
              <Ship className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">نظام الشحنات</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
              <div className="text-center lg:text-right">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                  نظام المحاسبة
                  <br />
                  <span className="text-primary">وتتبع المخزون</span>
                </h1>
                <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                  إدارة شحناتك المستوردة، تتبع المخزون، معالجة مستندات الجمارك،
                  وتبسيط سير العمل المحاسبي باستخدام منصتنا الشاملة متعددة المستخدمين.
                </p>
              </div>
              
              <Card className="w-full max-w-md mx-auto lg:mx-0">
                <CardHeader>
                  <CardTitle>{t.auth.signIn}</CardTitle>
                  <CardDescription>أدخل بيانات الاعتماد للوصول إلى النظام</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">اسم المستخدم</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="أدخل اسم المستخدم"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        data-testid="input-username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">كلمة المرور</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="أدخل كلمة المرور"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        data-testid="input-password"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading}
                      data-testid="button-login"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          جاري تسجيل الدخول...
                        </>
                      ) : (
                        t.auth.signIn
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-2xl font-semibold mb-12">
              كل ما تحتاجه لإدارة الشحنات
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="border-0 bg-card shadow-sm">
                  <CardHeader>
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 mb-2">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>نظام الشحنات - نظام المحاسبة وتتبع المخزون</p>
        </div>
      </footer>
    </div>
  );
}
