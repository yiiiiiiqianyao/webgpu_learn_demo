import { vert, frag } from './shaders/uTriangle';

function createBindGroup(device: GPUDevice, pipeline: GPURenderPipeline) {
    const uniformBufferSize = 2 * 4 + 2 * 4; // scale + offset
    const uniformBuffer = device.createBuffer({
        size: uniformBufferSize, 
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const uniformValues = new Float32Array(uniformBufferSize / 4);
    const kScaleOffset = 0;
    uniformValues.set([1, 1], kScaleOffset); 
    const kOffsetOffset = 2;
    uniformValues.set([0.2, 0], kOffsetOffset); 
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    const colorUniformBufferSize = 4 * 4;
    const colorUniformBuffer = device.createBuffer({
        size: colorUniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const colorUniformValues = new Float32Array(uniformBufferSize / 4);
    colorUniformValues.set([1, 1, 0, 1], 0);
    device.queue.writeBuffer(colorUniformBuffer, 0, colorUniformValues);

    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: uniformBuffer,
                }
            },
            {
                binding: 1,
                resource: {
                    buffer: colorUniformBuffer,
                }
            }
        ]
    })
    return {
        bindGroup,
        uniformBuffer,
        uniformValues,
        colorUniformBuffer,
        colorUniformValues,
    };
}
 
// create a simple pipiline
async function initPipeline(device: GPUDevice, format: GPUTextureFormat): Promise<GPURenderPipeline> {
    const descriptor: GPURenderPipelineDescriptor = {
        label: 'our hardcoded red triangle pipeline',
        layout: 'auto',
        vertex: {
            module: device.createShaderModule({
                label: 'triangle vertex shader',
                code: vert
            }),
            entryPoint: 'main'
        },
        primitive: {
            // In “triangle-list” mode, every 3 times the vertex shader is executed a triangle will be drawn connecting the 3 position values we return.
            topology: 'triangle-list' // try point-list, line-list, line-strip, triangle-strip?
        },
        fragment: {
            module: device.createShaderModule({
                label: 'triangle fragment shader',
                code: frag
            }),
            entryPoint: 'main',
            targets: [ // 定义了一系列的 render target
                {
                    format: format // render target format has to specify
                }
            ]
        }
    }
    const pipeline = await device.createRenderPipelineAsync(descriptor);
    return pipeline;
  }
  // create & submit device commands
  function draw(device: GPUDevice, context: GPUCanvasContext, pipeline: GPURenderPipeline, bindGroup: GPUBindGroup) {
    const view: GPUTextureView = context.getCurrentTexture().createView()
    const renderPassDescriptor: GPURenderPassDescriptor = {
        label: 'our basic canvas renderPass',
        colorAttachments: [
            { // 在 fragment shader 中通过 location(0) 指定了这个输出的颜色附件
                view: view,
                clearValue: [0.3, 0.3, 0.3, 1], // { r, g, b, a }
                loadOp: 'clear', // clear/load clear：to clear the texture to the clear value before drawing
                storeOp: 'store' // store/discard
            }
        ]
    }
    // A command encoder is used to create a command buffer
    const commandEncoder = device.createCommandEncoder()
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);

    // set bind group
    passEncoder.setBindGroup(0, bindGroup);
    // 3 vertex form a triangle
    passEncoder.draw(3)
    passEncoder.end()
    // webgpu run in a separate process, all the commands will be executed after submit
    const command = commandEncoder.finish();
    
    device.queue.submit([command])
  }
  
  export async function triangleScript (device: GPUDevice, context: GPUCanvasContext, format: GPUTextureFormat) {
    // 编译 shader
    const pipeline = await initPipeline(device, format)
    const { bindGroup, colorUniformBuffer, colorUniformValues } = createBindGroup(device, pipeline);
    // start dra
    draw(device, context, pipeline, bindGroup);

    setInterval(() => {
        const r = Math.random();
        const g = Math.random();
        const b = Math.random();
        colorUniformValues.set([r, g, b, 1], 0);
        device.queue.writeBuffer(colorUniformBuffer, 0, colorUniformValues);
        draw(device, context, pipeline, bindGroup);
    }, 500)
  }