export const generateMips = (() => {
    let sampler: any;
    let module: any;
    const pipelineByFormat = {};

    return function generateMips(device: GPUDevice, texture: GPUTexture) {
      if (!module) {
        module = device.createShaderModule({
          label: 'textured quad shaders for mip level generation',
          code: `
            struct VSOutput {
              @builtin(position) position: vec4f,
              @location(0) texcoord: vec2f,
            };

            @vertex fn vs(
              @builtin(vertex_index) vertexIndex : u32
            ) -> VSOutput {
              let pos = array(

                vec2f( 0.0,  0.0),  // center
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 0.0,  1.0),  // center, top

                // 2st triangle
                vec2f( 0.0,  1.0),  // center, top
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 1.0,  1.0),  // right, top
              );

              var vsOutput: VSOutput;
              let xy = pos[vertexIndex];
              vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
              vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
              return vsOutput;
            }

            @group(0) @binding(0) var ourSampler: sampler;
            @group(0) @binding(1) var ourTexture: texture_2d<f32>;

            @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
              return textureSample(ourTexture, ourSampler, fsInput.texcoord);
            }
          `,
        });

        sampler = device.createSampler({
          minFilter: 'linear',
          magFilter: 'linear',
        });
      }
        // @ts-ignore
      if (!pipelineByFormat[texture.format]) {
        // @ts-ignore
        pipelineByFormat[texture.format] = device.createRenderPipeline({
          label: 'mip level generator pipeline',
          layout: 'auto',
          vertex: {
            module,
            entryPoint: 'vs',
          },
          fragment: {
            module,
            entryPoint: 'fs',
            targets: [{ format: texture.format }],
          },
        });
      }
      // @ts-ignore
      const pipeline = pipelineByFormat[texture.format];

      const encoder = device.createCommandEncoder({
        label: 'mip gen encoder',
      });

      let width = texture.width;
      let height = texture.height;
      let baseMipLevel = 0;
      while (width > 1 || height > 1) {
        width = Math.max(1, width / 2 | 0);
        height = Math.max(1, height / 2 | 0);

        for(let layer = 0; layer < texture.depthOrArrayLayers; layer++) {
          const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: sampler },
              { 
                binding: 1, 
                resource: texture.createView({
                  dimension: "2d",
                  baseMipLevel, 
                  mipLevelCount: 1,
                  baseArrayLayer: layer,
                  arrayLayerCount: 1,
                }) 
              },
            ],
          });
  
          const renderPassDescriptor = {
            label: 'our basic canvas renderPass',
            colorAttachments: [
              {
                view: texture.createView({
                  dimension: "2d",
                  baseMipLevel: baseMipLevel + 1, 
                  mipLevelCount: 1,
                  baseArrayLayer: layer,
                  arrayLayerCount: 1,
                }),
                loadOp: 'clear',
                storeOp: 'store',
              },
            ],
          };

          // @ts-ignore
          const pass = encoder.beginRenderPass(renderPassDescriptor);
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, bindGroup);
          pass.draw(6);  // call our vertex shader 6 times
          pass.end();
        }
        ++baseMipLevel;
      }

      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    };
})();

// export   const generateMips = (() => {
//   let sampler: any;
//   let module: any;
//   const pipelineByFormat = {};

//   return function generateMips(device: GPUDevice, texture: GPUTexture) {
//     if (!module) {
//       module = device.createShaderModule({
//         label: 'textured quad shaders for mip level generation',
//         code: `
//           struct VSOutput {
//             @builtin(position) position: vec4f,
//             @location(0) texcoord: vec2f,
//           };

//           @vertex fn vs(
//             @builtin(vertex_index) vertexIndex : u32
//           ) -> VSOutput {
//             let pos = array(

//               vec2f( 0.0,  0.0),  // center
//               vec2f( 1.0,  0.0),  // right, center
//               vec2f( 0.0,  1.0),  // center, top

//               // 2st triangle
//               vec2f( 0.0,  1.0),  // center, top
//               vec2f( 1.0,  0.0),  // right, center
//               vec2f( 1.0,  1.0),  // right, top
//             );

//             var vsOutput: VSOutput;
//             let xy = pos[vertexIndex];
//             vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
//             vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
//             return vsOutput;
//           }

//           @group(0) @binding(0) var ourSampler: sampler;
//           @group(0) @binding(1) var ourTexture: texture_2d<f32>;

//           @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
//             return textureSample(ourTexture, ourSampler, fsInput.texcoord);
//           }
//         `,
//       });

//       sampler = device.createSampler({
//         minFilter: 'linear',
//         magFilter: 'linear',
//       });
//     }

//     // @ts-ignore
//     if (!pipelineByFormat[texture.format]) {
//     // @ts-ignore
//       pipelineByFormat[texture.format] = device.createRenderPipeline({
//         label: 'mip level generator pipeline',
//         layout: 'auto',
//         vertex: {
//           module,
//           entryPoint: 'vs',
//         },
//         fragment: {
//           module,
//           entryPoint: 'fs',
//           targets: [{ format: texture.format }],
//         },
//       });
//     }
//     // @ts-ignore
//     const pipeline = pipelineByFormat[texture.format];

//     const encoder = device.createCommandEncoder({
//       label: 'mip gen encoder',
//     });

//     let width = texture.width;
//     let height = texture.height;
//     let baseMipLevel = 0;
//     while (width > 1 || height > 1) {
//       width = Math.max(1, width / 2 | 0);
//       height = Math.max(1, height / 2 | 0);

//       for (let layer = 0; layer < texture.depthOrArrayLayers; ++layer) {
//         const bindGroup = device.createBindGroup({
//           layout: pipeline.getBindGroupLayout(0),
//           entries: [
//             { binding: 0, resource: sampler },
//             {
//               binding: 1,
//               resource: texture.createView({
//                 dimension: '2d',
//                 baseMipLevel,
//                 mipLevelCount: 1,
//                 baseArrayLayer: layer,
//                 arrayLayerCount: 1,
//               }),
//             },
//           ],
//         });

//         const renderPassDescriptor = {
//           label: 'our basic canvas renderPass',
//           colorAttachments: [
//             {
//               view: texture.createView({
//                 dimension: '2d',
//                 baseMipLevel: baseMipLevel + 1,
//                 mipLevelCount: 1,
//                 baseArrayLayer: layer,
//                 arrayLayerCount: 1,
//               }),
//               loadOp: 'clear',
//               storeOp: 'store',
//             },
//           ],
//         };
//         // @ts-ignore
//         const pass = encoder.beginRenderPass(renderPassDescriptor);
//         pass.setPipeline(pipeline);
//         pass.setBindGroup(0, bindGroup);
//         pass.draw(6);  // call our vertex shader 6 times
//         pass.end();
//       }
//       ++baseMipLevel;
//     }

//     const commandBuffer = encoder.finish();
//     device.queue.submit([commandBuffer]);
//   };
// })();