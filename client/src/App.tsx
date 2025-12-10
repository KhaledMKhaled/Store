import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import { I18nProvider } from "@/lib/i18n";
import { Loader2 } from "lucide-react";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Shipments from "@/pages/shipments/index";
import ShipmentForm from "@/pages/shipments/form";
import ShipmentView from "@/pages/shipments/view";
import ShipmentItems from "@/pages/shipments/items";
import ShipmentImporting from "@/pages/shipments/importing";
import ShipmentCustoms from "@/pages/shipments/customs";
import Suppliers from "@/pages/suppliers";
import ItemTypes from "@/pages/item-types";
import Users from "@/pages/users";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/shipments" component={Shipments} />
      <Route path="/shipments/new" component={ShipmentForm} />
      <Route path="/shipments/:id" component={ShipmentView} />
      <Route path="/shipments/:id/edit" component={ShipmentForm} />
      <Route path="/shipments/:id/items" component={ShipmentItems} />
      <Route path="/shipments/:id/importing" component={ShipmentImporting} />
      <Route path="/shipments/:id/customs" component={ShipmentCustoms} />
      <Route path="/suppliers" component={Suppliers} />
      <Route path="/item-types" component={ItemTypes} />
      <Route path="/users" component={Users} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-4 border-b bg-background px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider defaultTheme="system" storageKey="shiptrack-ui-theme">
          <TooltipProvider>
            <AppContent />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
