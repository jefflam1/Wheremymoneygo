"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Loader2, Image as ImageIcon, FileText } from "lucide-react";
import { formatMoney, DEFAULT_CURRENCY } from "@/lib/currencies";

interface ReceiptItem {
  productName: string;
  price: number;
  quantity: number;
  category: string;
}

interface ReceiptFormData {
  storeName: string;
  storeAddress?: string;
  date: string;
  items: ReceiptItem[];
  subtotal?: number;
  tax?: number;
  total: number;
  paymentMethod?: string;
}

interface ReceiptFormProps {
  userId: Id<"users">;
  currency?: string;
  receiptId?: Id<"receipts">;
  initialData?: Partial<ReceiptFormData>;
  imageId?: Id<"_storage">;
  fileMimeType?: string;
  previewUrl?: string;
  isScanned?: boolean;
}

export function ReceiptForm({
  userId,
  currency = DEFAULT_CURRENCY,
  receiptId,
  initialData,
  imageId,
  fileMimeType,
  previewUrl,
  isScanned = false,
}: ReceiptFormProps) {
  const router = useRouter();
  const isEditMode = !!receiptId;
  const createReceipt = useMutation(api.receipts.createReceipt);
  const updateReceipt = useMutation(api.receipts.updateReceipt);
  const categories = useQuery(api.categories.getCategories, { userId });
  const seedDefaults = useMutation(api.categories.seedDefaultCategories);
  const seededRef = useRef(false);

  useEffect(() => {
    if (categories && categories.length === 0 && !seededRef.current) {
      seededRef.current = true;
      seedDefaults({ userId });
    }
  }, [categories, userId, seedDefaults]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ReceiptFormData>({
    storeName: initialData?.storeName ?? "",
    storeAddress: initialData?.storeAddress ?? undefined,
    date: initialData?.date ?? new Date().toISOString().split("T")[0],
    items: initialData?.items?.map((item) => ({
      productName: item.productName ?? "",
      price: item.price ?? 0,
      quantity: item.quantity ?? 1,
      category: item.category ?? "",
    })) ?? [
      { productName: "", price: 0, quantity: 1, category: "" },
    ],
    subtotal: initialData?.subtotal ?? undefined,
    tax: initialData?.tax ?? undefined,
    total: initialData?.total ?? 0,
    paymentMethod: initialData?.paymentMethod ?? undefined,
  });

  const updateField = <K extends keyof ReceiptFormData>(
    field: K,
    value: ReceiptFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateItem = (index: number, field: keyof ReceiptItem, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { productName: "", price: 0, quantity: 1, category: "" },
      ],
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const calculateTotal = () => {
    const itemsTotal = formData.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const tax = formData.tax ?? 0;
    return itemsTotal + tax;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const dateTimestamp = new Date(formData.date).getTime();
      const commonArgs = {
        userId,
        storeName: formData.storeName,
        storeAddress: formData.storeAddress || undefined,
        date: dateTimestamp,
        subtotal: formData.subtotal ?? undefined,
        tax: formData.tax ?? undefined,
        total: calculateTotal(),
        paymentMethod: formData.paymentMethod || undefined,
        currency,
        items: formData.items
          .filter((item) => item.productName.trim() !== "")
          .map((item) => ({
            productName: item.productName,
            price: item.price ?? 0,
            quantity: item.quantity ?? 1,
            category: item.category || undefined,
          })),
      };

      if (isEditMode) {
        await updateReceipt({ receiptId, ...commonArgs });
        router.push(`/dashboard/receipts/${receiptId}`);
      } else {
        await createReceipt({
          ...commonArgs,
          imageId: imageId ?? undefined,
          fileMimeType: fileMimeType || undefined,
          isManualEntry: !isScanned,
        });
        router.push("/dashboard/receipts");
      }
    } catch (error) {
      console.error("Failed to create receipt:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Scanned Image Preview */}
      {previewUrl && isScanned && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {fileMimeType === "application/pdf" ? (
                <FileText className="h-5 w-5" />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
              Scanned Receipt
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fileMimeType === "application/pdf" ? (
              <object
                data={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                type="application/pdf"
                className="w-full h-[400px] rounded-lg border"
              >
                <p className="p-4 text-center text-muted-foreground">PDF preview not available</p>
              </object>
            ) : (
              <img
                src={previewUrl}
                alt="Scanned receipt"
                className="w-full max-h-72 object-contain rounded-lg bg-muted"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Store Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Store Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name *</Label>
              <Input
                id="storeName"
                value={formData.storeName}
                onChange={(e) => updateField("storeName", e.target.value)}
                placeholder="e.g., Walmart, Target"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => updateField("date", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="storeAddress">Store Address (optional)</Label>
            <Input
              id="storeAddress"
              value={formData.storeAddress ?? ""}
              onChange={(e) => updateField("storeAddress", e.target.value)}
              placeholder="123 Main St, City, State"
            />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Items</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.items.map((item, index) => (
            <div
              key={index}
              className="grid gap-3 p-4 border rounded-lg bg-muted/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <Label>Product Name</Label>
                  <Input
                    value={item.productName}
                    onChange={(e) =>
                      updateItem(index, "productName", e.target.value)
                    }
                    placeholder="Product name"
                  />
                </div>
                {formData.items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    className="mt-6 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid gap-3 grid-cols-3">
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.price || ""}
                    onChange={(e) =>
                      updateItem(index, "price", parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", parseInt(e.target.value) || 1)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={item.category}
                    onValueChange={(value) => value && updateItem(index, "category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) =>
                        cat.children.length > 0 ? (
                          <SelectGroup key={cat._id}>
                            <SelectLabel>{cat.name}</SelectLabel>
                            {cat.children.map((sub) => (
                              <SelectItem key={sub._id} value={sub.slug}>
                                {sub.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ) : (
                          <SelectItem key={cat._id} value={cat.slug}>
                            {cat.name}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Totals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="subtotal">Subtotal</Label>
              <Input
                id="subtotal"
                type="number"
                step="0.01"
                min="0"
                value={formData.subtotal ?? ""}
                onChange={(e) =>
                  updateField(
                    "subtotal",
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax">Tax</Label>
              <Input
                id="tax"
                type="number"
                step="0.01"
                min="0"
                value={formData.tax ?? ""}
                onChange={(e) =>
                  updateField(
                    "tax",
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total">Total *</Label>
              <Input
                id="total"
                type="number"
                step="0.01"
                min="0"
                value={calculateTotal() || ""}
                readOnly
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment</Label>
              <Select
                value={formData.paymentMethod ?? ""}
                onValueChange={(value) => updateField("paymentMethod", value ?? undefined)}
              >
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit">Credit Card</SelectItem>
                  <SelectItem value="debit">Debit Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-between items-center pt-4 border-t">
            <span className="text-muted-foreground">Calculated Total:</span>
            <span className="text-xl font-bold">
              {formatMoney(calculateTotal(), currency)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditMode ? "Update Receipt" : "Save Receipt"}
        </Button>
      </div>
    </form>
  );
}
