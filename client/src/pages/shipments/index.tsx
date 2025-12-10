import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Eye, Edit, Trash2, Ship, Package, FileText, ClipboardCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ShipmentWithRelations, Supplier } from "@shared/schema";

export default function ShipmentsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAdmin, canEdit } = useAuth();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [deleteShipment, setDeleteShipment] = useState<ShipmentWithRelations | null>(null);

  const { data: shipments, isLoading } = useQuery<{ data: ShipmentWithRelations[]; total: number; pages: number }>({
    queryKey: ["/api/shipments", { page, search, status: statusFilter, supplier: supplierFilter }],
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/shipments/${id}`);
    },
    onSuccess: () => {
      toast({ title: "تم حذف الشحنة بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      setDeleteShipment(null);
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في حذف الشحنة",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (value: string | number | null) => {
    if (!value) return "-";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const columns = [
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
      header: t.shipments.masterKey,
      accessor: "backendMasterKey" as const,
      className: "font-mono text-xs",
    },
    {
      header: t.common.status,
      accessor: (row: ShipmentWithRelations) => <StatusBadge status={row.status} />,
    },
    {
      header: t.common.total,
      accessor: (row: ShipmentWithRelations) =>
        formatCurrency(row.importingDetails?.totalShipmentPrice || null),
      className: "text-left font-mono",
    },
    {
      header: t.shipments.createdAt,
      accessor: (row: ShipmentWithRelations) =>
        row.createdAt ? new Date(row.createdAt).toLocaleDateString("ar-SA") : "-",
    },
    {
      header: "",
      accessor: (row: ShipmentWithRelations) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-actions-${row.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/shipments/${row.id}`)}>
              <Eye className="h-4 w-4" />
              {t.common.view}
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem onClick={() => navigate(`/shipments/${row.id}/edit`)}>
                <Edit className="h-4 w-4" />
                {t.common.edit}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(`/shipments/${row.id}/items`)}>
              <Package className="h-4 w-4" />
              {t.shipments.shipmentItems}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/shipments/${row.id}/importing`)}>
              <FileText className="h-4 w-4" />
              {t.shipments.importingDetails}
            </DropdownMenuItem>
            {row.status === "CUSTOMS_RECEIVED" && (
              <DropdownMenuItem onClick={() => navigate(`/shipments/${row.id}/customs`)}>
                <ClipboardCheck className="h-4 w-4" />
                {t.shipments.customs}
              </DropdownMenuItem>
            )}
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteShipment(row)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  {t.common.delete}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ];

  if (!isLoading && (!shipments?.data || shipments.data.length === 0) && !search && statusFilter === "all") {
    return (
      <div className="space-y-8 p-6">
        <PageHeader title={t.shipments.title} description="إدارة شحناتك المستوردة" />
        <EmptyState
          icon={Ship}
          title={t.shipments.noShipments}
          description="ابدأ بإنشاء أول شحنة لتتبع المخزون والجمارك."
          action={
            canEdit
              ? {
                  label: t.shipments.newShipment,
                  onClick: () => navigate("/shipments/new"),
                }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t.shipments.title}
        description="إدارة شحناتك المستوردة"
        actions={
          canEdit && (
            <Button asChild data-testid="button-new-shipment">
              <Link href="/shipments/new">
                <Plus className="h-4 w-4" />
                {t.shipments.newShipment}
              </Link>
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث في الشحنات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
            data-testid="input-search-shipments"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
              <SelectValue placeholder="جميع الحالات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="CREATED">{t.shipments.statuses.CREATED}</SelectItem>
              <SelectItem value="IMPORTING_DETAILS_DONE">{t.shipments.statuses.IMPORTING_DETAILS_DONE}</SelectItem>
              <SelectItem value="CUSTOMS_IN_PROGRESS">{t.shipments.statuses.CUSTOMS_IN_PROGRESS}</SelectItem>
              <SelectItem value="CUSTOMS_RECEIVED">{t.shipments.statuses.CUSTOMS_RECEIVED}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-supplier-filter">
              <SelectValue placeholder="جميع الموردين" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الموردين</SelectItem>
              {suppliers?.map((supplier) => (
                <SelectItem key={supplier.id} value={String(supplier.id)}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={shipments?.data || []}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        page={page}
        totalPages={shipments?.pages || 1}
        onPageChange={setPage}
        emptyMessage="لم يتم العثور على شحنات"
      />

      <ConfirmDialog
        open={!!deleteShipment}
        onOpenChange={(open) => !open && setDeleteShipment(null)}
        title="حذف الشحنة"
        description={`هل أنت متأكد من حذف "${deleteShipment?.shipmentName}"؟ لا يمكن التراجع عن هذا الإجراء وسيتم إزالة جميع العناصر والتفاصيل المرتبطة.`}
        confirmLabel={t.common.delete}
        onConfirm={() => deleteShipment && deleteMutation.mutate(deleteShipment.id)}
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
