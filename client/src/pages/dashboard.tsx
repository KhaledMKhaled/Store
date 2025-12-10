import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ship, Package, DollarSign, FileText, Plus, ArrowLeft } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { ShipmentWithRelations, Customs } from "@shared/schema";

interface DashboardStats {
  totalShipments: number;
  totalCtn: number;
  totalPcs: number;
  totalValue: number;
  shipmentsByStatus: Record<string, number>;
}

interface CustomsSummary extends Customs {
  shipmentName: string;
  shipmentNumber: string;
  totalPaidCustoms: number;
  totalPaidTakhreg: number;
}

export default function Dashboard() {
  const { t } = useTranslation();
  
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentShipments, isLoading: shipmentsLoading } = useQuery<ShipmentWithRelations[]>({
    queryKey: ["/api/shipments", { limit: 5 }],
  });

  const { data: customsSummary, isLoading: customsLoading } = useQuery<CustomsSummary[]>({
    queryKey: ["/api/customs/summary"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("ar-SA").format(value);
  };

  const shipmentColumns = [
    {
      header: t.shipments.title,
      accessor: (row: ShipmentWithRelations) => (
        <div>
          <p className="font-medium">{row.shipmentName}</p>
          <p className="text-xs text-muted-foreground">{row.shipmentNumber}</p>
        </div>
      ),
    },
    {
      header: t.common.status,
      accessor: (row: ShipmentWithRelations) => <StatusBadge status={row.status} />,
    },
    {
      header: t.common.date,
      accessor: (row: ShipmentWithRelations) =>
        row.createdAt ? new Date(row.createdAt).toLocaleDateString("ar-SA") : "-",
    },
    {
      header: "",
      accessor: (row: ShipmentWithRelations) => (
        <Link href={`/shipments/${row.id}`}>
          <Button variant="ghost" size="sm" data-testid={`button-view-shipment-${row.id}`}>
            {t.common.view}
            <ArrowLeft className="h-3 w-3" />
          </Button>
        </Link>
      ),
      className: "text-left",
    },
  ];

  const customsColumns = [
    {
      header: t.shipments.title,
      accessor: (row: CustomsSummary) => (
        <div>
          <p className="font-medium">{row.shipmentName}</p>
          <p className="text-xs text-muted-foreground">{row.shipmentNumber}</p>
        </div>
      ),
    },
    {
      header: t.customs.billDate,
      accessor: (row: CustomsSummary) =>
        row.billDate ? new Date(row.billDate).toLocaleDateString("ar-SA") : "-",
    },
    {
      header: t.customs.totalPiecesAdjusted,
      accessor: (row: CustomsSummary) => formatNumber(row.totalPiecesAdjusted),
      className: "text-left font-mono",
    },
    {
      header: t.customs.paidCustoms,
      accessor: (row: CustomsSummary) => formatCurrency(row.totalPaidCustoms || 0),
      className: "text-left font-mono",
    },
    {
      header: t.customs.takhreg,
      accessor: (row: CustomsSummary) => formatCurrency(row.totalPaidTakhreg || 0),
      className: "text-left font-mono",
    },
  ];

  return (
    <div className="space-y-8 p-6">
      <PageHeader
        title={t.dashboard.title}
        description="نظرة عامة على شحناتك ومخزونك"
        actions={
          <Button asChild data-testid="button-new-shipment">
            <Link href="/shipments/new">
              <Plus className="h-4 w-4" />
              {t.shipments.newShipment}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t.dashboard.totalShipments}
          value={statsLoading ? "..." : formatNumber(stats?.totalShipments || 0)}
          icon={Ship}
        />
        <StatCard
          title={t.dashboard.totalContainers}
          value={statsLoading ? "..." : formatNumber(stats?.totalCtn || 0)}
          icon={Package}
        />
        <StatCard
          title={t.dashboard.totalPieces}
          value={statsLoading ? "..." : formatNumber(stats?.totalPcs || 0)}
          icon={Package}
        />
        <StatCard
          title={t.dashboard.totalValue}
          value={statsLoading ? "..." : formatCurrency(stats?.totalValue || 0)}
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg font-semibold">{t.dashboard.recentShipments}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/shipments" data-testid="link-view-all-shipments">
                عرض الكل
                <ArrowLeft className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <DataTable
              columns={shipmentColumns}
              data={recentShipments || []}
              isLoading={shipmentsLoading}
              rowKey={(row) => row.id}
              emptyMessage="لا توجد شحنات بعد"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg font-semibold">ملخص الجمارك</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DataTable
              columns={customsColumns}
              data={customsSummary || []}
              isLoading={customsLoading}
              rowKey={(row) => row.id}
              emptyMessage="لا توجد سجلات جمارك بعد"
            />
          </CardContent>
        </Card>
      </div>

      {stats?.shipmentsByStatus && Object.keys(stats.shipmentsByStatus).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{t.dashboard.shipmentsByStatus}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(stats.shipmentsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-4 rounded-md bg-muted/50">
                  <StatusBadge status={status as any} />
                  <span className="text-2xl font-semibold font-mono">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
