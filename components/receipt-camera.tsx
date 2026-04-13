"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, Upload, X, RotateCcw, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReceiptCameraProps {
  onCapture: (imageData: string, mimeType: string, previewUrl: string) => void;
  onCancel: () => void;
}

interface CapturedFile {
  /** Raw base64 data (no data URL prefix) */
  base64: string;
  /** The true mime type — detected from the File object, not the data URL */
  mimeType: string;
  /** A blob URL or data URL the browser can actually render for preview */
  previewUrl: string;
}

export function ReceiptCamera({ onCapture, onCancel }: ReceiptCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedFile, setCapturedFile] = useState<CapturedFile | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setError("Unable to access camera. Please allow camera permissions or upload an image instead.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    // Strip the data:image/jpeg;base64, prefix to get raw base64
    const base64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
    setCapturedFile({ base64, mimeType: "image/jpeg", previewUrl: dataUrl });
    stopCamera();
  }, [stopCamera]);

  const isHeic = (file: File) => {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    return (
      type === "image/heic" ||
      type === "image/heif" ||
      name.endsWith(".heic") ||
      name.endsWith(".heif")
    );
  };

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        resolve(dataUrl.replace(/^data:[^;]+;base64,/, ""));
      };
      reader.readAsDataURL(blob);
    });

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (isHeic(file)) {
        // HEIC: send to server for conversion since browsers can't decode HEIC
        setIsConverting(true);
        try {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/convert-image", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) throw new Error("Conversion failed");
          const jpegBlob = await res.blob();
          const base64 = await blobToBase64(jpegBlob);
          setCapturedFile({
            base64,
            mimeType: "image/jpeg",
            previewUrl: URL.createObjectURL(jpegBlob),
          });
        } catch {
          setError("Failed to convert HEIC image. Please try a different file.");
        } finally {
          setIsConverting(false);
        }
      } else {
        const mimeType = file.type || "application/octet-stream";
        const base64 = await blobToBase64(file);
        setCapturedFile({
          base64,
          mimeType,
          previewUrl: URL.createObjectURL(file),
        });
      }
    },
    []
  );

  const confirmCapture = useCallback(() => {
    if (!capturedFile || !capturedFile.base64) return;
    onCapture(capturedFile.base64, capturedFile.mimeType, capturedFile.previewUrl);
  }, [capturedFile, onCapture]);

  const retake = useCallback(() => {
    if (capturedFile?.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(capturedFile.previewUrl);
    }
    setCapturedFile(null);
    startCamera();
  }, [capturedFile, startCamera]);

  const handleCancel = useCallback(() => {
    stopCamera();
    onCancel();
  }, [stopCamera, onCancel]);

  const isPdf = capturedFile?.mimeType === "application/pdf";

  return (
    <div className="fixed inset-0 z-60 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] bg-black/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="text-white hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </Button>
        <span className="text-white font-medium">
          {capturedFile ? "Preview" : "Scan Receipt"}
        </span>
        <div className="w-10" />
      </div>

      {/* Main content */}
      <div className="flex-1 relative">
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center">
              <p className="text-white mb-4">{error}</p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </Button>
            </div>
          </div>
        )}

        {isConverting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center text-white">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin opacity-60" />
              <p className="text-lg font-medium">Converting image...</p>
            </div>
          </div>
        )}

        {!isCameraActive && !capturedFile && !isConverting && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col gap-4">
              <Button size="lg" onClick={startCamera} className="gap-2">
                <Camera className="h-5 w-5" />
                Open Camera
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="h-5 w-5" />
                Upload Image
              </Button>
            </div>
          </div>
        )}

        {isCameraActive && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {capturedFile && (
          isPdf || !capturedFile.previewUrl ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="text-center text-white">
                <Upload className="h-16 w-16 mx-auto mb-4 opacity-60" />
                <p className="text-lg font-medium">
                  {isPdf ? "PDF Receipt" : "Image Ready"}
                </p>
                <p className="text-sm text-white/60 mt-1">Ready to scan</p>
              </div>
            </div>
          ) : (
            <img
              src={capturedFile.previewUrl}
              alt="Captured receipt"
              className="absolute inset-0 w-full h-full object-contain bg-black"
            />
          )
        )}

        {/* Camera guide overlay */}
        {isCameraActive && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-8 border-2 border-white/50 rounded-lg">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-white/80 text-sm whitespace-nowrap">
                Align receipt within frame
              </div>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif,.pdf,application/pdf"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Controls */}
      <div className="p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-black/50">
        {isCameraActive && (
          <div className="flex justify-center">
            <button
              onClick={capturePhoto}
              className={cn(
                "w-16 h-16 rounded-full border-4 border-white",
                "flex items-center justify-center",
                "bg-white/20 hover:bg-white/30 transition-colors"
              )}
            >
              <div className="w-12 h-12 rounded-full bg-white" />
            </button>
          </div>
        )}

        {capturedFile && (
          <div className="flex justify-center gap-4">
            <Button
              size="lg"
              variant="outline"
              onClick={retake}
              className="gap-2"
            >
              <RotateCcw className="h-5 w-5" />
              Retake
            </Button>
            <Button size="lg" onClick={confirmCapture} className="gap-2">
              <Check className="h-5 w-5" />
              Use Photo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
