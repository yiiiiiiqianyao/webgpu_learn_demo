const triangleVert = `
@vertex
fn main(@builtin(vertex_index) VertexIndex : u32) -> @builtin(position) vec4<f32> {
    var pos = array<vec2<f32>, 3>(
	    vec2<f32>(0.0, 0.5),
	    vec2<f32>(-0.5, -0.5),
	    vec2<f32>(0.5, -0.5)
    );
    return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
}
`
const redFrag = `
@fragment
fn main() -> @location(0) vec4<f32> {
    // vec4f at location(0) => means it will write to the first render target
    return vec4<f32>(1.0, 0.0, 0.0, 1.0);
}`


 // create a simple pipiline
async function initPipeline(device: GPUDevice, format: GPUTextureFormat): Promise<GPURenderPipeline> {
    const descriptor: GPURenderPipelineDescriptor = {
        label: 'our hardcoded red triangle pipeline',
        layout: 'auto',
        vertex: {
            module: device.createShaderModule({
                label: 'triangle vertex shader',
                code: triangleVert
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
                code: redFrag
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
  function draw(device: GPUDevice, context: GPUCanvasContext, pipeline: GPURenderPipeline) {
    const view: GPUTextureView = context.getCurrentTexture().createView()
    const renderPassDescriptor: GPURenderPassDescriptor = {
        label: 'our basic canvas renderPass',
        colorAttachments: [
            { // 在 fragment shader 中通过 location(0) 指定了这个输出的颜色附件
                view: view,
                clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
                loadOp: 'clear', // clear/load clear：to clear the texture to the clear value before drawing
                storeOp: 'store' // store/discard
            }
        ]
    }
    // A command encoder is used to create a command buffer
    const commandEncoder = device.createCommandEncoder()
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline)
    // 3 vertex form a triangle
    passEncoder.draw(3)
    passEncoder.end()
    // webgpu run in a separate process, all the commands will be executed after submit
    const command = commandEncoder.finish();
    
    device.queue.submit([command])
  }
  
  export async function triangleScript (device: GPUDevice, context: GPUCanvasContext, format: GPUTextureFormat) {
    const pipeline = await initPipeline(device, format)
    // start draw
    draw(device, context, pipeline)
  }