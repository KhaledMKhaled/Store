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
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ShipmentWithRelations, Supplier } from "@shared/schema";

export default function ShipmentsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAdmin, canEdit } = useAuth();
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
      toast({ title: "Shipment deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      setDeleteShipment(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting shipment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (value: string | number | null) => {
    if (!value) return "-";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const columns = [
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
      header: "Master Key",
      accessor: "backendMasterKey" as const,
      className: "font-mono text-xs",
    },
    {
      header: "Status",
      accessor: (row: ShipmentWithRelations) => <StatusBadge status={row.status} />,
    },
    {
      header: "Total Price",
      accessor: (row: ShipmentWithRelations) =>
        formatCurrency(row.importingDetails?.totalShipmentPrice || null),
      className: "text-right font-mono",
    },
    {
      header: "Created",
      accessor: (row: ShipmentWithRelations) =>
        row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-",
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
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem onClick={() => navigate(`/shipments/${row.id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(`/shipments/${row.id}/items`)}>
              <Package className="mr-2 h-4 w-4" />
              Shipment Items
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/shipments/${row.id}/importing`)}>
              <FileText className="mr-2 h-4 w-4" />
              Importing Details
            </DropdownMenuItem>
            {row.status === "CUSTOMS_RECEIVED" && (
              <DropdownMenuItem onClick={() => navigate(`/shipments/${row.id}/customs`)}>
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Customs
              </DropdownMenuItem>
            )}
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteShipment(row)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
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
      <div className="space-y-8">
        <PageHeader title="Shipments" description="Manage your imported shipments" />
        <EmptyState
          icon={Ship}
          title="No shipments yet"
          description="Get started by creating your first shipment to track inventory and customs."
          action={
            canEdit
              ? {
                  label: "Create Shipment",
                  onClick: () => navigate("/shipments/new"),
                }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipments"
        description="Manage your imported shipments"
        actions={
          canEdit && (
            <Button asChild data-testid="button-new-shipment">
              <Link href="/shipments/new">
                <Plus className="mr-2 h-4 w-4" />
                New Shipment
              </Link>
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search shipments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-shipments"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="CREATED">Created</SelectItem>
              <SelectItem value="IMPORTING_DETAILS_DONE">Import Details Done</SelectItem>
              <SelectItem value="CUSTOMS_IN_PROGRESS">Customs In Progress</SelectItem>
              <SelectItem value="CUSTOMS_RECEIVED">Customs Received</SelectItem>
            </SelectContent>
          </Select>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-supplier-filter">
              <SelectValue placeholder="All Suppliers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
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
        emptyMessage="No shipments found"
      />

      <ConfirmDialog
        open={!!deleteShipment}
        onOpenChange={(open) => !open && setDeleteShipment(null)}
        title="Delete Shipment"
        description={`Are you sure you want to delete "${deleteShipment?.shipmentName}"? This action cannot be undone and will remove all associated items, importing details, and customs records.`}
        confirmLabel="Delete"
        onConfirm={() => deleteShipment && deleteMutation.mutate(deleteShipment.id)}
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
