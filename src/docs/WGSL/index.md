- 在 wgsl 中 vertex/frag 都可以使用内建的 position 参数，但是他们的含义不同
```wgsl
@builtin(position)
```

In a vertex shader @builtin(position) is the output that the GPU needs to draw triangles/lines/points

In a fragment shader @builtin(position) is an input. It’s the pixel coordinate of the pixel the fragment shader is currently being asked to compute a color for.

Pixel coordinates are specified by the edges of pixels. The values provided to the fragment shader are the coordinates of the center of the pixel