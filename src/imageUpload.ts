const MAX_IMAGE_SIZE_BYTES = 6 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface ImageLike {
  type: string;
  size: number;
}

export interface NamedFileLike {
  name: string;
  size: number;
}

export function isSupportedImageFile(file: ImageLike) {
  return SUPPORTED_IMAGE_TYPES.has(file.type) && file.size <= MAX_IMAGE_SIZE_BYTES;
}

export function getImageUploadLabel(file: NamedFileLike | null) {
  if (!file) return 'Chưa chọn ảnh';
  const sizeKb = file.size / 1024;
  return `${file.name} - ${sizeKb.toFixed(1)} KB`;
}

export function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Không đọc được dữ liệu ảnh.'));
      }
    };
    reader.onerror = () => reject(new Error('Không đọc được file ảnh.'));
    reader.readAsDataURL(file);
  });
}
