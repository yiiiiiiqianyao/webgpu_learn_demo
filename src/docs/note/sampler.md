- WebGPU 为了采样纹理需要额外的采样器
```js
const sampler = device.createSampler({
    addressModeU: 'repeat',
    addressModeV: 'repeat',
    magFilter: 'linear',        // nearest
    minFilter: 'linear',        // nearest
    mipmapFilter: 'linear',     // nearest
});
```
- addressModeU / addressModeV
    纹理 UV 的布局方式
    repeat
    clamp
    mirror

- magFilter / minFilter
当显示区域大于纹理内容范围时或显示区域小于纹理内容范围时，采样器的采样方式
    linear  最近几个像素的 mix
    nearest 采样最近的像素

- mipmapFilter
mipmap 纹理采样过滤
    linear  最近两个层级 mipmap 的 mix // In mipmapFilter: 'linear', colors are sampled from 2 mip levels
    nearest 采样最近的 mipmap level 

