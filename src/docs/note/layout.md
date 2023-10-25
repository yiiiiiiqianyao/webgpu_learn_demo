在 wgsl v1 中有 4 种基础类型
1. f32 32 bit/位 的浮点数 4byte/字节 Float32Array
2. f16 16 bit/位 的浮点数 2byte/字节 Float16Array
3. u32 32 bit/位 的无符号整数（无符号整数常用于表示不能为负数的值）4byte/字节 Uint32Array
4. i32 32 bit/位 的整数 4byte/字节

```js
new Float32Array(length);
new Float32Array(typedArray);
new Float32Array(object);
new Float32Array(buffer [, byteOffset [, length]]);
```
```js
const kOurStructSizeBytes =
  4 + // velocity
  4 + // acceleration
  4 ; // frameCount

const ourStructData = new ArrayBuffer(kOurStructSizeBytes);
const velocityView = new Float32Array(ourStructData, 0, 1);
const accelerationView = new Float32Array(ourStructData, 4, 1);
const frameCountView = new Uint32Array(ourStructData, 8, 1);

velocityView[0] = 1.2;
accelerationView[0] = 3.4;
frameCountView[0] = 56;
```