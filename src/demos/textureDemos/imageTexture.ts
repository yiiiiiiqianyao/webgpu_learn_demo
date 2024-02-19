import { loadImageBitmap } from "../utils/utils";

const code = `
struct v2f {
  @builtin(position) position: vec4f,
  @location(0) texCoord: vec2f,
};

@vertex fn vs(@builtin(vertex_index) vertexIndex : u32) -> v2f {
  let pos = array(
    // 1st triangle
    vec2f( 0.0,  0.0),  // center
    vec2f( 1.0,  0.0),  // right, center
    vec2f( 0.0,  1.0),  // center, top

    // 2st triangle
    vec2f( 0.0,  1.0),  // center, top
    vec2f( 1.0,  0.0),  // right, center
    vec2f( 1.0,  1.0),  // right, top
  );

  var vsOutput: v2f;
  let xy = pos[vertexIndex];
  // 顶点坐标 - 设置 vertex 的 gl_Position
  vsOutput.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  // uv 坐标
  vsOutput.texCoord = pos[vertexIndex];
  return vsOutput;
}

@group(0) @binding(0) var ourSampler: sampler;
@group(0) @binding(1) var ourTexture: texture_2d<f32>;

@fragment fn fs(fsInput: v2f) -> @location(0) vec4f {
    // ourTexture 被采样的纹理
    // ourSampler 采样器
    // fsInput.texCoord 采样坐标 FlipY
    // let uv = vec2f(fsInput.texCoord.x, 1.0 - fsInput.texCoord.y);
    let uv = fsInput.texCoord.xy;
    return textureSample(ourTexture, ourSampler, uv);
}
`

// 根据图片请求纹理
export async function initImgTexture(device: GPUDevice) {
    // texture img
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
    { width: source.width, height: source.height });
    return texture;
}

// create a simple pipiline
async function initPipeline(device: GPUDevice, format: GPUTextureFormat): Promise<GPURenderPipeline> {
    const module = device.createShaderModule({
        label: 'our hardcoded textured quad shaders',
        code,
    });
    
    const descriptor: GPURenderPipelineDescriptor = {
        label: 'hardcoded textured quad pipeline',
        layout: 'auto',
        vertex: {
            module,
            entryPoint: 'vs'
        },
        primitive: {
            topology: 'triangle-list' // try point-list, line-list, line-strip, triangle-strip?
        },
        fragment: {
            module,
            entryPoint: 'fs',
            targets: [ // 定义了一系列的 render target
                {
                    format: format // render target format has to specify
                }
            ]
        },
        // multisample: {
        //     count: 1, // 1 or 4
        // }
    }
    const pipeline = await device.createRenderPipelineAsync(descriptor);
    return pipeline;
}

export async function textureScript (device: GPUDevice, context: GPUCanvasContext, format: GPUTextureFormat) {
    const pipeline = await initPipeline(device, format);

    
     // 纹理采样器
     const sampler = device.createSampler({
        // addressModeU: 'repeat',
        // addressModeU: 'clamp-to-edge',
        // addressModeV: 'repeat',
        // addressModeV: 'clamp-to-edge',
        // magFilter: 'nearest',  // filter 选取最近的 pixel
        magFilter: 'linear', // filter 线性插值
        // minFilter
        // mipmapFilter
    });
    const texture = await initImgTexture(device);

    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: texture.createView() },
        ],
    });

    const view: GPUTextureView = context.getCurrentTexture().createView();
    const renderPassDescriptor: GPURenderPassDescriptor = {
        label: 'our basic canvas renderPass',
        colorAttachments: [
            { // 在 fragment shader 中通过 location(0) 指定了这个输出的颜色附件
                view: view,
                clearValue: [0.3, 0.3, 0.3, 1],
                loadOp: 'clear', // clear/load clear：to clear the texture to the clear value before drawing
                storeOp: 'store' // store/discard
            }
        ]
    };
    const commandEncoder = device.createCommandEncoder({
        label: 'render quad encoder',
    });
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.draw(6);
    passEncoder.end();

    const commandBuffer = commandEncoder.finish();
    device.queue.submit([commandBuffer]);
    
}