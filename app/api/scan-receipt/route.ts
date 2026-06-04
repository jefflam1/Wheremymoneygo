import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_CATEGORIES = "groceries, electronics, clothing, food, household, health, entertainment, other";

function buildPrompt(categorySlugs?: string[]): string {
  const categoryList = categorySlugs?.length
    ? categorySlugs.join(", ")
    : DEFAULT_CATEGORIES;

  return `Analyze this receipt image and extract the following information. Return ONLY valid JSON with no additional text or markdown formatting.

{
  "storeName": "string - the store or business name",
  "storeAddress": "string or null - store address if visible",
  "date": "string - date in YYYY-MM-DD format, or null if not readable",
  "items": [
    {
      "productName": "string - normalized readable product name (e.g., 'BNLS CHKN BRST' becomes 'Boneless Chicken Breast')",
      "price": "number - unit price as a decimal",
      "quantity": "number - quantity purchased, default to 1 if not specified",
      "category": "string - one of: ${categoryList}"
    }
  ],
  "subtotal": "number or null",
  "tax": "number or null",
  "total": "number - the total amount paid",
  "paymentMethod": "string or null - one of: cash, credit, debit, gift_card, other"
}

Important:
- Normalize abbreviated product names to be human-readable
- Assign appropriate categories based on the product type
- If the receipt is unclear or unreadable in parts, use your best judgment
- Ensure all prices are positive numbers
- If you cannot determine a required field, use null`;
}

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function isPdf(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

export async function POST(request: NextRequest) {
  try {
    const { image, mimeType, categorySlugs } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 }
      );
    }

    // Build the content blocks depending on file type
    const contentBlocks: Anthropic.Messages.ContentBlockParam[] = [];

    if (isPdf(mimeType)) {
      contentBlocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: image,
        },
      });
    } else {
      contentBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: (mimeType || "image/jpeg") as ImageMediaType,
          data: image,
        },
      });
    }

    contentBlocks.push({
      type: "text",
      text: buildPrompt(categorySlugs),
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: contentBlocks,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "No text response from Claude" },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let receiptData;
    try {
      // Remove any potential markdown code blocks
      let jsonText = textContent.text.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith("```")) {
        jsonText = jsonText.slice(0, -3);
      }
      receiptData = JSON.parse(jsonText.trim());
    } catch {
      console.error("Failed to parse Claude response:", textContent.text);
      return NextResponse.json(
        { error: "Failed to parse receipt data", raw: textContent.text },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: receiptData });
  } catch (error) {
    console.error("Receipt scan error:", error);
    return NextResponse.json(
      { error: "Failed to scan receipt" },
      { status: 500 }
    );
  }
}
