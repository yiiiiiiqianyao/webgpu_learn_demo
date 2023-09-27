- 写入/更新数据
```ts
const uniformBufferSize = 4 * 4;
const uniformBuffer = device.createBuffer({
    size: uniformBufferSize, 
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
}); 
const uniformValues = new Float32Array(uniformBufferSize / 4);
const offset = 0;
uniformValues.set([1, 0, 0, 1], offset);
device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
```