/** Обробка фото в браузері: стискаємо перед відправкою на сервер. */

export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
    img.src = url;
  });
}

function drawScaled(img, max) {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** JPEG як data URL, не більше ~1,8 МБ (ліміт запиту Vercel — 4,5 МБ). */
function toJpegDataUrl(img) {
  for (const [max, quality] of [[1400, 0.82], [1200, 0.78], [1000, 0.72], [800, 0.68]]) {
    const url = drawScaled(img, max).toDataURL("image/jpeg", quality);
    if (url.length < 1_800_000) return url;
  }
  return drawScaled(img, 640).toDataURL("image/jpeg", 0.6);
}

/**
 * Готує фото до завантаження: повна версія для рецепта (до 1400px)
 * і мала (640px) для карток у списку — так список вантажиться в рази швидше.
 */
export function preparePhoto(img) {
  return {
    image: toJpegDataUrl(img),
    thumb: drawScaled(img, 640).toDataURL("image/jpeg", 0.76),
  };
}
