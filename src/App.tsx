import React, { useEffect } from 'react';
import './App.css';
import { triangleScript } from './demos/triangle';
// import { computeScript } from './demos/simpleCompute';

function App() {
  useEffect(() => {
    (async () => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance' // 'low-power'
      }) as GPUAdapter;
      const device = await adapter.requestDevice()
      const context = canvas.getContext('webgpu') as GPUCanvasContext
      const format = navigator.gpu.getPreferredCanvasFormat(); // rgba8unorm or bgra8unorm
      const devicePixelRatio = window.devicePixelRatio || 1
      canvas.width = canvas.clientWidth * devicePixelRatio
      canvas.height = canvas.clientHeight * devicePixelRatio
      // const size = { width: canvas.width, height: canvas.height }
      context.configure({
        device, 
        format,
        alphaMode: 'opaque',
      })

      function render() {
        triangleScript(device, context, format);
        // computeScript(device);
      }
      // render();
      
      // re-configure context on resize
      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const canvas = entry.target as HTMLCanvasElement;
          const width = entry.contentBoxSize[0].inlineSize;
          const height = entry.contentBoxSize[0].blockSize;
          canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
          canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
          // re-render
          // don't need to recall context.configure() after v104
          render();
        }
      });
      resizeObserver.observe(canvas);
      // resizeObserver.unobserve(需要监听的dom);
    })()

  }, [])
  return (
    <canvas id='canvas'></canvas>
  );
}

export default App;
