// legacy build 无独立类型声明，复用主包类型
declare module "pdfjs-dist/legacy/build/pdf.min.mjs" {
  export * from "pdfjs-dist";
}
