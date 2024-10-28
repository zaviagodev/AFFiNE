import type { AttachmentBlockModel } from '@blocksuite/affine/blocks';

export async function getAttachmentBlob(model: AttachmentBlockModel) {
  const sourceId = model.sourceId;
  if (!sourceId) {
    return null;
  }

  const doc = model.doc;
  let blob = await doc.blobSync.get(sourceId);

  if (blob) {
    blob = new Blob([blob], { type: model.type });
  }

  return blob;
}

export function download(model: AttachmentBlockModel) {
  (async () => {
    const blob = await getAttachmentBlob(model);
    if (!blob) {
      return;
    }

    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = model.name;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  })().catch(console.error);
}

export function renderItem(
  scroller: HTMLElement | null,
  id: number,
  imageData: ImageData
) {
  if (!scroller) return;

  const wrapper = scroller.querySelector(`[data-index="${id}"]`);
  if (!wrapper) return;

  const item = wrapper.firstElementChild;
  if (!item) return;
  if (item.firstElementChild) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas.style.width = '100%';
  canvas.style.height = '100%';

  ctx.putImageData(imageData, 0, 0);

  item.append(canvas);
}
