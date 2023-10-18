// create a simple pipiline
async function initPipeline(device: GPUDevice, format: GPUTextureFormat): Promise<{
    pipeline: GPURenderPipeline, bindGroup: GPUBindGroup}> {
    const module = device.createShaderModule({
        label: 'our hardcoded textured quad shaders',
        code: `
          struct OurVertexShaderOutput {
            @builtin(position) position: vec4f,
            @location(0) texcoord: vec2f,
          };
    
          @vertex fn vs(
            @builtin(vertex_index) vertexIndex : u32
          ) -> OurVertexShaderOutput {
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
    
            var vsOutput: OurVertexShaderOutput;
            let xy = pos[vertexIndex];
            vsOutput.position = vec4f(xy, 0.0, 1.0);
            vsOutput.texcoord = xy;
            return vsOutput;
          }
    
          @group(0) @binding(0) var ourSampler: sampler;
          @group(0) @binding(1) var ourTexture: texture_2d<f32>;
    
          @fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
            return textureSample(ourTexture, ourSampler, fsInput.texcoord);
          }
        `,
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
        }
    }

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
        format: 'rgba8unorm',
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST,
      });
      device.queue.writeTexture(
          { texture },
          textureData,
          { bytesPerRow: kTextureWidth * 4 },
          { width: kTextureWidth, height: kTextureHeight },
      );

      const sampler = device.createSampler();
      const pipeline = await device.createRenderPipelineAsync(descriptor);
      
      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: texture.createView() },
        ],
      });
  
    
    return {pipeline, bindGroup};
}

export async function textureScript (device: GPUDevice, context: GPUCanvasContext, format: GPUTextureFormat) {
    const { pipeline, bindGroup } = await initPipeline(device, format);

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