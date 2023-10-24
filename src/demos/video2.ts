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
  // 顶点坐标
  vsOutput.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  // uv 坐标
  vsOutput.texCoord = pos[vertexIndex];
  return vsOutput;
}

@group(0) @binding(0) var ourSampler: sampler;
@group(0) @binding(1) var ourTexture: texture_external;

@fragment fn fs(fsInput: v2f) -> @location(0) vec4f {
    // ourTexture 被采样的纹理
    // ourSampler 采样器
    // fsInput.texCoord 采样坐标 FlipY
    let uv = vec2f(fsInput.texCoord.x, 1.0 - fsInput.texCoord.y);
    // let uv = fsInput.texCoord.xy;
    return textureSampleBaseClampToEdge(ourTexture, ourSampler, uv);
}
`

const video = document.createElement('video');
video.muted = true;
video.loop = true;
video.preload = 'auto';
video.crossOrigin = 'none';
video.src = 'https://gw.alipayobjects.com/v/huamei_uu41p1/afts/video/yzUYR5pOpwcAAAAAAAAAAAAAK4eUAQBr';

function copySourceToTexture(device: GPUDevice, texture: GPUTexture, source: HTMLVideoElement) {
    device.queue.copyExternalImageToTexture(
      { source, flipY: true, },
      { texture },
      { width: video.videoWidth, height: video.videoHeight });
  }

export function initVideoTexture(device: GPUDevice) {
    const texture = device.createTexture({
        format: 'rgba8unorm',
        // mipLevelCount: options.mips ? numMipLevels(source.width, source.height) : 1,
        size: [video.videoWidth, video.videoHeight],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    copySourceToTexture(device, texture, video);
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

export async function videoScript (device: GPUDevice, context: GPUCanvasContext, format: GPUTextureFormat) {
    const pipeline = await initPipeline(device, format);
    
     // 纹理采样器
     const sampler = device.createSampler({
        // addressModeU: 'repeat',
        // addressModeU: 'clamp-to-edge',
        // addressModeV: 'repeat',
        // addressModeV: 'clamp-to-edge',
        // magFilter: 'nearest',  // filter 选取最近的 pixel
        magFilter: 'linear', // filter 线性插值
    });
    video.play();

    setTimeout( async() => {
        console.log('load');
        // const texture = await initVideoTexture(device);
        const render = () => {
            const videoFrame = new VideoFrame(video);
            videoFrame.close();

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

            const texture = device.importExternalTexture({
                source: video,
            })
            const bindGroup = device.createBindGroup({
                layout: pipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: sampler },
                    { binding: 1, resource: texture },
                ],
            });
    
            passEncoder.setBindGroup(0, bindGroup);
            passEncoder.draw(6);
            passEncoder.end();
        
            const commandBuffer = commandEncoder.finish();
            device.queue.submit([commandBuffer]);
            requestAnimationFrame(render);
        }
        render();
    }, 1000)
    
}