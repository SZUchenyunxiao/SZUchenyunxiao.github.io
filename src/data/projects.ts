import type { Project } from '../types/project'

export const projects: Project[] = [
  {
    slug: 'structured-light-scanning',
    index: '01',
    title: 'Structured-Light 3D Scanning',
    subtitle: '结构光扫描 · 几何标定 · 位姿估计 · 精度验证',
    summary:
      'A full post-calibration geometry pipeline for high-precision small-object scanning — from target-center extraction and epipolar matching to PnP pose estimation, ICP relocalization, and standard-sphere accuracy validation down to 0.023 mm.',
    year: '2026',
    featured: true,
    tags: ['Structured Light', 'PnP', 'ICP', 'OpenCV', '3D Geometry'],
    metrics: [
      { value: '0.023 mm', label: 'sphere-center distance error' },
      { value: 'PnP + ICP', label: 'pose & relocalization' },
    ],
    demoType: 'pointcloud',
    model: './assets/models/sculpture.ply',
    gallery: [
      { src: './assets/images/sl-sculpture-L1.png', caption: '雕塑结构光扫描 · 条纹 L1' },
      { src: './assets/images/sl-sculpture-L2.png', caption: '雕塑结构光扫描 · 条纹 L2' },
      { src: './assets/images/sl-sphere-L1.png', caption: '标准球扫描 · 精度验证 L1' },
      { src: './assets/images/sl-sphere-L2.png', caption: '标准球扫描 · 精度验证 L2' },
    ],
    overview: [
      'Structured-light scanning projects a series of coded fringe patterns onto an object and recovers its 3D shape from how those patterns deform. It is one of the most accurate ways to digitize small physical objects — but that accuracy only holds if every stage of the geometry pipeline, from calibration to registration, is tightly controlled.',
      'This project focused on the **post-calibration** side of a dual-camera structured-light system: taking raw captured fringe images and calibration targets, and turning them into a clean, metrically accurate point cloud with a **verifiable** accuracy figure — the kind of number you can actually put in an acceptance report.',
    ],
    problem:
      'High-precision structured-light scanning demands sub-millimeter geometric accuracy and robust pose recovery. The challenge: turn raw calibrated captures into a reliable geometry pipeline whose accuracy can actually be measured and trusted.',
    contribution: [
      'Built the calibration-target **circle-center extraction** and **epipolar-constrained matching** front end, giving precise, outlier-resistant stereo correspondence.',
      'Implemented **PnP-based pose estimation** with **ICP relocalization**, producing stable, drift-free registration across all scanning views.',
      'Designed a **standard-sphere evaluation** workflow: fit spheres to the reconstructed surface and compare center distances against the known ground truth, quantifying accuracy to a **0.023 mm** sphere-center error.',
    ],
    pipeline: ['Target detection', 'Epipolar matching', 'PnP pose', 'ICP relocalization', 'Sphere fitting', 'Accuracy report'],
    techDetails: [
      'Circle centers on the calibration target are extracted at sub-pixel precision, then matched under the **epipolar constraint** so correspondences stay geometrically consistent between the two cameras.',
      'Camera pose is recovered with **PnP** from the 2D–3D correspondences, and **ICP** relocalizes each new scan against the accumulated geometry so multi-view captures fuse without drift.',
      'For validation, standard metrology spheres of known diameter are scanned; fitting spheres to the result and measuring **sphere-center distance error** gives an objective, repeatable accuracy metric.',
    ],
    results: [
      'Achieved a **0.023 mm** standard-sphere center-distance error, well within the tolerance expected of high-precision small-object scanning.',
      'Delivered a repeatable **calibration → matching → pose → validation** pipeline that produces both the reconstructed geometry and a quantitative accuracy report.',
      'Validated the approach on both a **sculpture** (free-form surface) and a **standard sphere** (metrology reference), shown in the captures above.',
    ],
    technicalNotes: [
      'Replace the placeholder point cloud with a public or self-captured scan before publishing.',
      'Add the exact statistical definition of the 0.023 mm error once confirmed (MAE / RMSE / max error).',
    ],
  },
  {
    slug: 'mesh-processing',
    index: '02',
    title: 'Mesh Processing Pipeline',
    subtitle: '百万级 Mesh → 轻量仿真几何',
    summary:
      'A geometry-processing pipeline that turns million-triangle scans into lightweight, simulation-ready assets — combining manifold-preserving simplification, part-level segmentation and convex decomposition for physics and VLM training.',
    year: '2026',
    featured: true,
    tags: ['Mesh', 'Topology', 'Convex Decomposition', 'Geometry Processing'],
    metrics: [
      { value: 'Millions → Thousands', label: 'triangle count' },
      { value: '< 1 min', label: 'per-model processing' },
    ],
    demoType: 'mesh',
    model: './assets/models/mesh-simplified.ply',
    gallery: [
      { src: './assets/images/mesh-before.png', caption: '原始扫描网格（减面前）' },
      { src: './assets/images/mesh-after.png', caption: '处理后轻量网格（减面后）' },
      { src: './assets/videos/mesh-compare-000.mp4', type: 'video', caption: '减面前后对比 · 样例 000' },
      { src: './assets/videos/mesh-compare-040.mp4', type: 'video', caption: '减面前后对比 · 样例 040' },
      { src: './assets/videos/mesh-compare-041.mp4', type: 'video', caption: '减面前后对比 · 样例 041' },
    ],
    overview: [
      'A scanned mesh straight out of a 3D scanner is visually rich but computationally hostile: millions of triangles, non-manifold edges, and no notion of parts. Physics engines and model-training pipelines cannot ingest that directly — they need lightweight, watertight, part-aware geometry.',
      'This pipeline sits between raw capture and downstream use. It **simplifies**, **segments**, and **decomposes** heavy scanned meshes into simulation-ready assets, automatically and at scale, so an artist or engineer no longer has to hand-clean every model.',
    ],
    problem:
      'Raw scanned meshes carry millions of triangles — far too heavy for collision simulation and downstream model-training pipelines. They need to be drastically lightened without losing the topology and manifold properties those pipelines depend on.',
    contribution: [
      'Designed and built the end-to-end **Pamo → PartField → VisACD** processing pipeline as a single automated flow.',
      'Cut geometric complexity from **millions to thousands** of triangles while preserving key topology and manifold structure.',
      'Delivered simulation- and training-ready assets at **under one minute per model**.',
    ],
    pipeline: ['Raw mesh', 'Pamo simplification', 'PartField grouping', 'VisACD decomposition', 'Simulation-ready assets'],
    techDetails: [
      '**Pamo** performs manifold-preserving simplification, aggressively reducing triangle count while keeping the surface watertight and topologically sound.',
      '**PartField** groups the simplified mesh into semantically meaningful parts, so downstream tools can reason about the object at the component level rather than as one blob.',
      '**VisACD** (visibility-aware approximate convex decomposition) breaks each part into convex pieces — the representation physics engines need for fast, stable collision handling.',
    ],
    results: [
      'Reduced representative scans from **millions of triangles to a few thousand** with no loss of usable structure — see the before/after models and comparison clips above.',
      'Cut per-model turnaround to **under a minute**, replacing slow manual cleanup.',
      'Output feeds directly into **collision simulation** and **VLM training** workloads as ready-to-use assets.',
    ],
    technicalNotes: [
      'Best portfolio demo: side-by-side original vs processed model with triangle counts.',
      'Add Chamfer / Hausdorff / normal-consistency metrics if you have measured them.',
    ],
  },
  {
    slug: '3dgs-printing',
    index: '03',
    title: '3DGS → Physical Printing',
    subtitle: 'Gaussian 表示 → 微体素切片 → 实体打印',
    // 把你的 3DGS 文件放到 public/assets/models/ 后，取消下一行注释并改成你的文件名。
    // 支持 .ply / .splat / .ksplat（推荐 .ksplat，体积最小）。填了之后详情页会用真实交互查看器。
    // model: './assets/models/your-3dgs-scene.ply',
    summary:
      'An end-to-end workflow that bridges neural 3D representations and physical fabrication — slicing 3D Gaussian Splatting scenes into layer-wise micro-voxel PNG stacks ready for a real printer.',
    year: '2026',
    featured: true,
    tags: ['3DGS', 'Gaussian Splatting', 'Voxelization', '3D Printing'],
    metrics: [
      { value: '3D → Layers', label: 'representation conversion' },
      { value: 'End-to-end', label: 'digital-to-physical workflow' },
    ],
    demoType: 'gaussian',
    gallery: [
      { src: './assets/images/3dgs-print-1.png', caption: '3DGS 切片打印结果 · 视图 1' },
      { src: './assets/images/3dgs-print-2.png', caption: '3DGS 切片打印结果 · 视图 2' },
      { src: './assets/images/collected-model.png', caption: '直接采集重建的 3DGS 模型' },
    ],
    specs: {
      title: 'PolyJet 体素打印切片规格',
      rows: [
        { label: '层厚', value: '0.027 mm（high_mix / high_speed）· 0.014 mm（high_quality）' },
        { label: 'XY 分辨率', value: 'X 600 DPI × Y 300 DPI（像素 2:1 非方形，0.042 × 0.085 mm）' },
        { label: '边距', value: '外圈 0.5 mm' },
        { label: '文件格式', value: 'RGBA PNG（alpha 全 255）或 RGB PNG' },
        { label: 'RGB 语义', value: '材料标识，每像素一种材料' },
        { label: 'Alpha 语义', value: '恒为 255（表示此处有一个墨点）' },
        { label: '背景', value: '黑 (0,0,0)，除非用 --background_material 全屏填充' },
        { label: '颜色数', value: '每层最多 6 种（high_mix / high_quality）或 3 种（high_speed）+ 背景' },
        { label: '调色板', value: '必须来自 PolyJet 材料表' },
        { label: '命名', value: 'slice_000000.png .. slice_NNNNNN.png（6 位十进制）' },
        { label: '附带', value: 'voxel_print_info.json（Build Mode、材料映射等）' },
      ],
    },
    overview: [
      '3D Gaussian Splatting (3DGS) has become one of the most vivid ways to capture real scenes — but its output is a cloud of millions of continuous, semi-transparent Gaussians, a representation designed for screen rendering, not fabrication.',
      'This project builds the missing bridge to the **physical** world: converting a 3DGS scene into the exact layered, per-voxel color format a **PolyJet multi-material printer** expects, so a captured object can be reprinted as a solid, full-color physical model.',
    ],
    problem:
      'A 3D Gaussian Splatting scene is a cloud of continuous, semi-transparent primitives — nothing a conventional layer-by-layer printer can consume directly. It has to be converted into discrete, printable slices without losing the shape.',
    contribution: [
      'Designed and implemented a **Gaussian slicing algorithm** that samples the continuous scene into consistent horizontal layers.',
      'Converted Gaussian primitives into **layer-wise micro-voxel** data and exported them as **PNG slice sequences** with per-pixel material encoding.',
      'Integrated the output with a **Stratasys / PolyJet** format-conversion and delivery workflow, closing the full digital-to-physical loop.',
    ],
    pipeline: ['3D Gaussians', 'Slice plane', 'Micro-voxelization', 'PNG layer stack', 'Printer format', 'Physical object'],
    techDetails: [
      'The scene is sliced along Z at the printer’s native layer thickness; at each height the Gaussians intersecting that plane are resolved into a dense **micro-voxel** grid.',
      'Each voxel is mapped to a single **PolyJet material** and written as one pixel in a **RGBA PNG** slice, using the printer’s non-square 600×300 DPI pixel geometry and a material-table palette.',
      'The full stack (`slice_000000.png …`) plus a `voxel_print_info.json` build descriptor is handed off directly to the printing workflow — see the printing spec below.',
    ],
    results: [
      'Produced complete, printer-ready **PNG slice stacks** directly from raw 3DGS scenes, shown in the printed results above.',
      'Established a reusable **3DGS → physical print** workflow compatible with Stratasys PolyJet multi-material hardware.',
      'Demonstrated the pipeline on self-captured 3DGS models, bridging neural capture and real fabrication end to end.',
    ],
    technicalNotes: [
      'Ideal interactive demo: a Z slider that reveals the current slice while the 3D Gaussian scene remains visible.',
      'Use synthetic/public Gaussian data if the original company scene is confidential.',
    ],
  },
  {
    slug: 'panohk360',
    index: '04',
    title: 'PanoHK360',
    subtitle: '全景影像 × LiDAR 跨模态配准与 8K 度量深度',
    summary:
      'A city-scale panorama–LiDAR registration and dense metric-depth pipeline behind a 4.72 TB, ~2M-frame 8K urban RGB-D dataset — the foundation of my first-author NeurIPS 2026 submission.',
    year: '2026',
    featured: true,
    tags: ['LiDAR', 'Panorama', 'ERP', 'HPR', 'Depth Estimation'],
    metrics: [
      { value: '~2M', label: 'panoramic RGB-D frames' },
      { value: '4.72 TB', label: 'dataset scale' },
      { value: '8K', label: '8000 × 4000 depth' },
    ],
    demoType: 'pointcloud',
    overview: [
      'Depth estimation models are only as good as the data they learn from, and large-scale, metrically accurate outdoor RGB-D data is scarce — especially for **360° panoramas**, where existing datasets are small or synthetic.',
      'PanoHK360 addresses that gap: a **city-scale, real-world 8K panoramic RGB-D dataset** built by fusing vehicle-mounted panoramas with airborne LiDAR across Hong Kong. This work is the foundation of my **first-author NeurIPS 2026 submission** and required solving both a cross-modal geometry problem and a data-engineering problem at the terabyte scale.',
    ],
    problem:
      'City-scale panoramas and airborne LiDAR live in different modalities and coordinate frames. Fusing them into geometrically aligned, dense metric depth at 8K resolution — across millions of frames — is both a precision and a scale problem.',
    contribution: [
      'Cleaned local point clouds with filtering, **PCA normal estimation**, back-face removal and **HPR** visibility handling to keep only truly visible geometry.',
      'Registered LiDAR geometry into the camera frame and projected it onto **ERP panoramas** for accurate cross-modal alignment.',
      'Reconstructed **dense 8K metric depth** via row-adaptive filling and morphological closing from sparse projected points.',
      'Curated a **22,751-frame** benchmark with **location-isolated** train/validation splits to prevent geographic leakage.',
    ],
    pipeline: ['Local LiDAR', 'Normal & visibility filtering', 'Rigid transform', 'ERP projection', 'Sparse depth', 'Dense 8K depth'],
    techDetails: [
      'Raw airborne LiDAR is first denoised and normal-estimated with **PCA**; **hidden-point removal (HPR)** discards points that would not actually be visible from the camera, avoiding phantom depth behind surfaces.',
      'The cleaned cloud is rigidly transformed into each camera’s frame and projected onto the **equirectangular (ERP)** panorama, producing a **sparse** metric-depth image aligned pixel-for-pixel with the RGB.',
      'Sparse depth is densified with **row-adaptive filling** and **morphological closing**, yielding a complete **8000×4000** metric depth map per frame.',
    ],
    results: [
      'Built a **~2M-frame**, **4.72 TB** panoramic RGB-D dataset at **8K (8000×4000)** metric depth.',
      'Released a **22,751-frame** mini benchmark with geographically isolated splits for fair depth-estimation evaluation.',
      'Serves as the dataset and benchmark behind a **first-author NeurIPS 2026** submission (CCF A, under review).',
    ],
    technicalNotes: [
      'Best visual: RGB / LiDAR projection / sparse depth / dense depth comparison slider.',
      'Keep paper status and public links synchronized with the actual publication state.',
    ],
  },
  {
    slug: 'lod2-building-reconstruction',
    index: '05',
    title: 'LoD2 Building Reconstruction',
    subtitle: '机载点云 → 建筑分割 → 线框/几何重建',
    summary:
      'A LoD2 building-reconstruction pipeline that lifts large airborne point clouds into structured 3D models — pairing PointTransformer-based understanding with 2D-corner detection and topology reconstruction. Core algorithm work in an industry-delivered project.',
    year: '2025',
    featured: false,
    tags: ['PointTransformer', 'Point Cloud', 'LoD2', 'Building Reconstruction'],
    metrics: [
      { value: 'LoD2', label: 'target detail level' },
      { value: '2D → 3D', label: 'corner lifting pipeline' },
    ],
    demoType: 'building',
    overview: [
      'City-scale digital twins and high-precision maps need **LoD2** building models — clean, structured 3D shells with proper roof geometry, not just raw point blobs. Producing them from airborne LiDAR at project quality is a classic reconstruction challenge.',
      'This was the **core algorithm work** in an industry-delivered university–enterprise project: turning massive, noisy airborne point clouds into structured, acceptance-grade LoD2 building models through a combination of deep point-cloud understanding and disciplined geometry reconstruction.',
    ],
    problem:
      'Airborne point clouds are massive, noisy and unstructured. Recovering clean, watertight LoD2 building geometry from them — at a quality that passes real project acceptance — requires both robust learning and disciplined geometry reconstruction.',
    contribution: [
      'Owned large-scale point-cloud **preprocessing** and **building segmentation** for complex, cluttered urban scenes.',
      'Applied **PointTransformer**-style features to separate and characterize individual buildings.',
      'Developed a **2D corner detection → 3D lifting → connectivity reconstruction** pipeline for structured wireframes.',
      'Established a **geometry-accuracy evaluation** process to guarantee project-acceptance quality; filed 1 patent and 1 software copyright.',
    ],
    pipeline: ['Airborne points', 'Preprocess', 'Building segmentation', '2D corners', '3D lifting', 'Topology / LoD2 model'],
    techDetails: [
      'A **PointTransformer**-based network learns per-point features robust to the density variation and noise of airborne LiDAR, enabling accurate per-building segmentation in dense urban blocks.',
      'Building corners are first detected in a **2D** projection, then **lifted to 3D** and connected by a topology-reconstruction step that recovers a clean structured wireframe.',
      'A dedicated **geometry-accuracy evaluation** compares reconstructed models against reference measurements, providing the quantitative sign-off required for project acceptance.',
    ],
    results: [
      'Delivered **LoD2** building models from large airborne point clouds at a quality that passed real **project acceptance**.',
      'Produced structured wireframe geometry via the full **2D → 3D** corner-lifting pipeline.',
      'Contributed to **1 invention patent** and **1 software copyright** from the project’s core algorithms.',
    ],
    technicalNotes: [
      'Add the exact reconstruction metrics used in the project before presenting the evaluation section.',
    ],
  },
]

export const featuredProjects = projects.filter((project) => project.featured)
