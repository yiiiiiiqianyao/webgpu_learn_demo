export async function getDevice() {
    try {
        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance' // 'low-power'
        }) as GPUAdapter;
        const device = await adapter.requestDevice();
        return device;
    } catch (error) {
        // log error
        console.error('Failed to get GPU device:', error);
        return null;
    }

}

// listen canvas resize event
export function ListenCanvasResize(canvas: HTMLCanvasElement, device: GPUDevice, callback: (width: number, height: number) => void) {
    const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const canvas = entry.target as HTMLCanvasElement;
                // contentBoxSize is the size of the element's content box
                // inlineSize is the width of the content box
                // blockSize is the height of the content box
                const width = entry.contentBoxSize[0].inlineSize;
                const height = entry.contentBoxSize[0].blockSize;
                canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
                canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
                // re-render
                // don't need to recall context.configure() after v104
                callback(width, height);
            }
        });
    resizeObserver.observe(canvas);
    return resizeObserver;
}


// generate cube map face canvas
let top = 0;
export function generateFace(size: number, {faceColor, textColor, text}: any) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.style.position = "absolute";
  canvas.style.top = top + "px";
  top += 128;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = faceColor;
  ctx.fillRect(0, 0, size, size);
  ctx.font = `${size * 0.7}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  ctx.fillText(text, size / 2, size / 2);
  return canvas;
}