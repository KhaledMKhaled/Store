import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { WorkflowSteps } from "@/components/workflow-steps";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowRight, Save, Loader2, Package, AlertTriangle, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Shipment, CustomsWithRelations } from "@shared/schema";

const customsPerTypeSchema = z.object({
  id: z.number().optional(),
  itemTypeId: z.number(),
  itemTypeName: z.string(),
  totalPcsPerType: z.number().min(0),
  totalCtnPerType: z.number().min(0),
  paidCustoms: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "يجب أن تكون >= 0"),
  takhreg: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "يجب أن تكون >= 0"),
});

const formSchema = z.object({
  billDate: z.string().optional(),
  totalPiecesAdjusted: z.number().min(0),
  customsPerType: z.array(customsPerTypeSchema),
});

type FormData = z.infer<typeof formSchema>;

export default function CustomsPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { canEdit } = useAuth();
  const { t } = useTranslation();

  const { data: shipment, isLoading: shipmentLoading } = useQuery<Shipment>({
    queryKey: ["/api/shipments", id],
  });

  const { data: customs, isLoading: customsLoading } = useQuery<CustomsWithRelations>({
    queryKey: ["/api/shipments", id, "customs"],
    enabled: shipment?.status === "CUSTOMS_RECEIVED",
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      billDate: "",
      totalPiecesAdjusted: 0,
      customsPerType: [],
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "customsPerType",
  });

  useEffect(() => {
    if (customs) {
      form.reset({
        billDate: customs.billDate || "",
        totalPiecesAdjusted: customs.totalPiecesAdjusted,
        customsPerType: customs.customsPerType?.map((cpt) => ({
          id: cpt.id,
          itemTypeId: cpt.itemTypeId,
          itemTypeName: cpt.itemType?.name || "غير معروف",
          totalPcsPerType: cpt.totalPcsPerType,
          totalCtnPerType: cpt.totalCtnPerType,
          paidCustoms: String(cpt.paidCustoms),
          takhreg: String(cpt.takhreg),
        })) || [],
      });
    }
  }, [customs, form]);

  const watchedAdjusted = form.watch("totalPiecesAdjusted");
  const watchedPerType = form.watch("customsPerType");
  const totalPiecesRecorded = customs?.totalPiecesRecorded || 0;
  const lossOrDamagePieces = totalPiecesRecorded - watchedAdjusted;

  const totalPaidCustoms = watchedPerType.reduce((sum, item) => sum + parseFloat(item.paidCustoms || "0"), 0);
  const totalPaidTakhreg = watchedPerType.reduce((sum, item) => sum + parseFloat(item.takhreg || "0"), 0);

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        billDate: data.billDate || null,
        totalPiecesAdjusted: data.totalPiecesAdjusted,
        lossOrDamagePieces,
        customsPerType: data.customsPerType.map((cpt) => ({
          id: cpt.id,
          itemTypeId: cpt.itemTypeId,
          totalPcsPerType: cpt.totalPcsPerType,
          totalCtnPerType: cpt.totalCtnPerType,
          paidCustoms: cpt.paidCustoms,
          takhreg: cpt.takhreg,
        })),
      };
      return await apiRequest("PUT", `/api/shipments/${id}/customs`, payload);
    },
    onSuccess: () => {
      toast({ title: t.customs.customsSaved });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments", id, "customs"] });
    },
    onError: (error: Error) => {
      toast({ title: "خطأ في حفظ الجمارك", description: error.message, variant: "destructive" });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "USD" }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("ar-SA").format(value);
  };

  const isLoading = shipmentLoading || customsLoading;

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

  if (shipment.status !== "CUSTOMS_RECEIVED") {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title={t.customs.title}
          description={`${shipment.shipmentName} - ${shipment.shipmentNumber}`}
          actions={
            <Button variant="ghost" onClick={() => navigate(`/shipments/${id}`)} data-testid="button-back">
              <ArrowRight className="h-4 w-4" />
              {t.common.back}
            </Button>
          }
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t.customs.notAvailableYet}</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {shipment.status === "CUSTOMS_IN_PROGRESS"
                ? "الجمارك قيد التنفيذ حالياً. ستتوفر التفاصيل بمجرد استلام الشحنة."
                : "تفاصيل الجمارك متاحة فقط بعد تغيير حالة الشحنة إلى 'تم استلام الجمارك'."}
            </p>
            <Button className="mt-6" onClick={() => navigate(`/shipments/${id}`)} data-testid="button-view-shipment">
              {t.common.view} {t.shipments.title}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const workflowSteps = [
    { id: "shipment", label: t.shipments.workflow.shipment, status: "completed" as const },
    { id: "items", label: t.shipments.workflow.items, status: "completed" as const },
    { id: "importing", label: t.shipments.workflow.importing, status: "completed" as const },
    { id: "customs", label: t.shipments.workflow.customsStep, status: "current" as const },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t.customs.title}
        description={`${shipment.shipmentName} - ${shipment.shipmentNumber}`}
        actions={
          <Button variant="ghost" onClick={() => navigate(`/shipments/${id}`)} data-testid="button-back">
            <ArrowRight className="h-4 w-4" />
            {t.common.back}
          </Button>
        }
      />

      <WorkflowSteps steps={workflowSteps} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t.customs.piecesRecorded}
          value={formatNumber(totalPiecesRecorded)}
          icon={Package}
          description="العدد الأولي من العناصر"
        />
        <StatCard
          title={t.customs.piecesAdjusted}
          value={formatNumber(watchedAdjusted)}
          icon={Package}
          description="بعد الفقد/التلف"
        />
        <StatCard
          title={t.customs.lossOrDamage}
          value={formatNumber(lossOrDamagePieces)}
          icon={AlertTriangle}
          className={lossOrDamagePieces > 0 ? "border-amber-500/50" : ""}
        />
        <StatCard title={t.customs.totalPaid} value={formatCurrency(totalPaidCustoms + totalPaidTakhreg)} icon={DollarSign} />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.customs.customsInfo}</CardTitle>
              <CardDescription>تسجيل تاريخ الفاتورة وتعديلات القطع</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="billDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.customs.billDate}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={!canEdit} data-testid="input-bill-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>{t.customs.totalPiecesRecorded}</FormLabel>
                  <div className="h-10 flex items-center px-3 rounded-md bg-muted font-mono">
                    {formatNumber(totalPiecesRecorded)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">من عناصر الشحنة</p>
                </div>

                <FormField
                  control={form.control}
                  name="totalPiecesAdjusted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.customs.totalPiecesAdjusted}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          className="font-mono"
                          disabled={!canEdit}
                          data-testid="input-pieces-adjusted"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        الفقد/التلف: <span className={lossOrDamagePieces > 0 ? "text-amber-600" : ""}>{formatNumber(lossOrDamagePieces)}</span>
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.customs.perTypeBreakdown}</CardTitle>
              <CardDescription>رسوم الجمارك والتخريج لكل نوع عنصر</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.customs.itemType}</TableHead>
                      <TableHead className="text-left">{t.items.cou}</TableHead>
                      <TableHead className="text-left">{t.items.ctn}</TableHead>
                      <TableHead className="text-left">{t.customs.paidCustoms}</TableHead>
                      <TableHead className="text-left">{t.customs.takhreg}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          لا توجد أنواع عناصر في هذه الشحنة
                        </TableCell>
                      </TableRow>
                    ) : (
                      fields.map((field, index) => (
                        <TableRow key={field.id} data-testid={`customs-type-row-${index}`}>
                          <TableCell className="font-medium">{field.itemTypeName}</TableCell>
                          <TableCell className="text-left font-mono">{formatNumber(field.totalPcsPerType)}</TableCell>
                          <TableCell className="text-left font-mono">{formatNumber(field.totalCtnPerType)}</TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`customsPerType.${index}.paidCustoms`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  {...field}
                                  className="w-[120px] text-left font-mono"
                                  disabled={!canEdit}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`customsPerType.${index}.takhreg`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  {...field}
                                  className="w-[120px] text-left font-mono"
                                  disabled={!canEdit}
                                />
                              )}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {fields.length > 0 && (
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell colSpan={3}>{t.common.total}</TableCell>
                        <TableCell className="text-left font-mono">{formatCurrency(totalPaidCustoms)}</TableCell>
                        <TableCell className="text-left font-mono">{formatCurrency(totalPaidTakhreg)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {canEdit && (
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(`/shipments/${id}`)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-customs">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t.customs.saveCustoms}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
