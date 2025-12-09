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
import { ArrowLeft, Save, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Shipment } from "@shared/schema";

const formSchema = z.object({
  shipmentName: z.string().min(1, "Shipment name is required"),
  shipmentNumber: z.string().min(1, "Shipment number is required"),
  backendMasterKey: z.string().min(1, "Backend master key is required"),
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
        title: isEditing ? "Shipment updated" : "Shipment created",
        description: isEditing ? "Your changes have been saved." : "Proceed to add shipment items.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      navigate(`/shipments/${result.id}/items`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
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
    <div className="space-y-6">
      <PageHeader
        title={isEditing ? "Edit Shipment" : "New Shipment"}
        description={isEditing ? "Update shipment details" : "Create a new shipment to start tracking inventory"}
        actions={
          <Button variant="ghost" onClick={() => navigate("/shipments")} data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shipments
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Shipment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="shipmentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipment Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Electronics Import Q4 2024"
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
                    <FormLabel>Shipment Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., SHIP-2024-001"
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
                    <FormLabel>Backend Master Key</FormLabel>
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
                        Only administrators can modify the master key
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
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  data-testid="button-save"
                >
                  {mutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {isEditing ? "Save Changes" : "Create & Add Items"}
                  {!isEditing && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
