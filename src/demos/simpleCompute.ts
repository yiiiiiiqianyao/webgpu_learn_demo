
export async function computeScript (device: GPUDevice) {
    const module = device.createShaderModule({
        label: 'doubling compute module',
        code: `
            @group(0) @binding(0) var<storage, read_write> data: array<f32>;
            
            // A vec3u is three unsigned 32 integer values
            @compute @workgroup_size(1) fn computeSomething(@builtin(global_invocation_id) id: vec3<u32>) {
                let i = id.x;
                data[i] = data[i] * 2.0;
            }
        `,
    });

    const pipeline = device.createComputePipeline({
        label: 'doubling compute pipeline',
        layout: 'auto',
        compute: {
            module,
            entryPoint: 'computeSomething',
        },
    });
    
    const input = new Float32Array([1, 3, 5]); // create a buffer on the GPU to hold our computation
    
    // input and output
    const workBuffer = device.createBuffer({
        label: 'work buffer',
        size: input.byteLength,
        // STORAGE Buffer can be read & write
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    
    device.queue.writeBuffer(workBuffer, 0, input); // Copy our input data to that buffer
    // Setup a bindGroup to tell the shader which
    // buffer to use for the computation
    const bindGroup = device.createBindGroup({
        label: 'bindGroup for work buffer',
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: workBuffer } },
        ],
    });
    // Encode commands to do the computation
    const encoder = device.createCommandEncoder({
        label: 'doubling encoder',
    });
    const pass = encoder.beginComputePass({
        label: 'doubling compute pass',
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(input.length);
    pass.end();

    // after compute
    // Encode a command to copy the results to a mappable buffer.
    const resultBuffer = device.createBuffer({ // create a buffer on the GPU to get a copy of the results
        label: 'result buffer',
        size: input.byteLength,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    encoder.copyBufferToBuffer(workBuffer, 0, resultBuffer, 0, resultBuffer.size);

    const commandBuffer = encoder.finish(); // Finish encoding and submit the commands
    device.queue.submit([commandBuffer]);
    
    await resultBuffer.mapAsync(GPUMapMode.READ);
    console.log('mapAsync');
    // Read the results
    const result = new Float32Array(resultBuffer.getMappedRange().slice(0));
    // 解绑
    resultBuffer.unmap();
    console.log(result);
  }