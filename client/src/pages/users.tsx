import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { RoleBadge } from "@/components/role-badge";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export default function UsersPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [editUser, setEditUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      toast({ title: "User role updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditUser(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openRoleDialog = (user: User) => {
    setEditUser(user);
    setSelectedRole(user.role);
  };

  const getInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.firstName) {
      return user.firstName.slice(0, 2).toUpperCase();
    }
    if (user.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const columns = [
    {
      header: "User",
      accessor: (row: User) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.profileImageUrl || undefined} className="object-cover" />
            <AvatarFallback className="text-xs">{getInitials(row)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">
              {row.firstName && row.lastName
                ? `${row.firstName} ${row.lastName}`
                : row.email || "Unknown"}
            </p>
            {row.firstName && row.email && (
              <p className="text-xs text-muted-foreground">{row.email}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Role",
      accessor: (row: User) => <RoleBadge role={row.role} />,
    },
    {
      header: "Joined",
      accessor: (row: User) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-",
    },
    {
      header: "",
      accessor: (row: User) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-actions-${row.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openRoleDialog(row)}>
              <Edit className="mr-2 h-4 w-4" />
              Change Role
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  if (!isLoading && (!users || users.length === 0)) {
    return (
      <div className="space-y-8">
        <PageHeader title="Users" description="Manage user accounts and roles" />
        <EmptyState
          icon={Users}
          title="No users found"
          description="Users will appear here once they sign in to the application."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage user accounts and roles"
      />

      <DataTable
        columns={columns}
        data={users || []}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        emptyMessage="No users found"
      />

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for{" "}
              {editUser?.firstName && editUser?.lastName
                ? `${editUser.firstName} ${editUser.lastName}`
                : editUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger data-testid="select-user-role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin - Full access</SelectItem>
                <SelectItem value="OPERATOR">Operator - Create & edit</SelectItem>
                <SelectItem value="VIEWER">Viewer - Read only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => editUser && updateRoleMutation.mutate({ userId: editUser.id, role: selectedRole })}
              disabled={updateRoleMutation.isPending || selectedRole === editUser?.role}
              data-testid="button-save-role"
            >
              {updateRoleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
