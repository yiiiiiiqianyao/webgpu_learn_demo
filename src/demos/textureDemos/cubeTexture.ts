import { mat4 } from "../utils/mat4";
import { degToRad } from "../utils/math";
import { createCubeVertices } from "../utils/mesh";
import { createTextureFromSource, loadImageBitmap } from "../utils/texture";

const cubeCode = `
struct Uniforms {
  matrix: mat4x4f,
};

struct Vertex {
  @location(0) position: vec4f,
  @location(1) texcoord: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var ourSampler: sampler;
@group(0) @binding(2) var ourTexture: texture_2d<f32>;

@vertex fn vs(vert: Vertex) -> VSOutput {
  var vsOut: VSOutput;
  vsOut.position = uni.matrix * vert.position;
  vsOut.texcoord = vert.texcoord;
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return textureSample(ourTexture, ourSampler, vsOut.texcoord);
}
`
async function initPipeline(device: GPUDevice, format: GPUTextureFormat): Promise<GPURenderPipeline> {
    const module = device.createShaderModule({
        label: 'cube with texture atlas',
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
                    // 顶点数据三位（shader 中为四位，最后一位自动补全） uv 数据两位
                  arrayStride: (3 + 2) * 4, // (3+2) floats 4 bytes each
                  attributes: [
                    { shaderLocation: 0, offset: 0, format: 'float32x3' },  // position
                    { shaderLocation: 1, offset: 12, format: 'float32x2' },  // texcoord
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
            // default topology
            topology: 'triangle-list', // try point-list, line-list, line-strip, triangle-strip?
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

export async function textureScript (device: GPUDevice, context: GPUCanvasContext, format: GPUTextureFormat, canvas: HTMLCanvasElement) {
    const pipeline = await initPipeline(device, format);

     // 纹理采样器
    const sampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        mipmapFilter: 'linear',
    });

    const imgURL = 'https://mdn.alipayobjects.com/huamei_cwajh0/afts/img/A*veTHS4dEwGQAAAAAAAAAAAAADn19AQ/original';
    const imgBitmap = await loadImageBitmap(imgURL);
    const texture =  createTextureFromSource(device, imgBitmap, { mips: true, flipY: false });
    // const texture =  createTextureFromSource(device, imgBitmap, { mips: false, flipY: false });
    //  shader 中传入一个 matrix uniform 的变量
    const matrixBytes = 16;
    const unifromBytes = matrixBytes;
    const uniformBufferSize = unifromBytes * 4;
    const uniformBuffer = device.createBuffer({
      label: 'uniforms',
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  
    const uniformValues = new Float32Array(unifromBytes);
  
    // offsets to the various matrix uniform values in float32 indices
    const kMatrixOffset = 0;
    const matrixValue = uniformValues.subarray(kMatrixOffset, kMatrixOffset + matrixBytes);
  
    // init attribtue
    const { vertexData, indexData, numVertices } = createCubeVertices();
    const vertexBuffer = device.createBuffer({
      label: 'vertex buffer vertices',
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertexData);
  
    const indexBuffer = device.createBuffer({
      label: 'index buffer',
      size: vertexData.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(indexBuffer, 0, indexData);
  
    // bind uniform buffer
    const bindGroup = device.createBindGroup({
      label: 'bind group for object',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer }},
        { binding: 1, resource: sampler },
        { binding: 2, resource: texture.createView() },
      ],
    });

    const renderPassDescriptor = {
        label: 'our basic canvas renderPass',
        colorAttachments: [
        {
            // view: <- to be filled out when we render
            loadOp: 'clear',
            storeOp: 'store',
        },
        ],
        depthStencilAttachment: {
        // view: <- to be filled out when we render
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
        },
    };


    let depthTexture: GPUTexture;
    // init cube rotation
    const settings = {
        rotation: [degToRad(20), degToRad(25), degToRad(0)],
    };
    // init view matrix & proj matrix
    const view = mat4.lookAt(
        [0, 1, 5],  // camera position
        [0, 0, 0],  // target
        [0, 1, 0],  // up
    );
    const proj =  mat4.perspective(
        60 * Math.PI / 180,
        canvas.clientWidth / canvas.clientHeight, // aspect
        0.1,    // zNear
        10,     // zFar
    )
    function render() {
        // Get the current texture from the canvas context and
        // set it as the texture to render to.
        const canvasTexture = context.getCurrentTexture();
        // @ts-ignore
        renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();

        // If we don't have a depth texture OR if its size is different
        // from the canvasTexture when make a new depth texture
        if (!depthTexture || depthTexture.width !== canvasTexture.width || depthTexture.height !== canvasTexture.height) {
            if (depthTexture) {
                depthTexture.destroy();
            }
            depthTexture = device.createTexture({
                size: [canvasTexture.width, canvasTexture.height],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT,
            });
        }
        // @ts-ignore
        renderPassDescriptor.depthStencilAttachment.view = depthTexture.createView();

        // ** draw cube encoder **
        const encoder = device.createCommandEncoder();
        // @ts-ignore
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);

        // *** set attribute data start ***
        pass.setVertexBuffer(0, vertexBuffer);
        pass.setIndexBuffer(indexBuffer, 'uint16');
        // *** set attribute data end ***
        
        // *** set unifrom data start ***
        const matrix = mat4.multiply(proj as any, view as any);
        mat4.rotateX(matrix, settings.rotation[0], matrix);
        mat4.rotateY(matrix, settings.rotation[1], matrix);
        mat4.rotateZ(matrix, settings.rotation[2], matrix);
        mat4.copy(matrixValue, matrix);

        // update x、y axis rotate
        settings.rotation[0] += 0.01;
        settings.rotation[1] += 0.01;

        // upload the uniform values to the uniform buffer
        device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
        pass.setBindGroup(0, bindGroup);
        // *** set unifrom data end ***

        // *** set indexBuffer start
        pass.drawIndexed(numVertices);
        // *** set indexBuffer end
        pass.end();
        const commandBuffer = encoder.finish();
        // ** draw cube encoder **
        
        device.queue.submit([commandBuffer]);
        requestAnimationFrame(render);
    }
    render();
    
}