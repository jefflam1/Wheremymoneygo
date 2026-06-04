"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ReceiptForm } from "@/components/receipt-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { DEFAULT_CURRENCY } from "@/lib/currencies";

export default function EditReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isLoading: userLoading } = useCurrentUser();

  const receipt = useQuery(api.receipts.getReceiptById, {
    receiptId: id as Id<"receipts">,
  });

  if (userLoading || receipt === undefined) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!user || receipt === null) {
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

  const currency = receipt.currency ?? user.currency ?? DEFAULT_CURRENCY;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Receipt</h1>
      </div>

      <ReceiptForm
        userId={user._id}
        currency={currency}
        receiptId={id as Id<"receipts">}
        initialData={{
          storeName: receipt.storeName,
          storeAddress: receipt.storeAddress ?? undefined,
          date: new Date(receipt.date).toISOString().split("T")[0],
          items: receipt.items.map((item) => ({
            productName: item.productName,
            price: item.price,
            quantity: item.quantity,
            category: item.category ?? "",
          })),
          subtotal: receipt.subtotal ?? undefined,
          discount: receipt.discount ?? undefined,
          tax: receipt.tax ?? undefined,
          total: receipt.total,
          paymentMethod: receipt.paymentMethod ?? undefined,
        }}
        imageId={receipt.imageId ?? undefined}
        fileMimeType={receipt.fileMimeType ?? undefined}
        previewUrl={receipt.imageUrl ?? undefined}
        isScanned={!receipt.isManualEntry}
      />
    </div>
  );
}
