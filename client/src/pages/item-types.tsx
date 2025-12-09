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
import { Plus, MoreHorizontal, Edit, Trash2, Package, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ItemType } from "@shared/schema";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ItemTypesPage() {
  const { toast } = useToast();
  const { canEdit } = useAuth();
  const [editItemType, setEditItemType] = useState<ItemType | null>(null);
  const [deleteItemType, setDeleteItemType] = useState<ItemType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: itemTypes, isLoading } = useQuery<ItemType[]>({
    queryKey: ["/api/item-types"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "" },
  });

  const openDialog = (itemType?: ItemType) => {
    if (itemType) {
      setEditItemType(itemType);
      form.reset({ name: itemType.name, description: itemType.description || "" });
    } else {
      setEditItemType(null);
      form.reset({ name: "", description: "" });
    }
    setIsDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (editItemType) {
        return await apiRequest("PATCH", `/api/item-types/${editItemType.id}`, data);
      }
      return await apiRequest("POST", "/api/item-types", data);
    },
    onSuccess: () => {
      toast({ title: editItemType ? "Item type updated" : "Item type created" });
      queryClient.invalidateQueries({ queryKey: ["/api/item-types"] });
      setIsDialogOpen(false);
      setEditItemType(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/item-types/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Item type deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/item-types"] });
      setDeleteItemType(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const columns = [
    { header: "Name", accessor: "name" as const },
    { header: "Description", accessor: "description" as const },
    {
      header: "Created",
      accessor: (row: ItemType) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-",
    },
    {
      header: "",
      accessor: (row: ItemType) =>
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
                onClick={() => setDeleteItemType(row)}
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

  if (!isLoading && (!itemTypes || itemTypes.length === 0)) {
    return (
      <div className="space-y-8">
        <PageHeader title="Item Types" description="Manage product categories" />
        <EmptyState
          icon={Package}
          title="No item types yet"
          description="Create item types to categorize your shipment items."
          action={canEdit ? { label: "Add Item Type", onClick: () => openDialog() } : undefined}
        />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItemType ? "Edit Item Type" : "Add Item Type"}</DialogTitle>
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
                        <Input {...field} placeholder="e.g., Electronics, Shoes" data-testid="input-item-type-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-item-type-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-item-type">
                    {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editItemType ? "Save Changes" : "Create"}
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
        title="Item Types"
        description="Manage product categories"
        actions={
          canEdit && (
            <Button onClick={() => openDialog()} data-testid="button-add-item-type">
              <Plus className="mr-2 h-4 w-4" />
              Add Item Type
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={itemTypes || []}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        emptyMessage="No item types found"
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItemType ? "Edit Item Type" : "Add Item Type"}</DialogTitle>
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
                      <Input {...field} placeholder="e.g., Electronics, Shoes" data-testid="input-item-type-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-item-type-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-item-type">
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editItemType ? "Save Changes" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteItemType}
        onOpenChange={(open) => !open && setDeleteItemType(null)}
        title="Delete Item Type"
        description={`Are you sure you want to delete "${deleteItemType?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => deleteItemType && deleteMutation.mutate(deleteItemType.id)}
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
