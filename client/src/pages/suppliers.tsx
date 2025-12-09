import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Edit, Trash2, Building2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Supplier } from "@shared/schema";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactInfo: z.string().optional(),
  defaultCountry: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function SuppliersPage() {
  const { toast } = useToast();
  const { canEdit } = useAuth();
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", contactInfo: "", defaultCountry: "" },
  });

  const openDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditSupplier(supplier);
      form.reset({
        name: supplier.name,
        contactInfo: supplier.contactInfo || "",
        defaultCountry: supplier.defaultCountry || "",
      });
    } else {
      setEditSupplier(null);
      form.reset({ name: "", contactInfo: "", defaultCountry: "" });
    }
    setIsDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (editSupplier) {
        return await apiRequest("PATCH", `/api/suppliers/${editSupplier.id}`, data);
      }
      return await apiRequest("POST", "/api/suppliers", data);
    },
    onSuccess: () => {
      toast({ title: editSupplier ? "Supplier updated" : "Supplier created" });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setIsDialogOpen(false);
      setEditSupplier(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/suppliers/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Supplier deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setDeleteSupplier(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const columns = [
    { header: "Name", accessor: "name" as const },
    { header: "Contact Info", accessor: "contactInfo" as const },
    { header: "Default Country", accessor: "defaultCountry" as const },
    {
      header: "Created",
      accessor: (row: Supplier) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-",
    },
    {
      header: "",
      accessor: (row: Supplier) =>
        canEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-actions-${row.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openDialog(row)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteSupplier(row)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null,
      className: "w-12",
    },
  ];

  if (!isLoading && (!suppliers || suppliers.length === 0)) {
    return (
      <div className="space-y-8">
        <PageHeader title="Suppliers" description="Manage your supplier contacts" />
        <EmptyState
          icon={Building2}
          title="No suppliers yet"
          description="Add suppliers to associate with your shipment items."
          action={canEdit ? { label: "Add Supplier", onClick: () => openDialog() } : undefined}
        />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editSupplier ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-supplier-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Info</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-supplier-contact" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="defaultCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Country</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-supplier-country" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-supplier">
                    {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editSupplier ? "Save Changes" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Manage your supplier contacts"
        actions={
          canEdit && (
            <Button onClick={() => openDialog()} data-testid="button-add-supplier">
              <Plus className="mr-2 h-4 w-4" />
              Add Supplier
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={suppliers || []}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        emptyMessage="No suppliers found"
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editSupplier ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-supplier-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Info</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-supplier-contact" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultCountry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Country</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-supplier-country" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-supplier">
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editSupplier ? "Save Changes" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteSupplier}
        onOpenChange={(open) => !open && setDeleteSupplier(null)}
        title="Delete Supplier"
        description={`Are you sure you want to delete "${deleteSupplier?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => deleteSupplier && deleteMutation.mutate(deleteSupplier.id)}
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
