export const site = {
  name: 'Chen Yunxiao',
  nameZh: '陈蕴潇',
  role: '3D Reconstruction & Spatial Intelligence',
  intro:
    'I build geometry pipelines that turn images, point clouds and Gaussian representations into measurable 3D results.',
  introZh: '测绘工程本硕 · 三维视觉 / 点云智能处理 / 3D Gaussian Splatting / 空间智能',
  phone: '158-5568-2789',
  email: '1370214582@qq.com',
  github: 'https://github.com/SZUchenyunxiao',
  resume: './assets/Chen-Yunxiao-Resume.pdf',

  aboutZh:
    '测绘工程本硕背景，研究方向聚焦三维视觉、3D Gaussian Splatting（3DGS）与空间智能。曾任其域创新科技有限公司三维重建算法实习生，参与小物体重建后处理、结构光扫描、3DGS 碰撞仿真及 3D 打印切片等模块研发，具备从算法验证到工程实现的完整项目经验。以第一作者身份投稿 NeurIPS 2026（在审），获 CVPR 2025 Workshop Building3D Competition 全球第 3 名。',

  intent: {
    role: '三维重建算法工程师（3D 视觉 / 测绘 / 空间智能方向）',
    cities: ['深圳', '香港', '上海'],
  },

  education: [
    {
      school: '深圳大学',
      degree: '测绘工程 · 硕士',
      score: 'GPA 90',
      period: '2024.07 – 2027.07（应届生）',
      focus: '点云智能处理、图像 3DGS、全景影像深度估计与新视角合成、跨模态配准',
    },
    {
      school: '河海大学',
      degree: '测绘工程 · 本科',
      score: 'GPA 4.1 / 5',
      period: '2020.09 – 2024.07',
      focus: '',
    },
  ],

  experience: [
    {
      org: '其域创新科技有限公司',
      title: '三维重建算法实习生',
      period: '2026.05 – 2026.08',
      summary: '小物体三维建模后处理、结构光扫描、3DGS 的碰撞仿真与实体打印。',
      points: [
        '**结构光扫描**：负责扫描系统光学标定，完成标定靶标圆心提取、双目极线匹配、**PnP 位姿估计**及 **ICP 重定位**等关键算法，球心距误差控制在 **0.023 mm**。',
        '**Mesh 后处理**：设计并实现 Pamo 减面 → PartField 特征聚类 → VisACD 凸包分解流程，将**数百万三角面简化至数千**，单模型处理时间控制在 **1 分钟以内**。',
        '**3DGS 实体打印**：独立设计并实现 **3DGS 切片算法**，将高斯表示转换为逐层微体素与 PNG 序列，结合 **Stratasys 工作流**完成打印格式转换。',
      ],
    },
    {
      org: 'PanoHK360 · 全景影像与激光点云配准数据处理',
      title: '研究概况',
      period: '2026.01 – 2026.04',
      summary: '设计并实现全景影像与激光点云的跨模态精配准 pipeline，生成高质量深度图。',
      points: [
        '面向城市全景深度估计，参与构建 **200 万帧**、**8000×4000** 分辨率的全景 RGB-D 数据，数据规模约 **4.72 TB**。',
        '负责局部点云提取与高空点过滤，基于 **PCA 法向估计**完成背面点剔除，并用 **HPR** 处理遮挡关系。',
        '将点云刚体变换至相机坐标系并投影至 **ERP 全景平面**，通过行自适应填充与形态学运算生成**稠密 8K 深度图**。',
        '构建 **22,751 帧** PanoHK360-Mini 基准，采用**地点隔离策略**划分训练集与验证集。',
      ],
    },
    {
      org: '激光雷达点云三维建模软件算法研究 · 校企横向项目',
      title: '核心算法研发',
      period: '2024.09 – 2025.05',
      summary: '主导校企合作项目核心算法研发，实现基于机载点云的 LoD2 级别建筑高精度三维重建。',
      points: [
        '负责海量点云数据预处理，采用 **PointTransformer 网络**实现复杂场景建筑物点云的精准分割与特征提取。',
        '基于 Transformer 架构设计 **"2D 角点检测 → 3D 空间提升与连接"** 的线框重建算法管线，并用数据增强提升鲁棒性。',
        '建立三维模型几何精度量化评估体系，保障项目高质量验收，并申请**发明专利与软件著作权各 1 项**。',
      ],
    },
    {
      org: '城市建筑 LoD3 精细化点云建模标注工程 · 技术指导',
      title: '技术指导',
      period: '2025.07 – 2025.12',
      summary: '针对城市建筑物点云开展 LoD3 级别精细化语义标注，服务于高精地图与数字孪生场景。',
      points: [
        '使用 **ReCap / R3D** 等软件对原始建筑物点云进行预处理、去噪与坐标对齐。',
        '制定**标注规范**，完成结构化数据集的构建与质检，支撑相关论文撰写与发表。',
        '深入理解 3D 扫描设备完整工作原理（硬件采集 → 算法处理 → 客户交付），建立**"从算法到产品交付"**的完整认知。',
      ],
    },
  ],

  research: [
    {
      title: 'PanoHK360: A Large-Scale 8K Urban Panoramic Dataset and Benchmark for Depth Estimation',
      meta: '**第一作者** · **NeurIPS 2026** 在审（CCF A 类）· 已完成 rebuttal，录用结果 2026.09.24 公布',
    },
    {
      title: 'Building3D Competition',
      meta: '**CVPR 2025 Workshop** · **全球第 3 名** · 三维建筑点云重建方向',
    },
  ],

  honors: [
    '2021.06 江苏省高等学校第十八届高等数学竞赛（**本科一级 A 组一等奖**）',
    '2021.12 第十三届全国大学生数学竞赛（**非数学类一等奖**）',
    '2022.11 河海大学**优秀学生荣誉称号**、学业优秀奖学金、精神文明奖奖学金',
    '2023.07 江苏省高等学校第二十届高等数学竞赛（**本科一级 A 组一等奖**）',
    '2024–2025 深圳大学**学业优秀奖学金**（连续两学年）',
  ],

  skills: [
    { label: '编程语言', items: 'Python（熟练）· C# / MATLAB（熟悉）· C++（了解）' },
    { label: '点云处理', items: 'Open3D · CloudCompare · R3D · PointTransformer / PointNet 系列' },
    { label: '测绘软件', items: 'AutoCAD · ArcGIS · QGIS · 激光扫描仪数据处理 · LoD 建模工具链' },
    { label: '深度学习', items: 'PyTorch · OpenCV · 3DGS · 深度估计 · 新视角合成' },
    { label: 'AI 工程化', items: 'Claude Code · ChatGPT · Prompt Engineering · AI Agent 辅助开发' },
    { label: '其他技能', items: 'Git · Linux · 数据集构建与质检 · CET-4 / CET-6' },
  ],
}
