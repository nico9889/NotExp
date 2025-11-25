export interface BitMapImage {
    image: Image;
    rectangle: Rectangle;
}

export interface Image{
    data: string; // Base64 Encoded RAW(?) image
    rectangle: Rectangle;
    pixel_width: number;
    pixel_height: number;
    memory_format: "R8g8b8a8Premultiplied";
}

export interface Rectangle{
    cuboid: Cuboid;
    transform: Transform;
}

export interface Cuboid{
    half_extents: [number, number]
}

export interface Transform{
    affine: [number, number, number, number, number, number, number, number, number]
}
