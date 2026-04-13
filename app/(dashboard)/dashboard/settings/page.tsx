"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import { useUser, UserButton } from "@clerk/nextjs";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Shield,
  Bell,
  Palette,
  Tags,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  Coins,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { CURRENCIES, DEFAULT_CURRENCY, getCurrency } from "@/lib/currencies";

function CategoryManager({ userId }: { userId: Id<"users"> }) {
  const categories = useQuery(api.categories.getCategories, { userId });
  const seedDefaults = useMutation(api.categories.seedDefaultCategories);
  const createCategory = useMutation(api.categories.createCategory);
  const updateCategory = useMutation(api.categories.updateCategory);
  const deleteCategory = useMutation(api.categories.deleteCategory);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogName, setDialogName] = useState("");
  const [editingId, setEditingId] = useState<Id<"categories"> | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<Id<"categories"> | undefined>();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const seededRef = useRef(false);

  useEffect(() => {
    if (categories && categories.length === 0 && !seededRef.current) {
      seededRef.current = true;
      seedDefaults({ userId });
    }
  }, [categories, userId, seedDefaults]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreateDialog = (parentId?: Id<"categories">) => {
    setEditingId(null);
    setParentIdForNew(parentId);
    setDialogName("");
    setDialogOpen(true);
  };

  const openEditDialog = (id: Id<"categories">, name: string) => {
    setEditingId(id);
    setParentIdForNew(undefined);
    setDialogName(name);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!dialogName.trim()) return;
    if (editingId) {
      await updateCategory({ categoryId: editingId, name: dialogName });
    } else {
      await createCategory({ userId, name: dialogName, parentId: parentIdForNew });
    }
    setDialogOpen(false);
  };

  if (categories === undefined) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {categories.map((cat) => {
        const isExpanded = expandedIds.has(cat._id);
        const hasChildren = cat.children.length > 0;

        return (
          <div key={cat._id}>
            {/* Parent category row */}
            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 group">
              <button
                onClick={() => hasChildren && toggleExpand(cat._id)}
                className="w-5 h-5 flex items-center justify-center shrink-0"
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )
                ) : (
                  <span className="w-4" />
                )}
              </button>
              <span className="flex-1 font-medium text-sm">{cat.name}</span>
              {hasChildren && (
                <span className="text-xs text-muted-foreground mr-1">
                  {cat.children.length}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => openCreateDialog(cat._id)}
                className="opacity-0 group-hover:opacity-100"
                title="Add sub-category"
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => openEditDialog(cat._id, cat.name)}
                className="opacity-0 group-hover:opacity-100"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="opacity-0 group-hover:opacity-100 text-destructive"
                    />
                  }
                >
                  <Trash2 className="h-3 w-3" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete &ldquo;{cat.name}&rdquo;?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {hasChildren
                        ? `This will also delete ${cat.children.length} sub-categor${cat.children.length === 1 ? "y" : "ies"}.`
                        : "This category will be permanently deleted."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteCategory({ categoryId: cat._id })}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Sub-categories */}
            {hasChildren && isExpanded && (
              <div className="ml-7 border-l pl-3 space-y-1">
                {cat.children.map((sub) => (
                  <div
                    key={sub._id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 group"
                  >
                    <span className="flex-1 text-sm">{sub.name}</span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => openEditDialog(sub._id, sub.name)}
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="opacity-0 group-hover:opacity-100 text-destructive"
                          />
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete &ldquo;{sub.name}&rdquo;?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This sub-category will be permanently deleted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCategory({ categoryId: sub._id })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <Button
        variant="outline"
        size="sm"
        onClick={() => openCreateDialog()}
        className="w-full mt-2"
      >
        <Plus className="h-4 w-4 mr-1" />
        Add Category
      </Button>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Rename Category" : parentIdForNew ? "Add Sub-category" : "Add Category"}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={dialogName}
            onChange={(e) => setDialogName(e.target.value)}
            placeholder="Category name"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={!dialogName.trim()}>
              {editingId ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CurrencySelector({ userId, currentCurrency }: { userId: Id<"users">; currentCurrency: string }) {
  const updateCurrency = useMutation(api.users.updateCurrency);

  const handleChange = async (value: string | null) => {
    if (!value) return;
    await updateCurrency({ userId, currency: value });
  };

  const currency = getCurrency(currentCurrency);

  return (
    <div className="space-y-3">
      <Select value={currentCurrency} onValueChange={handleChange}>
        <SelectTrigger className="w-full">
          <SelectValue>
            {currency.symbol} {currency.name} ({currency.code})
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.symbol} {c.name} ({c.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        This currency will be used for all new receipts and displayed across the app.
      </p>
    </div>
  );
}

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Appearance
        </CardTitle>
        <CardDescription>Customize how the app looks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isActive = mounted && theme === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                  isActive
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/50 hover:bg-muted"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const { user } = useCurrentUser();

  if (!isLoaded) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Account
          </CardTitle>
          <CardDescription>Manage your account information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-16 w-16",
                },
              }}
            />
            <div>
              <p className="font-semibold text-lg">
                {clerkUser?.fullName || clerkUser?.username || "User"}
              </p>
              <p className="text-muted-foreground">
                {clerkUser?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Click on your avatar to manage your account settings, change your
            password, or sign out.
          </p>
        </CardContent>
      </Card>

      {/* Currency */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Currency
          </CardTitle>
          <CardDescription>Choose your preferred currency for tracking expenses</CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <CurrencySelector userId={user._id} currentCurrency={user.currency ?? DEFAULT_CURRENCY} />
          ) : (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Tags className="h-5 w-5" />
            Categories
          </CardTitle>
          <CardDescription>
            Manage your spending categories. Add sub-categories for more detail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <CategoryManager userId={user._id} />
          ) : (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Security
          </CardTitle>
          <CardDescription>Your data is stored securely</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Your receipt data is stored securely in our database and is only
            accessible by you.
          </p>
          <p>
            Receipt images are processed by AI to extract information and are
            stored securely.
          </p>
          <p>
            We do not share your data with third parties.
          </p>
        </CardContent>
      </Card>

      {/* Notifications - Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configure notification preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Notification settings coming soon.
          </p>
        </CardContent>
      </Card>

      {/* Appearance */}
      <AppearanceCard />

      {/* App Info */}
      <div className="text-center text-sm text-muted-foreground pt-4">
        <p>WhereMyMoneyGo v1.0.0</p>
        <p className="mt-1">Made with Next.js, Clerk, Convex, and Claude AI</p>
      </div>
    </div>
  );
}
