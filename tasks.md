## 目录统一改造需求

### 需求背景
当前项目存在“内容资产”分散的问题：
- 文章（`.md`）在 `content/posts/`
- 配图原图在 `content/md_images/`
- PDF 附件在 `public/files/`
- 更新日志在 `content/changelog.md`（但部分类似内容可能散落）

这导致文章引用时路径混乱（`../md_images/`、`../../public/files/` 混用），部署时需要分别关心 `content/` 和 `public/` 两个目录，且 `public/` 同时承担“创作素材”和“前端静态资源”两种职责。

### 改造需求
**将所有创作者直接产出/维护的内容，统一收归 `content/` 目录下。**

具体包含：
- 文章（`.md`）
- 配图原图（放在 `content/md_images/`）
- PDF 附件（从 `public/files/` 移至 `content/files/`）
- 更新日志（`changelog.md`）
- 任何未来新增的“内容型”文件（如数据 JSON、书单、友链等）

`public/` 仅保留：
- 前端静态资源：背景图（`bg/`）、开屏素材（`hutao/`）
- 构建产物：压缩后的配图（`md_images/`）

### 改造后效果
1. **目录直觉统一**：所有“我写的内容”都在 `content/` 下，增删改查一目了然
2. **文章引用一致**：所有引用都是 `../md_images/`、`../files/`，不再跨目录跳转
3. **部署逻辑简化**：`content/` 完整打包上传，`public/` 只负责静态托管
