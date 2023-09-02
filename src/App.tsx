import React, { useEffect } from 'react';
import './App.css';

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
    return vec4<f32>(1.0, 0.0, 0.0, 1.0);
}`
// initialize webgpu device & config canvas context
async function initWebGPU(canvas: HTMLCanvasElement) {
  if(!navigator.gpu)
      throw new Error('Not Support WebGPU')
  const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance'
      // powerPreference: 'low-power'
  })
  if (!adapter)
      throw new Error('No Adapter Found')
  const device = await adapter.requestDevice()
  const context = canvas.getContext('webgpu') as GPUCanvasContext
  const format = navigator.gpu.getPreferredCanvasFormat()
  const devicePixelRatio = window.devicePixelRatio || 1
  canvas.width = canvas.clientWidth * devicePixelRatio
  canvas.height = canvas.clientHeight * devicePixelRatio
  const size = {width: canvas.width, height: canvas.height}
  context.configure({
      // json specific format when key and value are the same
      device, format,
      // prevent chrome warning
      alphaMode: 'opaque'
  })
  return {device, context, format, size}
}
// create a simple pipiline
async function initPipeline(device: GPUDevice, format: GPUTextureFormat): Promise<GPURenderPipeline> {
  const descriptor: GPURenderPipelineDescriptor = {
      layout: 'auto',
      vertex: {
          module: device.createShaderModule({
              code: triangleVert
          }),
          entryPoint: 'main'
      },
      primitive: {
          topology: 'triangle-list' // try point-list, line-list, line-strip, triangle-strip?
      },
      fragment: {
          module: device.createShaderModule({
              code: redFrag
          }),
          entryPoint: 'main',
          targets: [
              {
                  format: format
              }
          ]
      }
  }
  return await device.createRenderPipelineAsync(descriptor)
}
// create & submit device commands
function draw(device: GPUDevice, context: GPUCanvasContext, pipeline: GPURenderPipeline) {
  const commandEncoder = device.createCommandEncoder()
  const view = context.getCurrentTexture().createView()
  const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
          {
              view: view,
              clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
              loadOp: 'clear', // clear/load
              storeOp: 'store' // store/discard
          }
      ]
  }
  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
  passEncoder.setPipeline(pipeline)
  // 3 vertex form a triangle
  passEncoder.draw(3)
  passEncoder.end()
  // webgpu run in a separate process, all the commands will be executed after submit
  const command = commandEncoder.finish();
  
  device.queue.submit([command])
}

async function webGPUScript () {
  const canvas = document.querySelector('canvas') as HTMLCanvasElement;
  const {device, context, format} = await initWebGPU(canvas)
  const pipeline = await initPipeline(device, format)
  // start draw
  draw(device, context, pipeline)
  
  // re-configure context on resize
  window.addEventListener('resize', ()=>{
    canvas.width = canvas.clientWidth * devicePixelRatio
    canvas.height = canvas.clientHeight * devicePixelRatio
    // don't need to recall context.configure() after v104
    draw(device, context, pipeline)
  })
}

function App() {
  useEffect(() => {
    webGPUScript();
  }, [])
  return (
    <canvas id='canvas'></canvas>
  );
}

export default App;
