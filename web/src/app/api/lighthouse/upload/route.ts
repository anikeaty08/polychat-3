import { NextRequest, NextResponse } from "next/server";
import lighthouse from "@lighthouse-web3/sdk";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = process.env.LIGHTHOUSE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "LIGHTHOUSE_API_KEY is not set on the server" },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing file in form-data" },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name || `file-${Date.now()}`;
    const fileType = file.type || "application/octet-stream";
    
    console.log(`[Lighthouse Upload] Starting upload: ${fileName}, type: ${fileType}, size: ${buffer.length} bytes`);
    console.log(`[Lighthouse Upload] API Key present: ${!!apiKey}, length: ${apiKey?.length || 0}`);
    
    if (!apiKey || apiKey.trim() === "") {
      return NextResponse.json(
        { error: "LIGHTHOUSE_API_KEY is empty or invalid" },
        { status: 500 }
      );
    }
    
    // Lighthouse uploadBuffer expects: (buffer, apiKey, cidVersion?)
    let res: any;
    try {
      // Validate API key format (should be like "xxxxx.xxxxxxxxxxxxx")
      const trimmedKey = apiKey.trim();
      if (!trimmedKey.includes(".")) {
        return NextResponse.json(
          { 
            error: "Invalid Lighthouse API key format",
            details: "API key should be in format: xxxxx.xxxxxxxxxxxxx"
          },
          { status: 500 }
        );
      }
      
      console.log("[Lighthouse Upload] Calling uploadBuffer...");
      res = await lighthouse.uploadBuffer(buffer, trimmedKey);
      console.log("[Lighthouse Upload] Response received:", JSON.stringify(res, null, 2));
    } catch (lighthouseError: any) {
      console.error("[Lighthouse Upload] Lighthouse SDK error:", lighthouseError);
      console.error("[Lighthouse Upload] Error type:", lighthouseError?.constructor?.name);
      console.error("[Lighthouse Upload] Error message:", lighthouseError?.message);
      console.error("[Lighthouse Upload] Error code:", lighthouseError?.code);
      console.error("[Lighthouse Upload] Error response:", lighthouseError?.response);
      console.error("[Lighthouse Upload] Full error:", JSON.stringify(lighthouseError, Object.getOwnPropertyNames(lighthouseError)));
      
      // Check for specific error types
      let errorDetails = lighthouseError?.message || String(lighthouseError);
      let errorCode = lighthouseError?.code || lighthouseError?.status;
      
      if (lighthouseError?.response) {
        try {
          const responseData = typeof lighthouseError.response === 'string' 
            ? lighthouseError.response 
            : JSON.stringify(lighthouseError.response);
          errorDetails += ` | Response: ${responseData}`;
        } catch (e) {
          errorDetails += ` | Response: ${String(lighthouseError.response)}`;
        }
      }
      
      // Check if it's an authentication error
      const errorStr = errorDetails.toLowerCase();
      if (errorStr.includes("authentication") || 
          errorStr.includes("401") ||
          errorStr.includes("unauthorized") ||
          errorCode === 401 ||
          errorCode === "UNAUTHORIZED") {
        return NextResponse.json(
          { 
            error: "Lighthouse authentication failed",
            details: "Your Lighthouse API key is invalid or expired. Please get a new API key from https://lighthouse.storage/ and update your web/.env file.",
            message: "Authentication failed"
          },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { 
          error: "Lighthouse SDK error",
          details: errorDetails,
          message: lighthouseError?.message || "Unknown error",
          type: lighthouseError?.constructor?.name || "Unknown",
          code: errorCode
        },
        { status: 500 }
      );
    }
    
    // Check response structure - could be res.data.Hash or res.Hash
    const cid = (res as any)?.data?.Hash || (res as any)?.Hash || (res as any)?.cid;
    
    if (!cid) {
      console.error("[Lighthouse Upload] No CID in response. Full response:", JSON.stringify(res, null, 2));
      return NextResponse.json(
        { 
          error: "No CID returned from Lighthouse",
          details: "Response structure: " + JSON.stringify(res),
          response: res
        },
        { status: 500 }
      );
    }
    
    console.log(`[Lighthouse Upload] Upload successful, CID: ${cid}`);
    return NextResponse.json({ cid });
  } catch (err) {
    console.error("[Lighthouse Upload] Unexpected error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    
    return NextResponse.json(
      { 
        error: "Upload to Lighthouse failed", 
        details: errorMessage,
        stack: errorStack?.substring(0, 1000) // Limit stack trace length
      },
      { status: 500 }
    );
  }
}


