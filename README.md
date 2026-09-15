# Chen Yunxiao — 3D Reconstruction Portfolio

一个面向 HR 与三维算法面试官的个人作品集骨架：**先看效果，再看算法，再看代码/论文。**

## 1. 技术栈

- Vite + React + TypeScript
- Three.js + React Three Fiber + Drei
- React Router（HashRouter，避免 GitHub Pages 子路由直达 404）
- GitHub Pages + GitHub Actions
- 纯 CSS Design System，避免额外 UI 框架依赖

## 2. 目录结构

```text
.
├── .github/workflows/deploy.yml     # GitHub Pages 自动部署
├── public/
│   └── assets/
│       ├── images/                  # RGB / 深度图 / 项目截图
│       ├── models/                  # GLB / PLY 网页轻量模型
│       └── videos/                  # 轻量首页视频预览
├── src/
│   ├── components/                  # Header / ProjectCard / SectionHeading
│   ├── data/
│   │   ├── projects.ts              # 所有项目文案、指标、Pipeline 的唯一数据源
│   │   └── site.ts                  # 姓名、GitHub、邮箱、论文等
│   ├── pages/
│   │   ├── HomePage.tsx             # HR 10 秒浏览首页
│   │   └── ProjectPage.tsx          # 技术面试官详情页
│   ├── three/
│   │   ├── HeroScene.tsx            # 首页轻量交互 3D
│   │   └── MiniScene.tsx            # 项目占位 Three.js Demo
│   ├── styles/global.css
│   ├── types/project.ts
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── vite.config.ts
└── package.json
```

## 3. 本地运行

Vite 8 当前要求较新的 Node.js；建议 Node 22 LTS。

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm run preview
```

## 4. 你需要最先改的 5 个地方

### A. GitHub 用户名

编辑 `src/data/site.ts`：

```ts
github: 'https://github.com/SZUchenyunxiao'
```

### B. Resume

把 PDF 放到：

```text
public/assets/Chen-Yunxiao-Resume.pdf
```

### C. 项目信息

所有项目集中在：

```text
src/data/projects.ts
```

优先核实：
- 0.023 mm 的统计定义；
- Mesh 的真实输入/输出面数和几何误差指标；
- LoD2 精度评估使用的具体指标；
- 论文最新状态与公开链接。

### D. 真实 3D 模型

当前 Three.js 场景是 **procedural placeholder**，目的是让项目 clone 后直接能运行。

后续建议新增：

```text
src/three/GLBViewer.tsx
src/three/PLYViewer.tsx
src/three/GaussianSliceViewer.tsx
src/components/ImageCompare.tsx
```

然后把项目真实/公开资产放入 `public/assets/`。

### E. 隐私和知识产权

不要上传公司：
- 扫描模型原始数据；
- 内部源码；
- 未授权实验结果；
- 客户数据；
- 内部文档截图。

企业项目用公开数据或你自己重新制作的最小 Demo 重现方法思想。

## 5. 建议首页内容顺序

1. Hero：身份定位 + 轻量交互 3D
2. Selected Work：4 个代表作
   - Structured-Light 3D Scanning
   - Mesh Processing
   - 3DGS → Physical Printing
   - PanoHK360
3. Research：论文 / CVPR Workshop 第三名
4. About：Geometry / Learning / Engineering 三项能力
5. Contact

## 6. 每个项目详情页统一模板

```text
Hero / Interactive Demo
↓
Measured Results
↓
Problem
↓
My Contribution
↓
Pipeline
↓
Technical Details
↓
Paper / Code / Demo
```

HR 到 `Measured Results` 就已经能理解价值；算法面试官可以继续往下看。

## 7. GitHub Pages 部署

推荐仓库直接命名：

```text
SZUchenyunxiao.github.io
```

然后：

```bash
git init
git add .
git commit -m "feat: initialize 3d portfolio"
git branch -M main
git remote add origin https://github.com/SZUchenyunxiao/SZUchenyunxiao.github.io.git
git push -u origin main
```

GitHub：

```text
Settings → Pages → Build and deployment → Source → GitHub Actions
```

之后每次 push 到 `main` 会自动构建并部署。

`vite.config.ts` 已处理两种情况：
- `username.github.io` → `base: /`
- 普通仓库 Pages → 自动使用 `/repository-name/`

## 8. 第二阶段最值得实现的三个交互 Demo

### Mesh Before / After

```text
Original mesh              Processed mesh
millions triangles    →     thousands triangles
```

提供同步相机 + wireframe/solid 开关 + triangle count。

### PanoHK360 Viewer

同位置四层切换：

```text
RGB → LiDAR projection → sparse depth → dense metric depth
```

鼠标悬停可显示 pixel depth。

### 3DGS Slicing

```text
3D Gaussian cloud
        +
Z slice slider
        ↓
current 2D micro-voxel layer
```

这是最能体现你个人差异化的 Demo。

## 9. 性能原则

招聘作品集优先“秒开”，不是追求原始数据规模。

- 首页不要直接加载几百万点。
- 首页只放轻量几何 / 视频缩略预览。
- 点击项目详情页后再懒加载模型。
- 网页演示点云通常单独下采样。
- GLB 使用 Draco / Meshopt 压缩可进一步降低体积。
- 图片优先 WebP / AVIF。
