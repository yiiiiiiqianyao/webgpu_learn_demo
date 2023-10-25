import { loadImageBitmap } from "./utils";

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

// 根据数据构造纹理
export function initRawTexture(device: GPUDevice) {
    const kTextureWidth = 5;
    const kTextureHeight = 7;
    const _ = [255,   0,   0, 255];  // red
    const y = [255, 255,   0, 255];  // yellow
    const b = [  0,   0, 255, 255];  // blue
    const textureData = new Uint8Array([
      b, _, _, _, _,
      _, y, y, y, _,
      _, y, _, _, _,
      _, y, y, _, _,
      _, y, _, _, _,
      _, y, _, _, _,
      _, _, _, _, _,
    ].flat());
    const texture = device.createTexture({
        label: 'yellow F on red',
        size: [kTextureWidth, kTextureHeight],
        format: 'rgba8unorm', // 8 位 4 通道的格式 unorm => ns unsigned normalized
        // 在该种格式：若我们输入的是 [64, 128, 192, 255]，那么在 shader 中接收到的值为 [64 / 255, 128 / 255, 192 / 255, 255 / 255]
        // 或者我们直接输入 0 - 1 之间的值，如 [0.25, 0.50, 0.75, 1.00]
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        // GPUTextureUsage.TEXTURE_BINDING 表示我们要把这个纹理对象绑定到一个绑定组
      });
    // 往 texture 对象中写入数据
    device.queue.writeTexture({ texture },
        textureData,
        { 
        bytesPerRow: kTextureWidth * 4, // 每行的字节数
        },
        { width: kTextureWidth, height: kTextureHeight },
    );
    return texture;
}

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

const size = 256;
const ctx = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
ctx.canvas.width = size;
ctx.canvas.height = size;
const canvasSource = ctx.canvas;
let canvasTime = 0.1;
function updateCanvasTexture() {
    const size = 256;
    const half = size / 2;
    const num = 20;
    canvasTime += 0.001;
    const time = canvasTime;
    const hsl = (h: number, s: number, l: number) => `hsl(${h * 360 | 0}, ${s * 100}%, ${l * 100 | 0}%)`;
    ctx.save();
    ctx.clearRect(0, 0, size, size);
    ctx.translate(half, half);
    for (let i = 0; i < num; ++i) {
      ctx.fillStyle = hsl(i / num * 0.2 + time * 0.1, 1, i % 2 * 0.5);
      ctx.fillRect(-half, -half, size, size);
      ctx.rotate(time * 0.5);
      ctx.scale(0.85, 0.85);
      ctx.translate(size / 16, 0);
    }
    ctx.restore();
}

export function initCanvasTexture(device: GPUDevice) {
    updateCanvasTexture();
    const texture = device.createTexture({
        format: 'rgba8unorm',
        // mipLevelCount: options.mips ? numMipLevels(source.width, source.height) : 1,
        size: [canvasSource.width, canvasSource.height],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture(
        { source: canvasSource, flipY: true, },
        { texture },
        { width: canvasSource.width, height: canvasSource.height });
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
    // const texture = initRawTexture(device);
    // const texture = await initImgTexture(device);
    const texture = await initCanvasTexture(device);

    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: texture.createView() },
        ],
    });

    
    const render = () => {
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
        // update canvas/video
        updateCanvasTexture();
        device.queue.copyExternalImageToTexture(
            { source: canvasSource, flipY: true, },
            { texture },
            { width: canvasSource.width, height: canvasSource.height }
        );

        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.draw(6);
        passEncoder.end();
    
        const commandBuffer = commandEncoder.finish();
        device.queue.submit([commandBuffer]);
        requestAnimationFrame(render);
    }
    render();
    
}