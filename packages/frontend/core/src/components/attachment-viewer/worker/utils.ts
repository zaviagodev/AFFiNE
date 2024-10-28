export function resizeImageBitmap(
  imageData: ImageData,
  options: {
    resizeWidth: number;
    resizeHeight: number;
  }
) {
  return createImageBitmap(imageData, 0, 0, imageData.width, imageData.height, {
    colorSpaceConversion: 'none',
    resizeQuality: 'pixelated',
    ...options,
  });
}
