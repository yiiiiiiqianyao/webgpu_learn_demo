- plain type 数据类型: 
1. i32   a 32 bit signed integer
2. u32   a 32 bit unsigned integer
3. f32   a 32 bit floating point number
4. bool  a boolean value
5. f16   a 16 bit floating point number (this is an optional feature you need to check for and request)

- var/let/const
在 wgsl 中，var 表示可变变量，let 表示不可变变量，而 const 则表示不是一个变量，是一个编译时常数，不能在任何运行时使用，如在 for 循环中
```wgsl
fn add(a: f32, b: f32) -> f32 {
  const result = a + b;   // ERROR! const can only be used with compile time expressions
  return result;
}
```

- variable declaration 定义变量

```wgsl
// 主动设置类型
var a: f32 = 1;
let c: f32 = 3;
fn d(e: f32) -> f32 { return e * 2; }

// 在没有主动设置类型的时候 wgsl 会进行类型推断
fn foo() -> bool { return false; }
var a = 1;     // a is an i32
let b = 2.0;   // b is an f32
var c = 3u;    // c is a u32
var d = foo(); // d is bool

// 类型错误
let a = 1;     // a is an i32
let b = 2.0;   // b is a f32
let c = a + b; // ERROR can't add an i32 to an f32
```

- numeric suffixes 数字后缀
```wgsl
2i   // i32
3u   // u32
4f   // f32
4.5f // f32
5h   // f16
5.6h // f16
6    // AbstractInt
7.0  // AbstractFloat
```

- vector types 向量类型
WGSL 有 vec2/vec3/vec4 三种类型，基础的使用类型是 vec?<type>

```WGSL
let a = vec2<i32>(1, -2);
let b = vec3<f32>(3.4, 5.6, 7.8);
let c = vec4<u32>(9, 10);
```
支持多种方式访问向量内的值

```WGSL
let a = vec4<f32>(1, 2, 3, 4);
let b = a.z;   // via x,y,z,w
let c = a.b;   // via r,g,b,a
let d = a[2];  // via array element accessors
// multi
let a = vec4<f32>(1, 2, 3, 4);
let b = a.zx;   // via x,y,z,w
let c = a.br;   // via r,g,b,a
let d = vec2<f32>(a[2], a[0]);
// repeat
let a = vec4<f32>(1, 2, 3, 4);
let b = vec3<f32>(a.z, a.z, a.y);
let c = a.zzy;
```

- matrices 矩阵类型
WGSL has a bunch of matrix types. Matrices are arrays of vectors. The format is mat<numVectors>x<vectorSize><<type>> so for example mat3x4<f32> is an array of 3 vec4<f32>s

```WGSL
let a: mat4x4<f32> = ...
let b: mat4x4f = ...
```
The most common matrix type for 3D computation is mat4x4f and can be multiplied directly with a vec4f to produce another vec4f
```WGSL
let a = mat4x4f(....);
let b = vec4f(1, 2, 3, 4);
let c = a * b;  // c is a vec4f and the result of a * b
```

- arrays 数组类型
Arrays in WGSL are declared with the array<type, numElements> syntax
```WGSL
let a = array<f32, 5>;   // an array of five f32s
let b = array<vec4f, 6>; // an array of six vec4fs

// Above arrOf3Vec3fsA is the same as arrOf3Vec3fsB
let arrOf3Vec3fsA = array(vec3f(1,2,3), vec3f(4,5,6), vec3f(7,8,9));
let arrOf3Vec3fsB = array<vec3f, 3>(vec3f(1,2,3), vec3f(4,5,6), vec3f(7,8,9));
```
Arrays that are at the root scope storage declarations are the only arrays that can be specified with no size

```WGSL
@group(0) @binding(0) var<storage> foo: array<mat4x4f>;
// The number of elements in foo is defined by the settings of the bind group used at runtime. You can query this size in your WGSL with arrayLength.

...
let numMatrices = arrayLength(&foo);

```

- functions
fn name(parameters) -> returnType { ..body... }

- entry points 着色器程序入口
常见的有:
@vertex     顶点着色器
@fragment   片元着色器
@compute    计算着色器

- attribute 
attribute 在 WebGPU 中有两处使用，一处是用在 vertex shader 中，且以 @location(number) 定义的变量
```WGSL
struct Stuff {
  @location(0) foo: f32,
  @location(1) bar: vec4f,
};
@vertex vs2(s: Stuff) ...
```

@location(0) 
   1. 作为 vs 顶点着色器的输出，表示 shader 输出到第一个渲染对象(目标) RenderTarget
   2. 表述 vs 顶点着色器的 attribute 输入参数的位置

attribute 还有一处是在 vertex buffer 中作为对象的属性
```js
const pipeline = device.createRenderPipeline({
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
            },...
      ]
   },
   fragment: {
      module,
      entryPoint: 'fs',
      targets: [{ format: format }],
   },
});
```

- inter stage variables / varying / out-in 着色器间传值变量
For inter stage variables, @location attributes define the location where the variables are passed between shaders

```WGSL
struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) color: vec4f,
  @location(1) texcoords: vec2f,
};
 
struct FSIn {
  @location(1) uv: vec2f,
  @location(0) diffuse: vec4f,
};
 
@vertex fn foo(...) -> VSOut { ... }
@fragment fn bar(moo: FSIn) ... 
```
Above, the vertex shader foo passes color as vec4f on location(0) and texcoords as a vec2f on location(1). The fragment shader bar receives them as uv and diffuse because their locations match.


- fragment shader outputs
For fragment shaders @location specifies which GPURenderPassDescriptor.colorAttachment to store the result in.

- @builtin(name)
The @builtin attribute is used to specify that a particular variable’s value comes from a built-in feature of WebGPU

@builtin(position) 
   表示内建的 gl_Position'

- Builtin functions
https://webgpufundamentals.org/webgpu/lessons/webgpu-wgsl-function-reference.html