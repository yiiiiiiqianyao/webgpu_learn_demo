import { generateMips } from "./mipmap";

// GPUTextureUsage
// TEXTURE_BINDING  着色器资源的绑定
// COPY_DST & RENDER_ATTACHMENT 用于写入数据的纹理的配置

export function initVideoTexture(device: GPUDevice, video: HTMLVideoElement) {
  const texture = device.createTexture({
      format: 'rgba8unorm',
      // mipLevelCount: options.mips ? numMipLevels(source.width, source.height) : 1,
      size: [video.videoWidth, video.videoHeight],
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });
  copyVideoSourceToTexture(device, texture, video);
  return texture;
}

// 加载图片并转化为 ImageBitMap 类型的图像 data
export async function loadImageBitmap(url: string) {
    const res = await fetch(url);
    const blob = await res.blob();
    // colorSpaceConversion 告知浏览器不需要对加载的图像数据应用色彩空间
    // 通常在 WebGPU 中，可能会加载法线贴图或高度贴图或非颜色数据的图像。在这些情况下，我们绝对不希望浏览器弄乱图像中的数据。
    return await createImageBitmap(blob, { colorSpaceConversion: 'none' });
}

export function createTextureFromSource(device: GPUDevice, source: ImageBitmap, format: GPUTextureFormat, options = {mips: true, flipY: true}) {
    const numMipLevels = (...sizes: any[]) => {
        const maxSize = Math.max(...sizes);
        return 1 + Math.log2(maxSize) | 0;
    };
    const texture = device.createTexture({
      format,
      mipLevelCount: options.mips ? numMipLevels(source.width, source.height) : 1,
      size: [source.width, source.height],
      usage: GPUTextureUsage.TEXTURE_BINDING |
             GPUTextureUsage.COPY_DST |
             GPUTextureUsage.RENDER_ATTACHMENT,
    });
    copySourceToTexture(device, texture, source, options);
    return texture;
}

export function copySourceToTexture(device: GPUDevice, texture: GPUTexture, source: ImageBitmap, {flipY}: any = {flipY: true}) {
    device.queue.copyExternalImageToTexture(
      { source, flipY, },
      { texture },
      { width: source.width, height: source.height },
    );
    if (texture.mipLevelCount > 1) {
      generateMips(device, texture);
    }
  }

  export function copyVideoSourceToTexture(device: GPUDevice, texture: GPUTexture, source: HTMLVideoElement) {
    device.queue.copyExternalImageToTexture(
      { source, flipY: true, },
      { texture },
      { width: source.videoWidth, height: source.videoHeight }
    );
  }
