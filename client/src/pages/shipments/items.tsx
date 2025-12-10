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
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  Package,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Shipment, ShipmentItemWithRelations, Supplier, ItemType } from "@shared/schema";

const itemSchema = z.object({
  id: z.number().optional(),
  supplierId: z.number().min(1, "مطلوب"),
  itemTypeId: z.number().min(1, "مطلوب"),
  itemPhotoUrl: z.string().optional(),
  ctn: z.number().min(0, "يجب أن يكون >= 0"),
  pcsPerCtn: z.number().min(0, "يجب أن يكون >= 0"),
  pri: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "يجب أن يكون >= 0"),
});

const formSchema = z.object({
  items: z.array(itemSchema),
});

type FormData = z.infer<typeof formSchema>;

const quickAddSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  description: z.string().optional(),
});

export default function ShipmentItems() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { canEdit } = useAuth();
  const { t } = useTranslation();
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
      toast({ title: t.items.itemsSaved });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments", id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments", id] });
    },
    onError: (error: Error) => {
      toast({ title: "خطأ في حفظ العناصر", description: error.message, variant: "destructive" });
    },
  });

  const quickAddMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const endpoint = quickAddType === "supplier" ? "/api/suppliers" : "/api/item-types";
      return await apiRequest("POST", endpoint, data);
    },
    onSuccess: () => {
      toast({ title: `تم إنشاء ${quickAddType === "supplier" ? "المورد" : "نوع العنصر"}` });
      queryClient.invalidateQueries({
        queryKey: [quickAddType === "supplier" ? "/api/suppliers" : "/api/item-types"],
      });
      setQuickAddType(null);
      quickAddForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "خطأ في الإنشاء", description: error.message, variant: "destructive" });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "USD" }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("ar-SA").format(value);
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
        <p className="text-muted-foreground">الشحنة غير موجودة</p>
        <Button variant="link" onClick={() => navigate("/shipments")}>
          {t.common.back} إلى {t.shipments.title}
        </Button>
      </div>
    );
  }

  const workflowSteps = [
    { id: "shipment", label: t.shipments.workflow.shipment, status: "completed" as const },
    { id: "items", label: t.shipments.workflow.items, status: "current" as const },
    { id: "importing", label: t.shipments.workflow.importing, status: "upcoming" as const },
    { id: "customs", label: t.shipments.workflow.customsStep, status: "upcoming" as const },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t.items.title}
        description={`${shipment.shipmentName} - ${shipment.shipmentNumber}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate(`/shipments/${id}`)} data-testid="button-back">
              <ArrowRight className="h-4 w-4" />
              {t.common.back}
            </Button>
          </div>
        }
      />

      <WorkflowSteps steps={workflowSteps} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title={t.items.totalCtn} value={formatNumber(totals.totalCtn)} icon={Package} />
        <StatCard title={t.items.totalPcs} value={formatNumber(totals.totalPcs)} icon={Package} />
        <StatCard title={t.items.totalPrice} value={formatCurrency(totals.totalPrice)} icon={DollarSign} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>{t.common.items} ({fields.length})</CardTitle>
          {canEdit && (
            <Button
              size="sm"
              onClick={() =>
                append({ supplierId: 0, itemTypeId: 0, itemPhotoUrl: "", ctn: 0, pcsPerCtn: 0, pri: "0" })
              }
              data-testid="button-add-item"
            >
              <Plus className="h-4 w-4" />
              {t.items.addItem}
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
                      <TableHead className="w-[180px]">{t.items.supplier}</TableHead>
                      <TableHead className="w-[180px]">{t.items.itemType}</TableHead>
                      <TableHead className="w-[100px] text-left">{t.items.ctn}</TableHead>
                      <TableHead className="w-[100px] text-left">{t.items.pcsPerCtn}</TableHead>
                      <TableHead className="w-[100px] text-left">{t.items.cou}</TableHead>
                      <TableHead className="w-[120px] text-left">{t.items.pri}</TableHead>
                      <TableHead className="w-[140px] text-left">{t.items.total}</TableHead>
                      {canEdit && <TableHead className="w-[60px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canEdit ? 8 : 7} className="h-24 text-center">
                          <p className="text-muted-foreground">{t.items.noItems}</p>
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
                                        <SelectValue placeholder="اختر" />
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
                                        <SelectValue placeholder="اختر" />
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
                                    className="w-[80px] text-left font-mono"
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
                                    className="w-[80px] text-left font-mono"
                                    disabled={!canEdit}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell className="text-left font-mono">{formatNumber(cou)}</TableCell>
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
                                    className="w-[100px] text-left font-mono"
                                    disabled={!canEdit}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell className="text-left font-mono font-medium">
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
                    {t.common.cancel}
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-items">
                      {saveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {t.items.saveItems}
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
                      {t.items.saveAndContinue}
                      <ArrowLeft className="h-4 w-4" />
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
        title={t.items.deleteItem}
        description={t.items.deleteConfirm}
        confirmLabel={t.common.delete}
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
              {t.common.add} {quickAddType === "supplier" ? t.suppliers.newSupplier : t.itemTypes.newItemType}
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
                      <FormLabel>{t.common.name}</FormLabel>
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
                        <FormLabel>{t.common.description} ({t.common.optional})</FormLabel>
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
                  {t.common.cancel}
                </Button>
                <Button type="submit" disabled={quickAddMutation.isPending} data-testid="button-quick-add-save">
                  {quickAddMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t.common.create}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
