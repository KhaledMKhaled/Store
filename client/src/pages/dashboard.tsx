import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ship, Package, DollarSign, FileText, Plus, ArrowRight } from "lucide-react";
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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  const shipmentColumns = [
    {
      header: "Shipment",
      accessor: (row: ShipmentWithRelations) => (
        <div>
          <p className="font-medium">{row.shipmentName}</p>
          <p className="text-xs text-muted-foreground">{row.shipmentNumber}</p>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (row: ShipmentWithRelations) => <StatusBadge status={row.status} />,
    },
    {
      header: "Created",
      accessor: (row: ShipmentWithRelations) =>
        row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-",
    },
    {
      header: "",
      accessor: (row: ShipmentWithRelations) => (
        <Link href={`/shipments/${row.id}`}>
          <Button variant="ghost" size="sm" data-testid={`button-view-shipment-${row.id}`}>
            View
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      ),
      className: "text-right",
    },
  ];

  const customsColumns = [
    {
      header: "Shipment",
      accessor: (row: CustomsSummary) => (
        <div>
          <p className="font-medium">{row.shipmentName}</p>
          <p className="text-xs text-muted-foreground">{row.shipmentNumber}</p>
        </div>
      ),
    },
    {
      header: "Bill Date",
      accessor: (row: CustomsSummary) =>
        row.billDate ? new Date(row.billDate).toLocaleDateString() : "-",
    },
    {
      header: "Pieces",
      accessor: (row: CustomsSummary) => formatNumber(row.totalPiecesAdjusted),
      className: "text-right font-mono",
    },
    {
      header: "Customs Paid",
      accessor: (row: CustomsSummary) => formatCurrency(row.totalPaidCustoms || 0),
      className: "text-right font-mono",
    },
    {
      header: "Takhreg",
      accessor: (row: CustomsSummary) => formatCurrency(row.totalPaidTakhreg || 0),
      className: "text-right font-mono",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your shipments and inventory"
        actions={
          <Button asChild data-testid="button-new-shipment">
            <Link href="/shipments/new">
              <Plus className="mr-2 h-4 w-4" />
              New Shipment
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Shipments"
          value={statsLoading ? "..." : formatNumber(stats?.totalShipments || 0)}
          icon={Ship}
        />
        <StatCard
          title="Total CTN"
          value={statsLoading ? "..." : formatNumber(stats?.totalCtn || 0)}
          icon={Package}
        />
        <StatCard
          title="Total PCS"
          value={statsLoading ? "..." : formatNumber(stats?.totalPcs || 0)}
          icon={Package}
        />
        <StatCard
          title="Total Value"
          value={statsLoading ? "..." : formatCurrency(stats?.totalValue || 0)}
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg font-semibold">Recent Shipments</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/shipments" data-testid="link-view-all-shipments">
                View All
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <DataTable
              columns={shipmentColumns}
              data={recentShipments || []}
              isLoading={shipmentsLoading}
              rowKey={(row) => row.id}
              emptyMessage="No shipments yet"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg font-semibold">Customs Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DataTable
              columns={customsColumns}
              data={customsSummary || []}
              isLoading={customsLoading}
              rowKey={(row) => row.id}
              emptyMessage="No customs records yet"
            />
          </CardContent>
        </Card>
      </div>

      {stats?.shipmentsByStatus && Object.keys(stats.shipmentsByStatus).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Shipments by Status</CardTitle>
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
