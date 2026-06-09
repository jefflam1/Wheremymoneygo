"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Store,
  Calendar,
  MapPin,
  CreditCard,
  ArrowLeft,
  Trash2,
  Camera,
  Edit,
  Pencil,
  AlertTriangle,
  Image as ImageIcon,
  ListChecks,
} from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { formatMoney, DEFAULT_CURRENCY } from "@/lib/currencies";
import { reconciliationDelta } from "@/lib/receipt-utils";
import { ImageLightbox } from "@/components/image-lightbox";

export default function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useCurrentUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const currency = user?.currency ?? DEFAULT_CURRENCY;

  // Tick line items to see their combined cost (e.g. what a friend owes).
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const toggleSelected = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setShowSelectedOnly(false);
  };

  const handleSetPaidByFriends = async (amount: number) => {
    await setPaidByFriends({ receiptId: id as Id<"receipts">, amount });
    exitSelection();
  };

  const receipt = useQuery(api.receipts.getReceiptById, {
    receiptId: id as Id<"receipts">,
  });
  const categories = useQuery(
    api.categories.getCategories,
    receipt?.userId ? { userId: receipt.userId } : "skip"
  );
  const deleteReceipt = useMutation(api.receipts.deleteReceipt);
  const setPaidByFriends = useMutation(api.receipts.setPaidByFriends);

  // Build slug -> display label map (e.g. "breakfast" -> "Food > Breakfast")
  const categoryLabels = useMemo(() => {
    const map = new Map<string, string>();
    if (!categories) return map;
    for (const cat of categories) {
      map.set(cat.slug, cat.name);
      for (const sub of cat.children) {
        map.set(sub.slug, `${cat.name} > ${sub.name}`);
      }
    }
    return map;
  }, [categories]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteReceipt({ receiptId: id as Id<"receipts"> });
      router.push("/dashboard/receipts");
    } catch (error) {
      console.error("Failed to delete:", error);
      setIsDeleting(false);
    }
  };

  if (receipt === undefined) {
    return <ReceiptDetailSkeleton />;
  }

  if (receipt === null) {
    return (
      <div className="p-4 md:p-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Receipt not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" render={<Link href={`/dashboard/receipts/${id}/edit`} />}>
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline" size="icon" className="text-destructive" />}>
              <Trash2 className="h-4 w-4" />
            </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Receipt</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this receipt? This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </div>

      {/* Store Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Store className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{receipt.storeName}</h1>
                <Badge variant="secondary">
                  {receipt.isManualEntry ? (
                    <>
                      <Edit className="h-3 w-3 mr-1" />
                      Manual Entry
                    </>
                  ) : (
                    <>
                      <Camera className="h-3 w-3 mr-1" />
                      Scanned
                    </>
                  )}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(receipt.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                {receipt.storeAddress && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {receipt.storeAddress}
                  </span>
                )}
                {receipt.paymentMethod && (
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    {receipt.paymentMethod}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Image / PDF */}
      {receipt.imageUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              {receipt.fileMimeType === "application/pdf"
                ? "Receipt PDF"
                : "Receipt Image"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {receipt.fileMimeType === "application/pdf" ? (
              <object
                data={`${receipt.imageUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                type="application/pdf"
                className="w-full h-[600px] rounded-lg border"
              >
                <p className="p-4 text-center text-muted-foreground">
                  PDF preview not available.{" "}
                  <a href={receipt.imageUrl} target="_blank" rel="noopener noreferrer" className="underline">
                    Download PDF
                  </a>
                </p>
              </object>
            ) : (
              <ImageLightbox
                src={receipt.imageUrl}
                alt="Receipt"
                className="w-full max-h-96 object-contain rounded-lg bg-muted cursor-zoom-in"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            Items ({receipt.items.length})
          </CardTitle>
          <Button
            variant={selectionMode ? "secondary" : "outline"}
            size="sm"
            onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
          >
            <ListChecks className="h-4 w-4 mr-1" />
            {selectionMode ? "Done" : "Select"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {receipt.items.map((item) =>
              showSelectedOnly && !selectedIds.has(item._id) ? null : (
                <div
                  key={item._id}
                  className={`py-3 flex items-center justify-between gap-4 ${
                    selectionMode ? "cursor-pointer" : ""
                  }`}
                  onClick={
                    selectionMode ? () => toggleSelected(item._id) : undefined
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {selectionMode && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item._id)}
                        onChange={() => toggleSelected(item._id)}
                        aria-label={`Select ${item.productName}`}
                        className="h-4 w-4 shrink-0 accent-primary cursor-pointer"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{item.productName}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {item.category && (
                          <Badge variant="outline" className="text-xs">
                            {categoryLabels.get(item.category) || item.category}
                          </Badge>
                        )}
                        {item.quantity > 1 && <span>Qty: {item.quantity}</span>}
                      </div>
                    </div>
                  </div>
                  <p className="font-semibold shrink-0">
                    {formatMoney(item.price * item.quantity, currency)}
                  </p>
                </div>
              )
            )}
          </div>

          {selectionMode && (() => {
            const selectedTotal = receipt.items.reduce(
              (sum, item) =>
                selectedIds.has(item._id)
                  ? sum + item.price * item.quantity
                  : sum,
              0
            );
            return (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/50 p-3 mt-4">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selected ·{" "}
                  <span className="font-semibold text-foreground">
                    {formatMoney(selectedTotal, currency)}
                  </span>
                </span>
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant={showSelectedOnly ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setShowSelectedOnly((on) => !on)}
                    >
                      {showSelectedOnly ? "Show all" : "Show selected only"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSetPaidByFriends(selectedTotal)}
                    >
                      Set as Paid by friends
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-2">
            {receipt.subtotal !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatMoney(receipt.subtotal, currency)}</span>
              </div>
            )}
            {receipt.discount !== undefined && receipt.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-green-600">
                  −{formatMoney(receipt.discount, currency)}
                </span>
              </div>
            )}
            {receipt.tax !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatMoney(receipt.tax, currency)}</span>
              </div>
            )}
            {receipt.paidByFriends !== undefined && receipt.paidByFriends > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paid by friends</span>
                <span className="text-green-600">
                  −{formatMoney(receipt.paidByFriends, currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span>{formatMoney(receipt.total, currency)}</span>
            </div>
            {(() => {
              const delta = reconciliationDelta(receipt);
              if (delta === null || Math.abs(delta) < 0.01) return null;
              return (
                <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 mt-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-muted-foreground">
                    <span className="font-medium text-amber-700 dark:text-amber-500">
                      Totals don&apos;t add up.
                    </span>{" "}
                    Subtotal − discount + tax
                    {receipt.paidByFriends !== undefined &&
                    receipt.paidByFriends > 0
                      ? " − paid by friends"
                      : ""}{" "}
                    is {formatMoney(receipt.total - delta, currency)}, but the total
                    is {formatMoney(receipt.total, currency)} (off by{" "}
                    {formatMoney(Math.abs(delta), currency)}). Double-check the
                    scanned figures.
                  </div>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReceiptDetailSkeleton() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-10" />
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="py-3 flex justify-between">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
