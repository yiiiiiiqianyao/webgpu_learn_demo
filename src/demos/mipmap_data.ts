import { mat4 } from './mat';
import { generateMips } from './utils';
interface IMipData {
    data: BufferSource | SharedArrayBuffer;
    width: number;
    height: number;
}

const code = `
struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

struct Uniforms {
  matrix: mat4x4f,
};

@group(0) @binding(0) var ourSampler: sampler;
@group(0) @binding(1) var ourTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uni: Uniforms;

@vertex fn vs(@builtin(vertex_index) vertexIndex : u32) -> OurVertexShaderOutput {
  let pos = array(
    // 1st triangle
    vec2f( 0.0,  0.0),  // center
    vec2f( 1.0,  0.0),  // right, center
    vec2f( 0.0,  1.0),  // center, top

    // 2st triangle
    vec2f( 0.0,  1.0),  // center, top
    vec2f( 1.0,  0.0),  // right, center
    vec2f( 1.0,  1.0),  // right, top
  );

  var vsOutput: OurVertexShaderOutput;
  let xy = pos[vertexIndex];
  // 调整位置 matrix =>  projectMatrix * viewMatrix
  vsOutput.position = uni.matrix * vec4f(xy, 0.0, 1.0);
  // 调整 uv 坐标
  vsOutput.texcoord = xy * vec2f(1, 50);
  return vsOutput;
}

@fragment fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4f {
    return textureSample(ourTexture, ourSampler, fsInput.texcoord);
}
`

const createCheckedMipmap = () => {
    const ctx = document.createElement('canvas').getContext('2d', {willReadFrequently: true}) as CanvasRenderingContext2D;
    const levels = [
      { size: 64, color: 'rgb(128,0,255)', },
      { size: 32, color: 'rgb(0,255,0)', },
      { size: 16, color: 'rgb(255,0,0)', },
      { size:  8, color: 'rgb(255,255,0)', },
      { size:  4, color: 'rgb(0,0,255)', },
      { size:  2, color: 'rgb(0,255,255)', },
      { size:  1, color: 'rgb(255,0,255)', },
    ];
    return levels.map(({size, color}, i) => {
      ctx.canvas.width = size;
      ctx.canvas.height = size;
      ctx.fillStyle = i & 1 ? '#000' : '#fff';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, size / 2, size / 2);
      ctx.fillRect(size / 2, size / 2, size / 2, size / 2);
      return ctx.getImageData(0, 0, size, size);
    });
};

const createBlendedMipmap = () => {
    const w = [255, 255, 255, 255];
    const r = [255,   0,   0, 255];
    const b = [  0,  28, 116, 255];
    const y = [255, 231,   0, 255];
    const g = [ 58, 181,  75, 255];
    const a = [ 38, 123, 167, 255];
    const data = new Uint8Array([
        w, r, r, r, r, r, r, a, a, r, r, r, r, r, r, w,
        w, w, r, r, r, r, r, a, a, r, r, r, r, r, w, w,
        w, w, w, r, r, r, r, a, a, r, r, r, r, w, w, w,
        w, w, w, w, r, r, r, a, a, r, r, r, w, w, w, w,
        w, w, w, w, w, r, r, a, a, r, r, w, w, w, w, w,
        w, w, w, w, w, w, r, a, a, r, w, w, w, w, w, w,
        w, w, w, w, w, w, w, a, a, w, w, w, w, w, w, w,
        b, b, b, b, b, b, b, b, a, y, y, y, y, y, y, y,
        b, b, b, b, b, b, b, g, y, y, y, y, y, y, y, y,
        w, w, w, w, w, w, w, g, g, w, w, w, w, w, w, w,
        w, w, w, w, w, w, r, g, g, r, w, w, w, w, w, w,
        w, w, w, w, w, r, r, g, g, r, r, w, w, w, w, w,
        w, w, w, w, r, r, r, g, g, r, r, r, w, w, w, w,
        w, w, w, r, r, r, r, g, g, r, r, r, r, w, w, w,
        w, w, r, r, r, r, r, g, g, r, r, r, r, r, w, w,
        w, r, r, r, r, r, r, g, g, r, r, r, r, r, r, w,
    ].flat());
    return generateMips(data, 16);
};

const createTextureWithMips = (device: GPUDevice, mips: IMipData[], label: string) => {
    // 创建支持 mipmap 的纹理
    const texture = device.createTexture({
        label,
        size: [mips[0].width, mips[0].height],
        mipLevelCount: mips.length,
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    // 写入 mip 数据
        // device.queue.writeTexture(
        //     { texture },
        //     mips[0].data,
        //     { bytesPerRow: mips[0].width * 4 },
        //     { width: mips[0].width, height: mips[0].height },
        // );
    mips.forEach(({data, width, height}, mipLevel: number) => {
        device.queue.writeTexture(
            { texture, mipLevel },
            data,
            { bytesPerRow: width * 4 },
            { width, height },
        );
    });
    return texture;
};

export async function mipmapDataScript (device: GPUDevice, canvas: HTMLCanvasElement, context: GPUCanvasContext, format: GPUTextureFormat) {
    const module = device.createShaderModule({ code });
    const pipeline = device.createRenderPipeline({
        label: 'hardcoded textured quad pipeline',
        layout: 'auto',
        vertex: {
          module,
          entryPoint: 'vs',
        },
        fragment: {
          module,
          entryPoint: 'fs',
          targets: [{ format }],
        },
    });

    const textures = [
        createTextureWithMips(device, createCheckedMipmap(), 'checker'),
        createTextureWithMips(device, createBlendedMipmap(), 'blended'),
    ];

    // offsets to the various uniform values in float32 indices
    const kMatrixOffset = 0;
    let texNdx = 0;
    
    const objectInfos: any[] = [];
    for (let i = 0; i < 8; ++i) {
        const sampler = device.createSampler({
            addressModeU: 'repeat',
            addressModeV: 'repeat',
            magFilter: (i & 1) ? 'linear' : 'nearest',
            minFilter: (i & 2) ? 'linear' : 'nearest',

            // 后四个 sampler linear
            // mipmapFilter: 'linear', colors are sampled from 2 mip levels
            mipmapFilter: (i & 4) ? 'linear' : 'nearest',
        });

        // create a buffer for the uniform values
        const uniformBufferSize = 16 * 4; // matrix is 16 32bit floats (4bytes each)
        const uniformBuffer = device.createBuffer({
            label: 'uniforms for quad',
            size: uniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // create a typedarray to hold the values for the uniforms in JavaScript
        const uniformValues = new Float32Array(uniformBufferSize / 4);
        const matrix = uniformValues.subarray(kMatrixOffset, 16);

        // 构造两个绑定组
        const bindGroups = textures.map(texture =>
            device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: texture.createView() },
                { binding: 2, resource: { buffer: uniformBuffer }},
            ],
        }));

        // Save the data we need to render this object.
        objectInfos.push({
            bindGroups,
            matrix,
            uniformValues,
            uniformBuffer,
        });
    }

    // 不同的 plane 有相同的 projectionMatrix 和 viewProjectionMatrix
    const fov = 60 * Math.PI / 180;  // 60 degrees in radians
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const zNear  = 1;
    const zFar   = 2000;
    const projectionMatrix = mat4.perspective(fov, aspect, zNear, zFar);

    const cameraPosition = [0, 0, 2];
    const up = [0, 1, 0];
    const target = [0, 0, 0];
    const viewMatrix = mat4.lookAt(cameraPosition, target, up);
    const viewProjectionMatrix = mat4.multiply(projectionMatrix, viewMatrix);

    const encoder = device.createCommandEncoder();
    const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
            {
                clearValue: [0.3, 0.3, 0.3, 1],
                loadOp: 'clear',
                storeOp: 'store',
                view: context.getCurrentTexture().createView(), // render to default canvas
            },
        ],
    };
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    objectInfos.forEach(({bindGroups, matrix, uniformBuffer, uniformValues}, i) => {
        const bindGroup = bindGroups[texNdx];
        const xSpacing = 1.2;
        const ySpacing = 0.7;
        const zDepth = 50;
        const x = i % 4 - 1.5;
        const y = i < 4 ? 1 : -1;

        // 每个 plane 都有自己的 modelMatrix
        mat4.translate(viewProjectionMatrix, [x * xSpacing, y * ySpacing, -zDepth * 0.5], matrix);
        mat4.rotateX(matrix, 0.5 * Math.PI, matrix);
        mat4.scale(matrix, [1, zDepth * 2, 1], matrix);
        mat4.translate(matrix, [-0.5, -0.5, 0], matrix);

        // copy the values from JavaScript to the GPU
        device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

        pass.setBindGroup(0, bindGroup);
        pass.draw(6);  // call our vertex shader 6 times
    });

    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}