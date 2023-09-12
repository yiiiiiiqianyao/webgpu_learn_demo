export const vert = `
struct VertexStruct {
    scale: vec2f,
    offset: vec2f,
};

@group(0) @binding(0) var<uniform> vertexStruct: VertexStruct;

@vertex
fn main(@builtin(vertex_index) VertexIndex : u32) -> @builtin(position) vec4<f32> {
    var pos = array<vec2<f32>, 3>(
	    vec2<f32>(0.0, 0.5),
	    vec2<f32>(-0.5, -0.5),
	    vec2<f32>(0.5, -0.5)
    );
    return vec4<f32>(
        pos[VertexIndex]* vertexStruct.scale + vertexStruct.offset, 
        0.0, 
        1.0
    );
}
`
export const frag = `
struct FragmentStruct {
    color: vec4f,
};

@group(0) @binding(1) var<uniform> fragmentStruct: FragmentStruct;

@fragment
fn main() -> @location(0) vec4<f32> {
    // vec4f at location(0) => means it will write to the first render target
    return fragmentStruct.color;
}`