import { rand } from "./mesh";

const wgslCode = `
struct OurStruct {
  color: vec4f,
  offset: vec2f,
};

struct OtherStruct {
  scale: vec2f,
};

struct Vertex {
  position: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

@group(0) @binding(0) var<storage, read> ourStructs: array<OurStruct>;
@group(0) @binding(1) var<storage, read> otherStructs: array<OtherStruct>;
@group(0) @binding(2) var<storage, read> pos: array<Vertex>;

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
  @builtin(instance_index) instanceIndex: u32
) -> VSOutput {
  let otherStruct = otherStructs[instanceIndex]; // 当前实例的 struct
  let ourStruct = ourStructs[instanceIndex];

  var vsOut: VSOutput;
  vsOut.position = vec4f(
      pos[vertexIndex].position * otherStruct.scale + ourStruct.offset, 0.0, 1.0);
  vsOut.color = ourStruct.color;
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vsOut.color;
}
`

function createCircleVertices({
    radius = 1,
    numSubdivisions = 24,
    innerRadius = 0,
    startAngle = 0,
    endAngle = Math.PI * 2,
} = {}) {
    // 2 triangles per subdivision, 3 verts per tri, 2 values (xy) each.
    const numVertices = numSubdivisions * 3 * 2;
    const vertexData = new Float32Array(numSubdivisions * 2 * 3 * 2);

    let offset = 0;
    const addVertex = (x: number, y: number) => {
        vertexData[offset++] = x;
        vertexData[offset++] = y;
    };

    // 2 vertices per subdivision
    //
    // 0--1 4
    // | / /|
    // |/ / |
    // 2 3--5
    for (let i = 0; i < numSubdivisions; ++i) {
        const angle1 = startAngle + (i + 0) * (endAngle - startAngle) / numSubdivisions;
        const angle2 = startAngle + (i + 1) * (endAngle - startAngle) / numSubdivisions;

        const c1 = Math.cos(angle1);
        const s1 = Math.sin(angle1);
        const c2 = Math.cos(angle2);
        const s2 = Math.sin(angle2);

        // first triangle
        addVertex(c1 * radius, s1 * radius);
        addVertex(c2 * radius, s2 * radius);
        addVertex(c1 * innerRadius, s1 * innerRadius);

        // second triangle
        addVertex(c1 * innerRadius, s1 * innerRadius);
        addVertex(c2 * radius, s2 * radius);
        addVertex(c2 * innerRadius, s2 * innerRadius);
    }

    return {
        vertexData,
        numVertices,
    };
}

export async function storageBufferScript(device: GPUDevice, context: GPUCanvasContext, format: GPUTextureFormat, canvas: HTMLCanvasElement) {
    const module = device.createShaderModule({
        code: wgslCode,
    });
    const pipeline = device.createRenderPipeline({
        label: 'storage buffer vertices',
        layout: 'auto',
        vertex: {
            module,
            entryPoint: 'vs',
        },
        fragment: {
            module,
            entryPoint: 'fs',
            targets: [{ format: format }],
        },
    });

    // create 2 storage buffers
    const staticUnitSize =
        4 * 4 + // color is 4 32bit floats (4bytes each)
        2 * 4 + // offset is 2 32bit floats (4bytes each)
        2 * 4;  // padding - 
    const scaleUnitSize =
        2 * 4;  // scale is 2 32bit floats (4bytes each)
    const kNumObjects = 100;
    const staticStorageBufferSize = staticUnitSize * kNumObjects;
    const scaleStorageBufferSize = scaleUnitSize * kNumObjects;

    const staticStorageBuffer = device.createBuffer({
        label: 'static storage for objects',
        size: staticStorageBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const scaleStorageBuffer = device.createBuffer({
        label: 'scale storage for objects',
        size: scaleStorageBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // offsets to the various uniform values in float32 indices
    const kColorOffset = 0;
    const kOffsetOffset = 4;
    const kScaleOffset = 0;
    const aspect = canvas.width / canvas.height;

    const staticStorageValues = new Float32Array(staticStorageBufferSize / 4);

    // a typed array we can use to update the scaleStorageBuffer
    const storageValues = new Float32Array(scaleStorageBufferSize / 4);
    for (let i = 0; i < kNumObjects; ++i) {
        const staticOffset = i * (staticUnitSize / 4);

        // These are only set once so set them now
        staticStorageValues.set([rand(), rand(), rand(), 1], staticOffset + kColorOffset);        // set the color
        staticStorageValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], staticOffset + kOffsetOffset);      // set the offset

        const scaleOffset = i * (scaleUnitSize / 4);
        const scale = rand(0.2, 0.5);
        storageValues.set([scale / aspect, scale], scaleOffset + kScaleOffset); // set the scale
    }
    // upload all scales at once
    device.queue.writeBuffer(staticStorageBuffer, 0, staticStorageValues);
    device.queue.writeBuffer(scaleStorageBuffer, 0, storageValues);

    // setup a storage buffer with vertex data
    const { vertexData, numVertices } = createCircleVertices({
        radius: 0.5,
        innerRadius: 0.25,
    });
    const vertexStorageBuffer = device.createBuffer({
        label: 'storage buffer vertices',
        size: vertexData.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexStorageBuffer, 0, vertexData);

    const bindGroup = device.createBindGroup({
        label: 'bind group for objects',
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: staticStorageBuffer } },
            { binding: 1, resource: { buffer: scaleStorageBuffer } },
            { binding: 2, resource: { buffer: vertexStorageBuffer } },
        ],
    });

    const view: GPUTextureView = context.getCurrentTexture().createView()
    const renderPassDescriptor: GPURenderPassDescriptor = {
        label: 'our basic canvas renderPass',
        colorAttachments: [
            {
                // view: <- to be filled out when we render
                view: view,
                clearValue: [0.3, 0.3, 0.3, 1],
                loadOp: 'clear',
                storeOp: 'store',
            },
        ],
    };

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);



    pass.setBindGroup(0, bindGroup);
    pass.draw(numVertices, kNumObjects);

    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

}