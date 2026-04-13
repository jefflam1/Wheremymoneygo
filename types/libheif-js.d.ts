declare module "libheif-js" {
  export class HeifDecoder {
    decode(buffer: Buffer | Uint8Array): any[];
  }
}
