import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship, Package, FileText, Shield, BarChart3, Users } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: Ship,
    title: "Shipment Tracking",
    description: "Track imported shipments from creation through customs clearance",
  },
  {
    icon: Package,
    title: "Inventory Management",
    description: "Manage shipment items with automatic quantity and price calculations",
  },
  {
    icon: FileText,
    title: "Import Documentation",
    description: "Record importing details including commissions and shipping costs",
  },
  {
    icon: Shield,
    title: "Customs Management",
    description: "Track customs status, fees, and per-item type breakdowns",
  },
  {
    icon: BarChart3,
    title: "Comprehensive Reports",
    description: "View summaries of shipments, costs, and customs data",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description: "Admin, Operator, and Viewer roles with appropriate permissions",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
              <Ship className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">ShipTrack</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Accounting & Inventory
              <br />
              <span className="text-primary">Tracking System</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Manage your imported shipments, track inventory, handle customs documentation,
              and streamline your accounting workflow with our comprehensive multi-user platform.
            </p>
            <div className="mt-10">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/api/login">Get Started</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-2xl font-semibold mb-12">
              Everything you need to manage shipments
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

        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-semibold mb-4">Ready to streamline your workflow?</h2>
            <p className="text-muted-foreground mb-8">
              Sign in to start managing your shipments and inventory today.
            </p>
            <Button size="lg" asChild data-testid="button-sign-in-footer">
              <a href="/api/login">Sign In Now</a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>ShipTrack - Accounting & Inventory Tracking System</p>
        </div>
      </footer>
    </div>
  );
}
