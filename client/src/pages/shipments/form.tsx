import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowRight, Save, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Shipment } from "@shared/schema";

const formSchema = z.object({
  shipmentName: z.string().min(1, "اسم الشحنة مطلوب"),
  shipmentNumber: z.string().min(1, "رقم الشحنة مطلوب"),
  backendMasterKey: z.string().min(1, "المفتاح الرئيسي مطلوب"),
});

type FormData = z.infer<typeof formSchema>;

function generateMasterKey(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SHP-${timestamp}-${random}`;
}

export default function ShipmentForm() {
  const { id } = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAdmin, canEdit } = useAuth();
  const { t } = useTranslation();
  const isEditing = !!id && id !== "new";

  const { data: shipment, isLoading } = useQuery<Shipment>({
    queryKey: ["/api/shipments", id],
    enabled: isEditing,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shipmentName: "",
      shipmentNumber: "",
      backendMasterKey: generateMasterKey(),
    },
  });

  useEffect(() => {
    if (shipment) {
      form.reset({
        shipmentName: shipment.shipmentName,
        shipmentNumber: shipment.shipmentNumber,
        backendMasterKey: shipment.backendMasterKey,
      });
    }
  }, [shipment, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (isEditing) {
        return await apiRequest("PATCH", `/api/shipments/${id}`, data);
      } else {
        return await apiRequest("POST", "/api/shipments", data);
      }
    },
    onSuccess: async (response) => {
      const result = await response.json();
      toast({
        title: isEditing ? "تم تحديث الشحنة" : "تم إنشاء الشحنة",
        description: isEditing ? "تم حفظ التغييرات." : "انتقل لإضافة عناصر الشحنة.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      navigate(`/shipments/${result.id}/items`);
    },
    onError: (error: Error) => {
      toast({
        title: t.common.error,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  if (!canEdit) {
    navigate("/shipments");
    return null;
  }

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={isEditing ? t.shipments.editShipment : t.shipments.newShipment}
        description={isEditing ? "تحديث تفاصيل الشحنة" : "إنشاء شحنة جديدة لبدء تتبع المخزون"}
        actions={
          <Button variant="ghost" onClick={() => navigate("/shipments")} data-testid="button-back">
            <ArrowRight className="h-4 w-4" />
            {t.common.back} إلى {t.shipments.title}
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t.shipments.shipmentDetails}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="shipmentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.shipments.shipmentName}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="مثال: استيراد إلكترونيات الربع الرابع 2024"
                        {...field}
                        data-testid="input-shipment-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shipmentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.shipments.shipmentNumber}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="مثال: SHIP-2024-001"
                        {...field}
                        data-testid="input-shipment-number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="backendMasterKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.shipments.backendMasterKey}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={!isAdmin}
                        className="font-mono"
                        data-testid="input-backend-master-key"
                      />
                    </FormControl>
                    {!isAdmin && (
                      <p className="text-xs text-muted-foreground">
                        فقط المسؤولين يمكنهم تعديل المفتاح الرئيسي
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/shipments")}
                  data-testid="button-cancel"
                >
                  {t.common.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  data-testid="button-save"
                >
                  {mutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التغييرات" : "إنشاء وإضافة العناصر"}
                  {!isEditing && <ArrowLeft className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
