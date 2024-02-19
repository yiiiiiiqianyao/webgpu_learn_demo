Texture atlas

In computer graphics, a texture atlas (also called a spritesheet or an image sprite in 2d game development) is an image containing multiple smaller images, usually packed together to reduce overall dimensions.[1] An atlas can consist of uniformly-sized images or images of varying dimensions.[1] A sub-image is drawn using custom texture coordinates to pick it out of the atlas.

Benefits
In an application where many small textures are used frequently, it is often more efficient to store the textures in a texture atlas which is treated as a single unit by the graphics hardware. This reduces both the disk I/O overhead and the overhead of a context switch by increasing memory locality. Careful alignment may be needed to avoid bleeding between sub textures when used with mipmapping and texture compression.