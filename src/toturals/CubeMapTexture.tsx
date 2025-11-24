import { useEffect, useRef } from "react";
import { generateFace, getDevice, ListenCanvasResize } from "./utils";
import { initPipeline } from "../demos/textureDemos/cubeMapTexture";
import { createTextureFromSources } from "../demos/utils/texture";
import { createCubeVertices } from "../demos/utils/mesh";
import { degToRad } from "../demos/utils/math";
import { mat4 } from "../demos/utils/mat4";


const faceSize = 128;
const faceCanvases = [
    { faceColor: '#F00', textColor: '#0FF', text: '+X' },
    { faceColor: '#FF0', textColor: '#00F', text: '-X' },
    { faceColor: '#0F0', textColor: '#F0F', text: '+Y' },
    { faceColor: '#0FF', textColor: '#F00', text: '-Y' },
    { faceColor: '#00F', textColor: '#FF0', text: '+Z' },
    { faceColor: '#F0F', textColor: '#0F0', text: '-Z' },
].map(faceInfo => generateFace(faceSize, faceInfo));

for (const canvas of faceCanvases) {
    document.body.appendChild(canvas);
}

async function RunScript (device: GPUDevice, context: GPUCanvasContext, format: GPUTextureFormat, canvas: HTMLCanvasElement) {
    const pipeline = await initPipeline(device, format);
     // 纹理采样器
    const sampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'linear',
    });
  
    // init cubemap texture
    const cubeMapTexture = createTextureFromSources(device, faceCanvases, format, { 
      mips: true, 
      flipY: false 
    });

    // shader 中传入一个 matrix uniform 的变量
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
    const cubemapView = cubeMapTexture.createView({ dimension: "cube" });
    const bindGroup = device.createBindGroup({
      label: 'bind group for object',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer }},
        { binding: 1, resource: sampler },
        { binding: 2, resource: cubemapView },
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
          // 深度纹理需要自己进行创建
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

export const CubeMapTexture = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if(!canvasRef.current) return;
        const canvas = canvasRef.current;
        let resizeObserver: ResizeObserver | null = null;
        let device: GPUDevice | null = null;
        (async () => {
            device = await getDevice() as GPUDevice;        
            const format = navigator.gpu.getPreferredCanvasFormat(); // rgba8unorm or bgra8unorm
            const devicePixelRatio = window.devicePixelRatio || 1;
            canvas.width = canvas.clientWidth * devicePixelRatio;
            canvas.height = canvas.clientHeight * devicePixelRatio;
            const context = canvas.getContext('webgpu') as GPUCanvasContext;
            context.configure({
                device, 
                format,
                alphaMode: 'premultiplied', // premultiplied opaque,
            })

            function render() {
                RunScript(device as GPUDevice, context, format, canvas);
            }
            // render();
            
            resizeObserver = ListenCanvasResize(canvas, device, () => {
                render();
            })
        })()
        function disposeWebGPU() {
            // 1. stop all rendering / computing work
            canvas && resizeObserver?.unobserve(canvas);
            // 2. dispose all resources
            // 3. dispose all JavaScript references
            // 4. finally call device.destroy()
            device?.destroy();
        }
        return () => {
            disposeWebGPU();
        }
    }, [])
    return (
        <canvas ref={canvasRef}></canvas>
    );
}