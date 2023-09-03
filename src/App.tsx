import React, { useEffect } from 'react';
import './App.css';
import { triangleScript } from './demos/triangle';

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

      triangleScript(device, context, format);
    })()

  }, [])
  return (
    <canvas id='canvas'></canvas>
  );
}

export default App;
