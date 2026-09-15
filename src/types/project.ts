export type DemoType = 'mesh' | 'pointcloud' | 'gaussian' | 'building'

export interface ProjectMetric {
  value: string
  label: string
}

export interface Project {
  slug: string
  index: string
  title: string
  subtitle: string
  summary: string
  year: string
  featured: boolean
  tags: string[]
  metrics: ProjectMetric[]
  demoType: DemoType
  /** 项目背景概述，支持多段 */
  overview?: string[]
  problem: string
  contribution: string[]
  pipeline: string[]
  /** 成果与影响 */
  results?: string[]
  /** 技术细节展开，支持多段 */
  techDetails?: string[]
  technicalNotes: string[]
  links?: {
    paper?: string
    code?: string
    demo?: string
  }
  model?: string
  cover?: string
  /** 详情页额外展示的图片或视频 */
  gallery?: {
    src: string
    caption?: string
    /** 资源类型，默认 image */
    type?: 'image' | 'video'
  }[]
  /** 详情页的技术规格表 */
  specs?: {
    title?: string
    rows: { label: string; value: string }[]
  }
}
