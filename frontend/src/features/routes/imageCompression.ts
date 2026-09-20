/**
 * Image Compression and Optimization Utility
 * Enforces client-side resizing and compression to ensure images stay strictly <= 45 KB
 * as required by the backend shipment creation API.
 */

export interface CompressedImageResult {
  blob: Blob;
  file: File;
  sizeBytes: number;
  sizeKb: number;
  dataUrl: string;
  width: number;
  height: number;
}

const MAX_IMAGE_SIZE_BYTES = 45 * 1024; // 45 KB = 46,080 bytes

/**
 * Loads an image File or Blob into an HTMLImageElement
 */
function loadImage(fileOrBlob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(fileOrBlob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for compression"));
    };
    img.src = url;
  });
}

/**
 * Converts a Canvas to a Blob of given MIME type and quality
 */
function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob conversion failed"));
      },
      mimeType,
      quality
    );
  });
}

/**
 * Compresses an image file or blob to ensure it does not exceed maxSizeBytes (default 45 KB).
 * Progressively downscales dimensions and JPEG quality until the target size is achieved.
 */
export async function compressImageFile(
  fileOrBlob: File | Blob,
  maxSizeBytes: number = MAX_IMAGE_SIZE_BYTES,
  fileName = "consignment.jpg"
): Promise<CompressedImageResult> {
  const img = await loadImage(fileOrBlob);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not initialize 2D canvas context for compression");
  }

  // Dimension scaling stages (start at max 640px, scale down if needed)
  const maxDimensions = [640, 480, 360, 260, 180];
  const qualitySteps = [0.82, 0.65, 0.5, 0.35, 0.2];

  let bestBlob: Blob | null = null;
  let bestWidth = img.width;
  let bestHeight = img.height;

  for (const maxDim of maxDimensions) {
    // Calculate aspect ratio preserving dimensions
    let targetWidth = img.width;
    let targetHeight = img.height;

    if (targetWidth > maxDim || targetHeight > maxDim) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
        targetWidth = maxDim;
      } else {
        targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
        targetHeight = maxDim;
      }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Draw with high quality smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // Try varying quality steps for these dimensions
    for (const q of qualitySteps) {
      const blob = await canvasToBlob(canvas, "image/jpeg", q);
      if (blob.size <= maxSizeBytes) {
        bestBlob = blob;
        bestWidth = targetWidth;
        bestHeight = targetHeight;
        break;
      }
    }

    if (bestBlob && bestBlob.size <= maxSizeBytes) {
      break;
    }
  }

  if (!bestBlob || bestBlob.size > maxSizeBytes) {
    throw new Error(
      `Image size (${Math.round((bestBlob?.size || fileOrBlob.size) / 1024)} KB) exceeds the 45 KB maximum limit and could not be compressed further. Please select a smaller or lower resolution image.`
    );
  }

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(bestBlob);
  });

  const file = new File([bestBlob], fileName, { type: "image/jpeg" });

  return {
    blob: bestBlob,
    file,
    sizeBytes: bestBlob.size,
    sizeKb: Math.round((bestBlob.size / 1024) * 10) / 10,
    dataUrl,
    width: bestWidth,
    height: bestHeight
  };
}

/**
 * Generates an instant sample consignment verification badge image (~12 KB),
 * allowing users and testers to test the Create Shipment flow in 1 click without browsing files.
 */
export async function generateSampleConsignmentImage(
  consignmentId = "NXR-CARGO-2026"
): Promise<CompressedImageResult> {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 240;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not initialize canvas");

  // Modern card background
  const grad = ctx.createLinearGradient(0, 0, 400, 240);
  grad.addColorStop(0, "#003356");
  grad.addColorStop(1, "#001d34");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 400, 240);

  // Border & Header
  ctx.strokeStyle = "#4da3ff";
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 384, 224);

  // Header banner
  ctx.fillStyle = "#cfe4ff";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("NER LOGISTICS • DISPATCH VERIFICATION", 20, 36);

  // Consignment ID
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px monospace";
  ctx.fillText(consignmentId, 20, 72);

  // Metadata tags
  ctx.fillStyle = "#9ecaff";
  ctx.font = "12px sans-serif";
  ctx.fillText("Cargo: Medical Supplies (Cold Chain 2-8°C)", 20, 102);
  ctx.fillText("Corridor: Guwahati ➔ Shillong Arterial", 20, 124);
  ctx.fillText(`Verified: ${new Date().toLocaleDateString()} • Dispatch Ready`, 20, 146);

  // Status Chip
  ctx.fillStyle = "#005148";
  ctx.fillRect(20, 170, 150, 32);
  ctx.fillStyle = "#6ffbbe";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("✓ INSPECTED & SEALED", 30, 191);

  // Simulated barcode / QR pattern
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 28; i++) {
    const w = (i % 3 === 0 ? 4 : 2);
    ctx.fillRect(250 + i * 4.5, 168, w, 36);
  }

  const blob = await canvasToBlob(canvas, "image/jpeg", 0.75);
  const file = new File([blob], `${consignmentId}.jpg`, { type: "image/jpeg" });

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  return {
    blob,
    file,
    sizeBytes: blob.size,
    sizeKb: Math.round((blob.size / 1024) * 10) / 10,
    dataUrl,
    width: 400,
    height: 240
  };
}

/**
 * Generates an instant sample driver verification photograph (~12 KB),
 * allowing users and testers to test the Create Shipment flow in 1 click without browsing files.
 */
export async function generateSampleDriverPhoto(
  driverName = "T. Sangma",
  licenseId = "DL-01-2024-8841"
): Promise<CompressedImageResult> {
  const canvas = document.createElement("canvas");
  canvas.width = 360;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not initialize canvas");

  // Modern driver card background
  const grad = ctx.createLinearGradient(0, 0, 360, 360);
  grad.addColorStop(0, "#003356");
  grad.addColorStop(1, "#001d34");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 360, 360);

  // Border
  ctx.strokeStyle = "#4da3ff";
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 340, 340);

  // Header banner
  ctx.fillStyle = "#cfe4ff";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("NER LOGISTICS • CERTIFIED DRIVER ID", 180, 42);

  // Driver Photo Avatar circle
  ctx.beginPath();
  ctx.arc(180, 120, 50, 0, Math.PI * 2);
  ctx.fillStyle = "#174a73";
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Avatar initials
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 30px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const initials = driverName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2) || "DR";
  ctx.fillText(initials, 180, 120);

  // Driver Name
  ctx.font = "bold 18px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(driverName, 180, 205);

  // License ID
  ctx.font = "bold 12px monospace";
  ctx.fillStyle = "#9ecaff";
  ctx.fillText(`ID: ${licenseId}`, 180, 230);

  // Verified Badge Pill
  ctx.fillStyle = "#005148";
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(60, 258, 240, 34, 17);
  } else {
    ctx.rect(60, 258, 240, 34);
  }
  ctx.fill();

  ctx.fillStyle = "#6ffbbe";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("✓ VERIFIED DRIVER PHOTO", 180, 279);

  // Timestamp
  ctx.fillStyle = "#8ba3b8";
  ctx.font = "10px sans-serif";
  ctx.fillText(`Recorded: ${new Date().toLocaleDateString()} • Dispatch Ready`, 180, 322);

  const blob = await canvasToBlob(canvas, "image/jpeg", 0.8);
  const file = new File([blob], `driver_${driverName.toLowerCase().replace(/\s+/g, "_")}.jpg`, {
    type: "image/jpeg"
  });

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  return {
    blob,
    file,
    sizeBytes: blob.size,
    sizeKb: Math.round((blob.size / 1024) * 10) / 10,
    dataUrl,
    width: 360,
    height: 360
  };
}
