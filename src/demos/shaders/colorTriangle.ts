export const vert = `
struct VertexShaderOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
};

@vertex
fn main(@builtin(vertex_index) VertexIndex : u32) -> VertexShaderOutput {
    var pos = array<vec2f, 3>(
	    vec2f(0.0, 0.5),
	    vec2f(-0.5, -0.5),
	    vec2f(0.5, -0.5)
    );
    var color = array<vec4f, 3>(
        vec4f(1, 0, 0, 1), // red
        vec4f(0, 1, 0, 1), // green
        vec4f(0, 0, 1, 1), // blue
    );
    var vsOutput: VertexShaderOutput;
    vsOutput.position = vec4f(pos[VertexIndex], 0.0, 1.0);
    vsOutput.color = color[VertexIndex];
    return vsOutput;
    // return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
}
`
export const frag = `
struct VertexShaderInput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
};

@fragment
fn main(fsInput: VertexShaderInput) -> @location(0) vec4f {
    // vec4f at location(0) => means it will write to the first render target
    return fsInput.color;
}`

// Inter-stage variables connect by location
// export const frag = `
// @fragment
// fn main(@location(0) color: vec4f) -> @location(0) vec4f {
//     return color;
// }`