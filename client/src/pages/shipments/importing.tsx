import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { WorkflowSteps } from "@/components/workflow-steps";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { ArrowRight, ArrowLeft, Save, Loader2, DollarSign, Percent, Truck, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Shipment, ImportingDetails, ShipmentItemWithRelations } from "@shared/schema";

const formSchema = z.object({
  commissionPercent: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, "يجب أن تكون بين 0-100"),
  shipmentCost: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "يجب أن تكون >= 0"),
  shipmentSpaceM2: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "يجب أن تكون >= 0"),
});

type FormData = z.infer<typeof formSchema>;

export default function ImportingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { canEdit } = useAuth();
  const { t } = useTranslation();

  const { data: shipment, isLoading: shipmentLoading } = useQuery<Shipment>({
    queryKey: ["/api/shipments", id],
  });

  const { data: items } = useQuery<ShipmentItemWithRelations[]>({
    queryKey: ["/api/shipments", id, "items"],
  });

  const { data: importingDetails, isLoading: detailsLoading } = useQuery<ImportingDetails>({
    queryKey: ["/api/shipments", id, "importing-details"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      commissionPercent: "0",
      shipmentCost: "0",
      shipmentSpaceM2: "0",
    },
  });

  useEffect(() => {
    if (importingDetails) {
      form.reset({
        commissionPercent: String(importingDetails.commissionPercent),
        shipmentCost: String(importingDetails.shipmentCost),
        shipmentSpaceM2: String(importingDetails.shipmentSpaceM2),
      });
    }
  }, [importingDetails, form]);

  const totalShipmentPrice = items?.reduce((sum, item) => {
    const total = typeof item.total === "string" ? parseFloat(item.total) : item.total;
    return sum + (total || 0);
  }, 0) || 0;

  const commissionPercent = parseFloat(form.watch("commissionPercent") || "0");
  const commissionAmount = (totalShipmentPrice * commissionPercent) / 100;

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        shipmentId: parseInt(id!),
        totalShipmentPrice: totalShipmentPrice.toFixed(2),
        commissionPercent: data.commissionPercent,
        commissionAmount: commissionAmount.toFixed(2),
        shipmentCost: data.shipmentCost,
        shipmentSpaceM2: data.shipmentSpaceM2,
      };
      return await apiRequest("PUT", `/api/shipments/${id}/importing-details`, payload);
    },
    onSuccess: () => {
      toast({ title: t.importing.detailsSaved });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments", id, "importing-details"] });
    },
    onError: (error: Error) => {
      toast({ title: "خطأ في حفظ التفاصيل", description: error.message, variant: "destructive" });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "USD" }).format(value);
  };

  const isLoading = shipmentLoading || detailsLoading;

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
    { id: "items", label: t.shipments.workflow.items, status: "completed" as const },
    { id: "importing", label: t.shipments.workflow.importing, status: "current" as const },
    { id: "customs", label: t.shipments.workflow.customsStep, status: "upcoming" as const },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t.importing.title}
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
          title={t.importing.totalShipmentPrice}
          value={formatCurrency(totalShipmentPrice)}
          icon={DollarSign}
          description="مجموع جميع العناصر"
        />
        <StatCard
          title={t.importing.commission}
          value={`${commissionPercent}%`}
          icon={Percent}
          description={formatCurrency(commissionAmount)}
        />
        <StatCard
          title={t.importing.shipmentCost}
          value={formatCurrency(parseFloat(form.watch("shipmentCost") || "0"))}
          icon={Truck}
        />
        <StatCard
          title={t.importing.shipmentSpace}
          value={parseFloat(form.watch("shipmentSpaceM2") || "0").toFixed(3)}
          icon={Square}
        />
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t.importing.configureDetails}</CardTitle>
          <CardDescription>
            تعيين معدلات العمولة وتكاليف الشحن ومتطلبات المساحة لهذه الشحنة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
              <div className="p-4 rounded-md bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t.importing.totalShipmentPrice}</span>
                  <span className="text-lg font-semibold font-mono">{formatCurrency(totalShipmentPrice)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  يتم حسابها تلقائياً من عناصر الشحنة
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="commissionPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.importing.commissionPercent}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            max={100}
                            {...field}
                            className="pl-8 font-mono"
                            disabled={!canEdit}
                            data-testid="input-commission-percent"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        {t.importing.commission}: {formatCurrency(commissionAmount)}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shipmentCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.importing.shipmentCost}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            {...field}
                            className="pr-7 font-mono"
                            disabled={!canEdit}
                            data-testid="input-shipment-cost"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>الشحن والمناولة والتكاليف الأخرى</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shipmentSpaceM2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.importing.shipmentSpace}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.001"
                            min={0}
                            {...field}
                            className="pl-10 font-mono"
                            disabled={!canEdit}
                            data-testid="input-shipment-space"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">م²</span>
                        </div>
                      </FormControl>
                      <FormDescription>إجمالي المساحة بالمتر المربع</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {canEdit && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => navigate(`/shipments/${id}/items`)}>
                    <ArrowRight className="h-4 w-4" />
                    {t.common.back} إلى {t.common.items}
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-importing">
                      {saveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {t.importing.saveDetails}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        saveMutation.mutate(form.getValues(), {
                          onSuccess: () => navigate(`/shipments/${id}`),
                        });
                      }}
                      disabled={saveMutation.isPending}
                      data-testid="button-save-and-view"
                    >
                      {t.importing.saveAndViewShipment}
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
