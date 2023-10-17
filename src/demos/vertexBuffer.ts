import { rand } from "./mesh";

const wgslCode = `
struct Vertex {
  // 1. Vertex 是 vs 顶点着色器的入参 表示 attribute 顶点缓冲数据
  // 2. @location(0) 表示第一份 attribute 顶点缓冲数据，在创建渲染管道 render pipeline 的时候，buffers 数组中的位置
  @location(0) position: vec2f,
  @location(1) color: vec4f,
  @location(2) offset: vec2f,
  @location(3) scale: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

@vertex fn vs(
  vert: Vertex,
) -> VSOutput {
  var vsOut: VSOutput;
  vsOut.position = vec4f(vert.position * vert.scale + vert.offset, 0.0, 1.0);
  vsOut.color = vert.color;
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

export async function vertexBufferScript(device: GPUDevice, context: GPUCanvasContext, format: GPUTextureFormat, canvas: HTMLCanvasElement) {
    const module = device.createShaderModule({
        code: wgslCode,
    });
    const pipeline = device.createRenderPipeline({
        label: 'storage buffer vertices',
        layout: 'auto',
        vertex: {
            module,
            entryPoint: 'vs',
            buffers: [
                {
                  arrayStride: 2 * 4, // 2 floats, 4 bytes each
                  stepMode: 'vertex', // 默认值 表示绘制每个顶点的时候 数据步进一个
                  attributes: [
                    {
                        shaderLocation: 0, offset: 0, format: 'float32x2',// position
                    },
                  ],
                },
                {
                    arrayStride: 6 * 4, // 6 floats, 4 bytes each
                    stepMode: 'instance', // instance 表示在绘制每个 instance 实例的时候 数据步进一个
                    attributes: [
                      {shaderLocation: 1, offset:  0, format: 'float32x4'},  // color
                      {shaderLocation: 2, offset: 16, format: 'float32x2'},  // offset
                    ],
                  },
                  {
                    arrayStride: 2 * 4, // 2 floats, 4 bytes each
                    stepMode: 'instance',
                    attributes: [
                      {shaderLocation: 3, offset: 0, format: 'float32x2'},   // scale
                    ],
                  },
            ]
        },
        fragment: {
            module,
            entryPoint: 'fs',
            targets: [{ format: format }],
        },
    });

    const staticUnitSize =
        4 * 4 + // color is 4 32bit floats (4bytes each)
        2 * 4;  // offset is 2 32bit floats (4bytes each)

    const scaleUnitSize =
        2 * 4;  // scale is 2 32bit floats (4bytes each)
        
    const kNumObjects = 100;
    const staticStorageBufferSize = staticUnitSize * kNumObjects;
    const scaleStorageBufferSize = scaleUnitSize * kNumObjects;

    const staticVertexBuffer = device.createBuffer({
        label: 'static storage for objects',
        size: staticStorageBufferSize,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const scaleVertexBuffer = device.createBuffer({
        label: 'scale storage for objects',
        size: scaleStorageBufferSize,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
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
    device.queue.writeBuffer(staticVertexBuffer, 0, staticStorageValues);
    device.queue.writeBuffer(scaleVertexBuffer, 0, storageValues);

    // setup a storage buffer with vertex data
    const { vertexData, numVertices } = createCircleVertices({
        radius: 0.5,
        innerRadius: 0.25,
    });
    const vertexBuffer = device.createBuffer({
        label: 'vertex buffer vertices',
        size: vertexData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertexData);

    // const indexBuffer = device.createBuffer({
    //     label: 'index buffer',
    //     size: indexData.byteLength,
    //     usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    // });
    // device.queue.writeBuffer(indexBuffer, 0, indexData);

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
    pass.setVertexBuffer(0, vertexBuffer); 
    // 把 vertexBuffer 指定为 pipeline vertex buffers 数组中下标为 0 位置的数据
    pass.setVertexBuffer(1, staticVertexBuffer);
    pass.setVertexBuffer(2, scaleVertexBuffer);
    //  set index buffer
    // pass.setIndexBuffer(indexBuffer, 'uint32');

    pass.draw(numVertices, kNumObjects);
    // 绘制带有 indexBuffer 的 vertex 
    // pass.drawIndexed(numVertices, kNumObjects);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

}