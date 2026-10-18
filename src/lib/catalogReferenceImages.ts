import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

function dataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No pudimos leer la imagen."));
    reader.readAsDataURL(file);
  });
}

async function compress(file: File): Promise<Blob> {
  const src = await dataUrl(file);
  return new Promise(resolve => {
    const image = new Image();
    image.onerror = () => resolve(file);
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(image.width, 1200);
      canvas.height = Math.round(image.height * canvas.width / image.width);
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => resolve(blob || file), "image/jpeg", 0.8);
    };
    image.src = src;
  });
}

/** Mantiene upload + fallback Data URL legacy; no borra objetos Storage. */
export async function uploadCatalogReferenceImage(file: File): Promise<string> {
  // Storage no está emulado. Fallar antes de cualquier intento en demo/E2E.
  if (process.env.NEXT_PUBLIC_E2E_TEST_MODE === "1" || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.startsWith("demo-")) {
    throw new Error("En demo usá una URL de imagen existente; Storage no está emulado.");
  }
  const blob = await compress(file);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const imageRef = ref(storage, `productos/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`);
    return await Promise.race([
      uploadBytes(imageRef, blob).then(() => getDownloadURL(imageRef)),
      new Promise<string>((_, reject) => { timeout = setTimeout(() => reject(new Error("UPLOAD_TIMEOUT")), 8000); }),
    ]);
  } catch { return dataUrl(file); }
  finally { if (timeout) clearTimeout(timeout); }
}
