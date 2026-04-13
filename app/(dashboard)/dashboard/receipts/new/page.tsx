"use client";

import { useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ReceiptCamera } from "@/components/receipt-camera";
import { ReceiptForm } from "@/components/receipt-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, Edit, Loader2, AlertCircle } from "lucide-react";

interface ScannedData {
  storeName: string;
  storeAddress?: string;
  date: string;
  items: Array<{
    productName: string;
    price: number;
    quantity: number;
    category: string;
  }>;
  subtotal?: number;
  tax?: number;
  total: number;
  paymentMethod?: string;
}

type Mode = "choose" | "camera" | "scanning" | "form";

export default function NewReceiptPage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const generateUploadUrl = useMutation(api.receipts.generateUploadUrl);

  const [mode, setMode] = useState<Mode>("choose");
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const [imageId, setImageId] = useState<Id<"_storage"> | undefined>();
  const [fileMimeType, setFileMimeType] = useState<string | undefined>();
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanned, setIsScanned] = useState(false);

  const handleCapture = async (imageData: string, mimeType: string, capturePreviewUrl: string) => {
    setMode("scanning");
    setScanError(null);

    try {
      // Upload image to Convex storage
      const uploadUrl = await generateUploadUrl();
      const blob = await fetch(`data:${mimeType};base64,${imageData}`).then((r) =>
        r.blob()
      );

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": mimeType },
        body: blob,
      });

      if (uploadResponse.ok) {
        const { storageId } = await uploadResponse.json();
        setImageId(storageId);
        setFileMimeType(mimeType);
        setPreviewUrl(capturePreviewUrl);
      }

      // Scan receipt with Claude
      const scanResponse = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData, mimeType }),
      });

      const result = await scanResponse.json();

      if (result.success && result.data) {
        setScannedData(result.data);
        setIsScanned(true);
        setMode("form");
      } else {
        setScanError(result.error || "Failed to scan receipt");
        setMode("form");
      }
    } catch (error) {
      console.error("Scan error:", error);
      setScanError("Failed to process receipt. You can enter the details manually.");
      setMode("form");
    }
  };

  const handleCameraCancel = () => {
    setMode("choose");
  };

  if (userLoading) {
    return (
      <div className="p-4 md:p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 md:p-6">
        <p>Please sign in to add receipts.</p>
      </div>
    );
  }

  if (mode === "camera") {
    return <ReceiptCamera onCapture={handleCapture} onCancel={handleCameraCancel} />;
  }

  if (mode === "scanning") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">Scanning Receipt</h2>
            <p className="text-muted-foreground">
              AI is extracting information from your receipt...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "form") {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          {isScanned ? "Review Scanned Receipt" : "Add Receipt Manually"}
        </h1>

        {scanError && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Scan Issue</p>
              <p className="text-sm text-muted-foreground">{scanError}</p>
            </div>
          </div>
        )}

        <ReceiptForm
          userId={user._id}
          initialData={scannedData ?? undefined}
          imageId={imageId}
          fileMimeType={fileMimeType}
          previewUrl={previewUrl}
          isScanned={isScanned}
        />
      </div>
    );
  }

  // Choose mode
  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Add Receipt</h1>
      <p className="text-muted-foreground mb-8">
        Scan a receipt with your camera or enter details manually.
      </p>

      <div className="grid gap-4">
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => setMode("camera")}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Scan Receipt</h3>
              <p className="text-sm text-muted-foreground">
                Take a photo and let AI extract the details
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => setMode("form")}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Edit className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Manual Entry</h3>
              <p className="text-sm text-muted-foreground">
                Enter receipt details by hand
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center">
        <Button variant="ghost" onClick={() => window.history.back()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
