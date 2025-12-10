import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { WorkflowSteps } from "@/components/workflow-steps";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  Edit,
  Package,
  FileText,
  ClipboardCheck,
  Loader2,
  ArrowLeft,
  Play,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ShipmentWithRelations } from "@shared/schema";

export default function ShipmentView() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAdmin, canEdit } = useAuth();
  const { t } = useTranslation();

  const { data: shipment, isLoading } = useQuery<ShipmentWithRelations>({
    queryKey: ["/api/shipments", id],
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return await apiRequest("PATCH", `/api/shipments/${id}/status`, { status: newStatus });
    },
    onSuccess: () => {
      toast({ title: "تم تحديث الحالة بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments", id] });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في تحديث الحالة",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (value: string | number | null) => {
    if (!value) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const formatNumber = (value: number | null) => {
    if (!value) return "0";
    return new Intl.NumberFormat("ar-SA").format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">الشحنة غير موجودة</p>
        <Button variant="link" onClick={() => navigate("/shipments")}>
          {t.common.back} إلى {t.shipments.title}
        </Button>
      </div>
    );
  }

  const getWorkflowSteps = () => {
    const statusOrder = ["CREATED", "IMPORTING_DETAILS_DONE", "CUSTOMS_IN_PROGRESS", "CUSTOMS_RECEIVED"];
    const currentIndex = statusOrder.indexOf(shipment.status);

    return [
      { id: "shipment", label: t.shipments.workflow.shipment, status: currentIndex >= 0 ? "completed" : "current" },
      { id: "items", label: t.shipments.workflow.items, status: currentIndex >= 0 ? "completed" : "upcoming" },
      {
        id: "importing",
        label: t.shipments.workflow.importing,
        status: currentIndex >= 1 ? "completed" : currentIndex === 0 ? "current" : "upcoming",
      },
      {
        id: "customs",
        label: t.shipments.workflow.customsStep,
        status: currentIndex >= 3 ? "completed" : currentIndex >= 2 ? "current" : "upcoming",
      },
    ] as const;
  };

  const canAdvanceStatus = () => {
    if (!canEdit) return false;
    if (shipment.status === "CUSTOMS_RECEIVED") return false;
    if (shipment.status === "CUSTOMS_IN_PROGRESS" && !isAdmin) return false;
    return true;
  };

  const getNextStatus = () => {
    switch (shipment.status) {
      case "CREATED":
        return "IMPORTING_DETAILS_DONE";
      case "IMPORTING_DETAILS_DONE":
        return "CUSTOMS_IN_PROGRESS";
      case "CUSTOMS_IN_PROGRESS":
        return "CUSTOMS_RECEIVED";
      default:
        return null;
    }
  };

  const getNextStatusLabel = () => {
    switch (shipment.status) {
      case "CREATED":
        return t.shipments.actions.markImportDetailsDone;
      case "IMPORTING_DETAILS_DONE":
        return t.shipments.actions.startCustomsProcessing;
      case "CUSTOMS_IN_PROGRESS":
        return t.shipments.actions.markCustomsReceived;
      default:
        return null;
    }
  };

  const itemsCount = shipment.shipmentItems?.length || 0;
  const totalCtn = shipment.shipmentItems?.reduce((sum, item) => sum + (item.ctn || 0), 0) || 0;
  const totalPcs = shipment.shipmentItems?.reduce((sum, item) => sum + (item.cou || 0), 0) || 0;
  const totalValue = shipment.importingDetails?.totalShipmentPrice || "0";

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={shipment.shipmentName}
        description={
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm">{shipment.shipmentNumber}</span>
            <span className="text-muted-foreground">|</span>
            <span className="font-mono text-xs">{shipment.backendMasterKey}</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" onClick={() => navigate("/shipments")} data-testid="button-back">
              <ArrowRight className="h-4 w-4" />
              {t.common.back}
            </Button>
            {canEdit && (
              <Button variant="outline" asChild data-testid="button-edit">
                <Link href={`/shipments/${id}/edit`}>
                  <Edit className="h-4 w-4" />
                  {t.common.edit}
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="flex items-center justify-between">
        <StatusBadge status={shipment.status} />
        {canAdvanceStatus() && getNextStatus() && (
          <Button
            onClick={() => statusMutation.mutate(getNextStatus()!)}
            disabled={statusMutation.isPending}
            data-testid="button-advance-status"
          >
            {statusMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : shipment.status === "CUSTOMS_IN_PROGRESS" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {getNextStatusLabel()}
          </Button>
        )}
      </div>

      <WorkflowSteps steps={getWorkflowSteps()} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t.common.items} value={formatNumber(itemsCount)} icon={Package} />
        <StatCard title={t.items.totalCtn} value={formatNumber(totalCtn)} icon={Package} />
        <StatCard title={t.items.totalPcs} value={formatNumber(totalPcs)} icon={Package} />
        <StatCard title={t.dashboard.totalValue} value={formatCurrency(totalValue)} icon={FileText} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="hover-elevate cursor-pointer" onClick={() => navigate(`/shipments/${id}/items`)}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{t.shipments.shipmentItems}</CardTitle>
                <CardDescription>{itemsCount} {t.common.items}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full justify-between" data-testid="button-view-items">
              {t.common.view} {t.common.items}
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer" onClick={() => navigate(`/shipments/${id}/importing`)}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base">{t.shipments.importingDetails}</CardTitle>
                <CardDescription>
                  {shipment.importingDetails ? t.importing.configured : t.importing.notConfigured}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full justify-between" data-testid="button-view-importing">
              {t.common.view} التفاصيل
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card
          className={`${shipment.status === "CUSTOMS_RECEIVED" ? "hover-elevate cursor-pointer" : "opacity-60"}`}
          onClick={() => shipment.status === "CUSTOMS_RECEIVED" && navigate(`/shipments/${id}/customs`)}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-500/10">
                <ClipboardCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-base">{t.shipments.customs}</CardTitle>
                <CardDescription>
                  {shipment.status === "CUSTOMS_RECEIVED"
                    ? t.customs.available
                    : shipment.status === "CUSTOMS_IN_PROGRESS"
                    ? t.customs.inProgress
                    : t.customs.notStarted}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              className="w-full justify-between"
              disabled={shipment.status !== "CUSTOMS_RECEIVED"}
              data-testid="button-view-customs"
            >
              {shipment.status === "CUSTOMS_RECEIVED" ? t.customs.viewCustoms : t.customs.notAvailableYet}
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات الشحنة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t.shipments.createdBy}</p>
              <p className="text-sm">
                {shipment.createdBy
                  ? `${shipment.createdBy.firstName || ""} ${shipment.createdBy.lastName || ""}`.trim() ||
                    shipment.createdBy.email
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t.shipments.createdAt}</p>
              <p className="text-sm">
                {shipment.createdAt
                  ? new Date(shipment.createdAt).toLocaleString("ar-SA")
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t.shipments.updatedBy}</p>
              <p className="text-sm">
                {shipment.updatedBy
                  ? `${shipment.updatedBy.firstName || ""} ${shipment.updatedBy.lastName || ""}`.trim() ||
                    shipment.updatedBy.email
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t.shipments.updatedAt}</p>
              <p className="text-sm">
                {shipment.updatedAt
                  ? new Date(shipment.updatedAt).toLocaleString("ar-SA")
                  : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
