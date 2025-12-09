import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { WorkflowSteps } from "@/components/workflow-steps";
import { StatCard } from "@/components/stat-card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Save,
  Loader2,
  Package,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Shipment, ShipmentItemWithRelations, Supplier, ItemType } from "@shared/schema";

const itemSchema = z.object({
  id: z.number().optional(),
  supplierId: z.number().min(1, "Required"),
  itemTypeId: z.number().min(1, "Required"),
  itemPhotoUrl: z.string().optional(),
  ctn: z.number().min(0, "Must be >= 0"),
  pcsPerCtn: z.number().min(0, "Must be >= 0"),
  pri: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Must be >= 0"),
});

const formSchema = z.object({
  items: z.array(itemSchema),
});

type FormData = z.infer<typeof formSchema>;

const quickAddSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export default function ShipmentItems() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { canEdit } = useAuth();
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [quickAddType, setQuickAddType] = useState<"supplier" | "itemType" | null>(null);

  const { data: shipment, isLoading: shipmentLoading } = useQuery<Shipment>({
    queryKey: ["/api/shipments", id],
  });

  const { data: items, isLoading: itemsLoading } = useQuery<ShipmentItemWithRelations[]>({
    queryKey: ["/api/shipments", id, "items"],
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: itemTypes } = useQuery<ItemType[]>({
    queryKey: ["/api/item-types"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { items: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const quickAddForm = useForm({
    resolver: zodResolver(quickAddSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (items && items.length > 0) {
      form.reset({
        items: items.map((item) => ({
          id: item.id,
          supplierId: item.supplierId,
          itemTypeId: item.itemTypeId,
          itemPhotoUrl: item.itemPhotoUrl || "",
          ctn: item.ctn,
          pcsPerCtn: item.pcsPerCtn,
          pri: String(item.pri),
        })),
      });
    }
  }, [items, form]);

  const watchedItems = form.watch("items");

  const totals = useMemo(() => {
    return watchedItems.reduce(
      (acc, item) => {
        const ctn = item.ctn || 0;
        const pcsPerCtn = item.pcsPerCtn || 0;
        const pri = parseFloat(item.pri || "0") || 0;
        const cou = ctn * pcsPerCtn;
        const total = cou * pri;
        return {
          totalCtn: acc.totalCtn + ctn,
          totalPcs: acc.totalPcs + cou,
          totalPrice: acc.totalPrice + total,
        };
      },
      { totalCtn: 0, totalPcs: 0, totalPrice: 0 }
    );
  }, [watchedItems]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const itemsWithCalculations = data.items.map((item) => {
        const ctn = item.ctn || 0;
        const pcsPerCtn = item.pcsPerCtn || 0;
        const pri = parseFloat(item.pri || "0") || 0;
        const cou = ctn * pcsPerCtn;
        const total = cou * pri;
        return {
          ...item,
          cou,
          total: total.toFixed(2),
          pri: pri.toFixed(2),
          shipmentId: parseInt(id!),
        };
      });
      return await apiRequest("PUT", `/api/shipments/${id}/items`, { items: itemsWithCalculations });
    },
    onSuccess: () => {
      toast({ title: "Items saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments", id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments", id] });
    },
    onError: (error: Error) => {
      toast({ title: "Error saving items", description: error.message, variant: "destructive" });
    },
  });

  const quickAddMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const endpoint = quickAddType === "supplier" ? "/api/suppliers" : "/api/item-types";
      return await apiRequest("POST", endpoint, data);
    },
    onSuccess: () => {
      toast({ title: `${quickAddType === "supplier" ? "Supplier" : "Item Type"} created` });
      queryClient.invalidateQueries({
        queryKey: [quickAddType === "supplier" ? "/api/suppliers" : "/api/item-types"],
      });
      setQuickAddType(null);
      quickAddForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error creating", description: error.message, variant: "destructive" });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  const calculateRowValues = (index: number) => {
    const item = watchedItems[index];
    if (!item) return { cou: 0, total: 0 };
    const ctn = item.ctn || 0;
    const pcsPerCtn = item.pcsPerCtn || 0;
    const pri = parseFloat(item.pri || "0") || 0;
    const cou = ctn * pcsPerCtn;
    const total = cou * pri;
    return { cou, total };
  };

  const isLoading = shipmentLoading || itemsLoading;

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

  const workflowSteps = [
    { id: "shipment", label: "Shipment", status: "completed" as const },
    { id: "items", label: "Items", status: "current" as const },
    { id: "importing", label: "Importing", status: "upcoming" as const },
    { id: "customs", label: "Customs", status: "upcoming" as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipment Items"
        description={`${shipment.shipmentName} - ${shipment.shipmentNumber}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate(`/shipments/${id}`)} data-testid="button-back">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        }
      />

      <WorkflowSteps steps={workflowSteps} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total CTN" value={formatNumber(totals.totalCtn)} icon={Package} />
        <StatCard title="Total PCS" value={formatNumber(totals.totalPcs)} icon={Package} />
        <StatCard title="Total Price" value={formatCurrency(totals.totalPrice)} icon={DollarSign} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Items ({fields.length})</CardTitle>
          {canEdit && (
            <Button
              size="sm"
              onClick={() =>
                append({ supplierId: 0, itemTypeId: 0, itemPhotoUrl: "", ctn: 0, pcsPerCtn: 0, pri: "0" })
              }
              data-testid="button-add-item"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))}>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Supplier</TableHead>
                      <TableHead className="w-[180px]">Item Type</TableHead>
                      <TableHead className="w-[100px] text-right">CTN</TableHead>
                      <TableHead className="w-[100px] text-right">PCS/CTN</TableHead>
                      <TableHead className="w-[100px] text-right">COU</TableHead>
                      <TableHead className="w-[120px] text-right">Price</TableHead>
                      <TableHead className="w-[140px] text-right">Total</TableHead>
                      {canEdit && <TableHead className="w-[60px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canEdit ? 8 : 7} className="h-24 text-center">
                          <p className="text-muted-foreground">No items yet. Click "Add Item" to get started.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      fields.map((field, index) => {
                        const { cou, total } = calculateRowValues(index);
                        return (
                          <TableRow key={field.id} data-testid={`item-row-${index}`}>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.supplierId`}
                                  render={({ field }) => (
                                    <Select
                                      value={String(field.value || "")}
                                      onValueChange={(v) => field.onChange(parseInt(v))}
                                      disabled={!canEdit}
                                    >
                                      <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="Select" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {suppliers?.map((s) => (
                                          <SelectItem key={s.id} value={String(s.id)}>
                                            {s.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                                {canEdit && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setQuickAddType("supplier")}
                                    className="h-8 w-8 shrink-0"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.itemTypeId`}
                                  render={({ field }) => (
                                    <Select
                                      value={String(field.value || "")}
                                      onValueChange={(v) => field.onChange(parseInt(v))}
                                      disabled={!canEdit}
                                    >
                                      <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="Select" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {itemTypes?.map((t) => (
                                          <SelectItem key={t.id} value={String(t.id)}>
                                            {t.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                                {canEdit && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setQuickAddType("itemType")}
                                    className="h-8 w-8 shrink-0"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.ctn`}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    min={0}
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    className="w-[80px] text-right font-mono"
                                    disabled={!canEdit}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.pcsPerCtn`}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    min={0}
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    className="w-[80px] text-right font-mono"
                                    disabled={!canEdit}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell className="text-right font-mono">{formatNumber(cou)}</TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.pri`}
                                render={({ field }) => (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    {...field}
                                    className="w-[100px] text-right font-mono"
                                    disabled={!canEdit}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {formatCurrency(total)}
                            </TableCell>
                            {canEdit && (
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteIndex(index)}
                                  data-testid={`button-delete-item-${index}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {canEdit && fields.length > 0 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <Button type="button" variant="outline" onClick={() => navigate(`/shipments/${id}`)}>
                    Cancel
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-items">
                      {saveMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Items
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        saveMutation.mutate(form.getValues(), {
                          onSuccess: () => navigate(`/shipments/${id}/importing`),
                        });
                      }}
                      disabled={saveMutation.isPending}
                      data-testid="button-next-importing"
                    >
                      Save & Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteIndex !== null}
        onOpenChange={(open) => !open && setDeleteIndex(null)}
        title="Delete Item"
        description="Are you sure you want to remove this item? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteIndex !== null) {
            remove(deleteIndex);
            setDeleteIndex(null);
          }
        }}
        variant="destructive"
      />

      <Dialog open={!!quickAddType} onOpenChange={(open) => !open && setQuickAddType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add New {quickAddType === "supplier" ? "Supplier" : "Item Type"}
            </DialogTitle>
          </DialogHeader>
          <Form {...quickAddForm}>
            <form onSubmit={quickAddForm.handleSubmit((data) => quickAddMutation.mutate(data))}>
              <div className="space-y-4">
                <FormField
                  control={quickAddForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-quick-add-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {quickAddType === "itemType" && (
                  <FormField
                    control={quickAddForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-quick-add-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setQuickAddType(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={quickAddMutation.isPending} data-testid="button-quick-add-save">
                  {quickAddMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
