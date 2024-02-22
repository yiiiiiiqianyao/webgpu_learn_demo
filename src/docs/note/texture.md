### Texture Value
创建纹理，同时需要往纹理中绑定图片资源
```js
const imgUrl = 'https://mdn.alipayobjects.com/huamei_uu41p1/afts/img/A*Eq-fQ5jQPYQAAAAAAAAAAAAADhyWAQ/original';
const source = await loadImageBitmap(imgUrl);
const texture = device.createTexture({
    label: imgUrl,
    format: 'rgba8unorm',
    size: [source.width, source.height],
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
});
// Note: copyExternalImageToTexture
// 在使用 copyExternalImageToTexture 往 texture 中写入数据的时候 需要设置 texture 的 usage 为 GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
device.queue.copyExternalImageToTexture(
    { source, flipY: true },
    { texture },
    { width: source.width, height: source.height }
);
```
### Texture Unifrom-Bind Shader
往 shader 中传递 uniform 的 texture 纹理的时候，在 bindGroup 中至少需要传入一个 sampler 采样器以及一个 textureView 纹理视图
```js
const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: texture.createView() },
    ],
});
```
### Texture atlas

In computer graphics, a texture atlas (also called a spritesheet or an image sprite in 2d game development) is an image containing multiple smaller images, usually packed together to reduce overall dimensions.[1] An atlas can consist of uniformly-sized images or images of varying dimensions.[1] A sub-image is drawn using custom texture coordinates to pick it out of the atlas.

Benefits
In an application where many small textures are used frequently, it is often more efficient to store the textures in a texture atlas which is treated as a single unit by the graphics hardware. This reduces both the disk I/O overhead and the overhead of a context switch by increasing memory locality. Careful alignment may be needed to avoid bleeding between sub textures when used with mipmapping and texture compression.