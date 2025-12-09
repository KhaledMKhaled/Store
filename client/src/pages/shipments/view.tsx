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
  ArrowLeft,
  Edit,
  Package,
  FileText,
  ClipboardCheck,
  Loader2,
  ArrowRight,
  Play,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ShipmentWithRelations } from "@shared/schema";

export default function ShipmentView() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAdmin, canEdit } = useAuth();

  const { data: shipment, isLoading } = useQuery<ShipmentWithRelations>({
    queryKey: ["/api/shipments", id],
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return await apiRequest("PATCH", `/api/shipments/${id}/status`, { status: newStatus });
    },
    onSuccess: () => {
      toast({ title: "Status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments", id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (value: string | number | null) => {
    if (!value) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const formatNumber = (value: number | null) => {
    if (!value) return "0";
    return new Intl.NumberFormat("en-US").format(value);
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
        <p className="text-muted-foreground">Shipment not found</p>
        <Button variant="link" onClick={() => navigate("/shipments")}>
          Back to Shipments
        </Button>
      </div>
    );
  }

  const getWorkflowSteps = () => {
    const statusOrder = ["CREATED", "IMPORTING_DETAILS_DONE", "CUSTOMS_IN_PROGRESS", "CUSTOMS_RECEIVED"];
    const currentIndex = statusOrder.indexOf(shipment.status);

    return [
      { id: "shipment", label: "Shipment", status: currentIndex >= 0 ? "completed" : "current" },
      { id: "items", label: "Items", status: currentIndex >= 0 ? "completed" : "upcoming" },
      {
        id: "importing",
        label: "Importing",
        status: currentIndex >= 1 ? "completed" : currentIndex === 0 ? "current" : "upcoming",
      },
      {
        id: "customs",
        label: "Customs",
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
        return "Mark Import Details Done";
      case "IMPORTING_DETAILS_DONE":
        return "Start Customs Processing";
      case "CUSTOMS_IN_PROGRESS":
        return "Mark Customs Received";
      default:
        return null;
    }
  };

  const itemsCount = shipment.shipmentItems?.length || 0;
  const totalCtn = shipment.shipmentItems?.reduce((sum, item) => sum + (item.ctn || 0), 0) || 0;
  const totalPcs = shipment.shipmentItems?.reduce((sum, item) => sum + (item.cou || 0), 0) || 0;
  const totalValue = shipment.importingDetails?.totalShipmentPrice || "0";

  return (
    <div className="space-y-6">
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
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {canEdit && (
              <Button variant="outline" asChild data-testid="button-edit">
                <Link href={`/shipments/${id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : shipment.status === "CUSTOMS_IN_PROGRESS" ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {getNextStatusLabel()}
          </Button>
        )}
      </div>

      <WorkflowSteps steps={getWorkflowSteps()} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Items" value={formatNumber(itemsCount)} icon={Package} />
        <StatCard title="Total CTN" value={formatNumber(totalCtn)} icon={Package} />
        <StatCard title="Total PCS" value={formatNumber(totalPcs)} icon={Package} />
        <StatCard title="Total Value" value={formatCurrency(totalValue)} icon={FileText} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="hover-elevate cursor-pointer" onClick={() => navigate(`/shipments/${id}/items`)}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Shipment Items</CardTitle>
                <CardDescription>{itemsCount} items</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full justify-between" data-testid="button-view-items">
              View Items
              <ArrowRight className="h-4 w-4" />
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
                <CardTitle className="text-base">Importing Details</CardTitle>
                <CardDescription>
                  {shipment.importingDetails ? "Configured" : "Not configured"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full justify-between" data-testid="button-view-importing">
              View Details
              <ArrowRight className="h-4 w-4" />
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
                <CardTitle className="text-base">Customs</CardTitle>
                <CardDescription>
                  {shipment.status === "CUSTOMS_RECEIVED"
                    ? "Available"
                    : shipment.status === "CUSTOMS_IN_PROGRESS"
                    ? "In progress"
                    : "Not started"}
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
              {shipment.status === "CUSTOMS_RECEIVED" ? "View Customs" : "Not Available Yet"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shipment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created By</p>
              <p className="text-sm">
                {shipment.createdBy
                  ? `${shipment.createdBy.firstName || ""} ${shipment.createdBy.lastName || ""}`.trim() ||
                    shipment.createdBy.email
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created At</p>
              <p className="text-sm">
                {shipment.createdAt
                  ? new Date(shipment.createdAt).toLocaleString()
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated By</p>
              <p className="text-sm">
                {shipment.updatedBy
                  ? `${shipment.updatedBy.firstName || ""} ${shipment.updatedBy.lastName || ""}`.trim() ||
                    shipment.updatedBy.email
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated At</p>
              <p className="text-sm">
                {shipment.updatedAt
                  ? new Date(shipment.updatedAt).toLocaleString()
                  : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
