# 3D 模型资产目录

把可在网页交互查看的 3D 资产放在这里，然后在 `src/data/projects.ts` 里用 `model` 字段引用。

## 3DGS 高斯泼溅模型

支持格式：`.ply`（原始高斯点）、`.splat`、`.ksplat`（压缩格式，推荐，体积最小、加载最快）。

放置方式：

```text
public/assets/models/your-scene.ply
```

在 `src/data/projects.ts` 对应项目里加上：

```ts
{
  slug: '3dgs-printing',
  demoType: 'gaussian',
  model: './assets/models/your-scene.ply',   // 路径以 ./assets 开头
  ...
}
```

保存后，项目详情页会自动用真实的 3DGS 查看器加载它，可拖动旋转 / 缩放。
没有填 `model` 的项目仍然显示程序生成的占位动画。

## 建议

- 首页卡片不加载真实高斯模型（太大会拖慢首屏），只有点进详情页才懒加载。
- `.ply` 通常几十~上百 MB，建议先用官方工具转成 `.ksplat` 压缩格式，体积可降到几分之一。
- 网页演示用的场景建议先下采样到较小规模（几十万高斯以内），保证流畅。
