// 将 3DGS 的 .ply 文件转换为压缩的 .ksplat 格式
// 用法: node scripts/ply-to-ksplat.mjs <输入.ply> <输出.ksplat> [压缩级别 0|1|2]
import { readFileSync, writeFileSync } from 'node:fs'
import { PlyParser, SplatBufferGenerator } from '@mkkellogg/gaussian-splats-3d'

const [, , inPath, outPath, levelArg] = process.argv

if (!inPath || !outPath) {
  console.error('用法: node scripts/ply-to-ksplat.mjs <输入.ply> <输出.ksplat> [压缩级别 0|1|2]')
  process.exit(1)
}

const compressionLevel = levelArg !== undefined ? Number(levelArg) : 1
const alphaRemovalThreshold = 1 // 去掉几乎全透明的高斯，减小体积
const sphericalHarmonicsDegree = 0 // 网页展示用 0 阶球谐即可，体积最小

console.log(`读取 ${inPath} ...`)
const fileBuffer = readFileSync(inPath)
// 转成独立的 ArrayBuffer
const arrayBuffer = fileBuffer.buffer.slice(
  fileBuffer.byteOffset,
  fileBuffer.byteOffset + fileBuffer.byteLength,
)

console.log('解析 PLY 高斯数据 ...')
const splatArray = PlyParser.parseToUncompressedSplatArray(arrayBuffer, sphericalHarmonicsDegree)
console.log(`高斯数量: ${splatArray.splatCount}`)

console.log(`生成 SplatBuffer（压缩级别 ${compressionLevel}）...`)
const generator = SplatBufferGenerator.getStandardGenerator(alphaRemovalThreshold, compressionLevel)
const splatBuffer = generator.generateFromUncompressedSplatArray(splatArray)

console.log(`写出 ${outPath} ...`)
writeFileSync(outPath, Buffer.from(splatBuffer.bufferData))
console.log('完成 ✓')
