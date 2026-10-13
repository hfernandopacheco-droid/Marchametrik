/**
 * Image processing utilities with no file size restrictions.
 * Compresses very large camera images gracefully via HTML5 canvas to ensure
 * reliable storage and fast UI loading.
 */

export interface ProcessedImage {
  name: string;
  url: string;
  sizeBytes: number;
}

export const processImageFile = (file: File): Promise<ProcessedImage> => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('El archivo seleccionado no es una imagen válida.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));

    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) {
        reject(new Error('No se pudo procesar la imagen.'));
        return;
      }

      // Create an image element to inspect dimensions
      const img = new Image();
      img.onerror = () => {
        // Fallback: return raw data URL without resizing
        resolve({
          name: file.name,
          url: result,
          sizeBytes: file.size,
        });
      };

      img.onload = () => {
        try {
          const maxDim = 1920; // High definition resolution
          let width = img.width;
          let height = img.height;

          // If image is within bounds, return original data URL
          if (width <= maxDim && height <= maxDim && file.size < 2 * 1024 * 1024) {
            resolve({
              name: file.name,
              url: result,
              sizeBytes: file.size,
            });
            return;
          }

          // Scale down proportionally
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve({ name: file.name, url: result, sizeBytes: file.size });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.90);

          resolve({
            name: file.name,
            url: compressedDataUrl,
            sizeBytes: Math.round(compressedDataUrl.length * 0.75),
          });
        } catch (_) {
          resolve({
            name: file.name,
            url: result,
            sizeBytes: file.size,
          });
        }
      };

      img.src = result;
    };

    reader.readAsDataURL(file);
  });
};
