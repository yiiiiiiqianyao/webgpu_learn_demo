在 WebGPU 中播放视频，我们可以通过以下两种方法创建视频纹理
- 使用 copyExternalImageToTexture 往我们创建的纹理中导入视频源的纹理数据

- 使用 importExternalTexture 将视频作为外部源，直接读取视频的 GPU 纹理
在使用 importExternalTexture 的时候有一些需要注意的点:
1. 在每次渲染的时候，如视频播放的更新，我们必须要重新调用一次 importExternalTexture 以获取新的纹理
2. 在 shader 中，我们需要使用额外的纹理类型 texture_external
3. 在 shader 中进行采样，只能是使用 textureSamplerBaseClampToEdge 方法，
    此时若我们在 sampler 中设置 addressModeU/V: 'repeat' 将不会生效，为了实现 repeat，只能在 shader 中实现
    ```c++
    let color = textureSAmpleBaseClampToEdge(
        someExternalTexture,
        someSampler,
        fract(texcoord)
    );
    ```
    此时我们无法生成 mipmap，只能使用输入纹理的 mip level0