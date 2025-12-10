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
import { useTranslation } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ItemType } from "@shared/schema";

const formSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ItemTypesPage() {
  const { toast } = useToast();
  const { canEdit } = useAuth();
  const { t } = useTranslation();
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
      toast({ title: editItemType ? "تم تحديث نوع العنصر" : "تم إنشاء نوع العنصر" });
      queryClient.invalidateQueries({ queryKey: ["/api/item-types"] });
      setIsDialogOpen(false);
      setEditItemType(null);
    },
    onError: (error: Error) => {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/item-types/${id}`);
    },
    onSuccess: () => {
      toast({ title: "تم حذف نوع العنصر" });
      queryClient.invalidateQueries({ queryKey: ["/api/item-types"] });
      setDeleteItemType(null);
    },
    onError: (error: Error) => {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
    },
  });

  const columns = [
    { header: t.common.name, accessor: "name" as const },
    { header: t.common.description, accessor: "description" as const },
    {
      header: t.shipments.createdAt,
      accessor: (row: ItemType) => row.createdAt ? new Date(row.createdAt).toLocaleDateString("ar-SA") : "-",
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
                <Edit className="h-4 w-4" />
                {t.common.edit}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteItemType(row)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                {t.common.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null,
      className: "w-12",
    },
  ];

  const renderDialog = () => (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editItemType ? t.itemTypes.editItemType : t.itemTypes.newItemType}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.common.name}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="مثال: إلكترونيات، أحذية" data-testid="input-item-type-name" />
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
                  <FormLabel>{t.common.description} ({t.common.optional})</FormLabel>
                  <FormControl>
                    <Textarea {...field} data-testid="input-item-type-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-item-type">
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editItemType ? t.common.save : t.common.create}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );

  if (!isLoading && (!itemTypes || itemTypes.length === 0)) {
    return (
      <div className="space-y-8 p-6">
        <PageHeader title={t.itemTypes.title} description="إدارة فئات المنتجات" />
        <EmptyState
          icon={Package}
          title={t.itemTypes.noItemTypes}
          description="أنشئ أنواع العناصر لتصنيف عناصر الشحنات الخاصة بك."
          action={canEdit ? { label: t.itemTypes.addItemType, onClick: () => openDialog() } : undefined}
        />
        {renderDialog()}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t.itemTypes.title}
        description="إدارة فئات المنتجات"
        actions={
          canEdit && (
            <Button onClick={() => openDialog()} data-testid="button-add-item-type">
              <Plus className="h-4 w-4" />
              {t.itemTypes.addItemType}
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={itemTypes || []}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        emptyMessage="لم يتم العثور على أنواع عناصر"
      />

      {renderDialog()}

      <ConfirmDialog
        open={!!deleteItemType}
        onOpenChange={(open) => !open && setDeleteItemType(null)}
        title={t.itemTypes.deleteItemType}
        description={`هل أنت متأكد من حذف "${deleteItemType?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel={t.common.delete}
        onConfirm={() => deleteItemType && deleteMutation.mutate(deleteItemType.id)}
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
