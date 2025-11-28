const gateway =
  process.env.NEXT_PUBLIC_LIGHTHOUSE_GATEWAY ||
  "https://gateway.lighthouse.storage/ipfs";

export async function uploadJsonToLighthouse<T extends Record<string, unknown>>(
  payload: T
) {
  const blob = new Blob([JSON.stringify(payload)], {
    type: "application/json",
  });

  const file = new File([blob], `chat-${Date.now()}.json`, {
    type: "application/json",
  });

  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/lighthouse/upload", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const responseText = await res.text();
    let body: any = {};
    try {
      body = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Upload failed (${res.status}): ${responseText || "Unknown error"}`);
    }
    
    const errorMsg = body.details || body.error || body.message || `Failed to upload to Lighthouse (${res.status})`;
    console.error("Lighthouse upload error:", body);
    
    const errorLower = errorMsg.toLowerCase();
    
    // Provide helpful message for authentication errors
    if (res.status === 401 || errorLower.includes("authentication") || errorLower.includes("unauthorized")) {
      throw new Error("Lighthouse authentication failed. Your API key may be invalid or expired. Please get a new API key from https://lighthouse.storage/ and update your web/.env file.");
    }
    
    // Handle trial expired error
    if (errorLower.includes("trial expired") || errorLower.includes("trial") && errorLower.includes("expired")) {
      throw new Error("Lighthouse trial expired. Please upgrade your Lighthouse account or get a new API key from https://lighthouse.storage/");
    }
    
    throw new Error(errorMsg);
  }

  const responseText = await res.text();
  let data: { cid: string };
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Invalid response format: ${responseText}`);
  }
  
  if (!data.cid) {
    throw new Error("No CID returned from upload. Response: " + JSON.stringify(data));
  }
  
  return data.cid;
}

export async function fetchLighthouseJson<T = unknown>(cid: string) {
  const res = await fetch(`${gateway}/${cid}`);
  if (!res.ok) {
    throw new Error("Unable to fetch object from Lighthouse");
  }
  return (await res.json()) as T;
}



