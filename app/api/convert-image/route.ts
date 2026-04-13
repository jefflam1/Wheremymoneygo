import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const name = file.name.toLowerCase();
    const isHeic =
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      name.endsWith(".heic") ||
      name.endsWith(".heif");

    if (!isHeic) {
      return NextResponse.json(
        { error: "Not a HEIC file" },
        { status: 400 }
      );
    }

    const libheif = (await import("libheif-js")) as any;
    const decoder = new libheif.HeifDecoder();
    const images = decoder.decode(buffer);

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "Could not decode HEIC" },
        { status: 400 }
      );
    }

    const image = images[0];
    const width = image.get_width();
    const height = image.get_height();

    const rgbaData = await new Promise<Uint8Array>((resolve, reject) => {
      image.display(
        {
          data: new Uint8ClampedArray(width * height * 4),
          width,
          height,
        } as any,
        (result: any) => {
          if (result) {
            resolve(new Uint8Array(result.data.buffer));
          } else {
            reject(new Error("Failed to decode image data"));
          }
        }
      );
    });

    const sharp = (await import("sharp")).default;
    const jpegBuffer = await sharp(Buffer.from(rgbaData), {
      raw: { width, height, channels: 4 },
    })
      .jpeg({ quality: 90 })
      .toBuffer();

    return new NextResponse(new Uint8Array(jpegBuffer), {
      headers: { "Content-Type": "image/jpeg" },
    });
  } catch (error) {
    console.error("Image conversion error:", error);
    return NextResponse.json(
      { error: "Failed to convert file" },
      { status: 500 }
    );
  }
}
