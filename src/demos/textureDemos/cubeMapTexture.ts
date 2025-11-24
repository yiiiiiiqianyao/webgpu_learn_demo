const cubeCode = `
  struct Uniforms {
    matrix: mat4x4f,
  };

  struct Vertex {
    @location(0) position: vec4f,
  };

  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
  };

  @group(0) @binding(0) var<uniform> uni: Uniforms;
  @group(0) @binding(1) var ourSampler: sampler;
  // texture_cube
  @group(0) @binding(2) var ourTexture: texture_cube<f32>;

  @vertex fn vs(vert: Vertex) -> VSOutput {
    var vsOut: VSOutput;
    vsOut.position = uni.matrix * vert.position;
    vsOut.normal = normalize(vert.position.xyz);
    return vsOut;
  }

  @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
    return textureSample(ourTexture, ourSampler, normalize(vsOut.normal));
  }
`
export async function initPipeline(device: GPUDevice, format: GPUTextureFormat): Promise<GPURenderPipeline> {
  const module = device.createShaderModule({
    label: 'cube map texture',
    code: cubeCode,
  });
  
  const descriptor: GPURenderPipelineDescriptor = {
      label: 'cube texture atlas pipeline',
      layout: 'auto',
      vertex: {
        module,
        entryPoint: 'vs',
        buffers: [
            {
              // 顶点数据三位（shader 中为四位，最后一位自动补全）
              arrayStride: (3) * 4, // (3+2) floats 4 bytes each
              attributes: [
                { shaderLocation: 0, offset: 0, format: 'float32x3' },  // position                    
              ],
            },
          ],
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
      primitive: {
        topology: 'triangle-list', // try point-list(default), line-list, line-strip, triangle-strip?
        cullMode: 'back',
      },
      // 深度缓冲模版配置
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
      }
  }
  const pipeline = await device.createRenderPipelineAsync(descriptor);
  return pipeline;
}