/** Browser-only, bounded raster loading. Requests never carry Firebase credentials. */
export async function pdfRasterThumbnail(url: string): Promise<string | null> {
  if (!url) return null;
  let objectUrl = "";
  try {
    const parsed = new URL(url,window.location.origin);
    // Uploads may legitimately fall back to embedded raster data URLs.
    // Do not allow SVG, HTML, arbitrary schemes or unbounded embedded payloads.
    const embedded = parsed.protocol === "data:";
    if (embedded) {
      if (url.length > 5600000 || !/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=\r\n]+$/i.test(url)) return null;
    } else if (!["https:","http:"].includes(parsed.protocol)) return null;
    const response = await fetch(parsed.href,{credentials:"omit",signal:AbortSignal.timeout(5000)});
    if (!response.ok || Number(response.headers.get("content-length")) > 4*1024*1024) return null;
    const blob = await response.blob();
    if (blob.size>4*1024*1024 || !/^image\/(png|jpeg|webp)$/.test(blob.type)) return null;
    objectUrl = URL.createObjectURL(blob);
    const img = new Image();img.src=objectUrl;await img.decode();
    if (!img.width || !img.height || img.width*img.height>40000000) return null;
    const canvas=document.createElement("canvas");canvas.width=160;canvas.height=160;
    const context=canvas.getContext("2d");if(!context)return null;
    context.fillStyle="#ffffff";context.fillRect(0,0,160,160);
    const scale=Math.min(160/img.width,160/img.height);
    context.drawImage(img,(160-img.width*scale)/2,(160-img.height*scale)/2,img.width*scale,img.height*scale);
    return canvas.toDataURL("image/jpeg",0.8);
  } catch { return null; } finally { if(objectUrl)URL.revokeObjectURL(objectUrl); }
}
