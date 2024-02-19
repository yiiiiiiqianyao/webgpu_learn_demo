export const rand = (min?: number, max?: number) => {
    if (min === undefined) {
        min = 0;
        max = 1;
    } else if (max === undefined) {
        max = min;
        min = 0;
    }
    return min + Math.random() * (max - min);
};

export function createCubeVertices() {
    const vertexData = new Float32Array([
       //  position   |  texture coordinate
       //-------------+----------------------
       // front face     select the top left image
      -1,  1,  1,        0   , 0  ,
      -1, -1,  1,        0   , 0.5,
       1,  1,  1,        0.25, 0  ,
       1, -1,  1,        0.25, 0.5,
       // right face     select the top middle image
       1,  1, -1,        0.25, 0  ,
       1,  1,  1,        0.5 , 0  ,
       1, -1, -1,        0.25, 0.5,
       1, -1,  1,        0.5 , 0.5,
       // back face      select to top right image
       1,  1, -1,        0.5 , 0  ,
       1, -1, -1,        0.5 , 0.5,
      -1,  1, -1,        0.75, 0  ,
      -1, -1, -1,        0.75, 0.5,
      // left face       select the bottom left image
      -1,  1,  1,        0   , 0.5,
      -1,  1, -1,        0.25, 0.5,
      -1, -1,  1,        0   , 1  ,
      -1, -1, -1,        0.25, 1  ,
      // bottom face     select the bottom middle image
       1, -1,  1,        0.25, 0.5,
      -1, -1,  1,        0.5 , 0.5,
       1, -1, -1,        0.25, 1  ,
      -1, -1, -1,        0.5 , 1  ,
      // top face        select the bottom right image
      -1,  1,  1,        0.5 , 0.5,
       1,  1,  1,        0.75, 0.5,
      -1,  1, -1,        0.5 , 1  ,
       1,  1, -1,        0.75, 1  ,
   
    ]);
   
    const indexData = new Uint16Array([
       0,  1,  2,  2,  1,  3,  // front
       4,  5,  6,  6,  5,  7,  // right
       8,  9, 10, 10,  9, 11,  // back
      12, 13, 14, 14, 13, 15,  // left
      16, 17, 18, 18, 17, 19,  // bottom
      20, 21, 22, 22, 21, 23,  // top
    ]);
   
    return {
      vertexData,
      indexData,
      numVertices: indexData.length,
    };
}