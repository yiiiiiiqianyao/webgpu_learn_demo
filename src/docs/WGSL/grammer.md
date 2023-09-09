https://xiaozhuanlan.com/topic/4852076931
- GLSL 支持三元运算符 ? : , WGSL 并不直接支持，但提供了内置函数
select(falseValue，trueValue，condition)

```c++
// GLSL
int n = isTrue ? 1 : 0;

// WGSL
let n: i32 = select(0, 1, isTrue);
```