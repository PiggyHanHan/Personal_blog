---
title: Markdown 语法指南（示例文章）
slug: markdown-guide
date: 2026-01-02
category: 研究
excerpt: 一篇把本站支持的 Markdown 语法全演示一遍的示例：标题、列表、代码、表格、数学公式、插图与图片网格。
tags:
  - 示例
  - Markdown
---

这是一篇**语法大全示例**。照着它的写法写你自己的文章，效果一目了然。看完删掉即可。

## 一、文字格式

支持 **粗体**、*斜体*、~~删除线~~、`行内代码`，以及[超链接](https://example.com)。引用块长这样：

> 这是一段引用。引用可以写在正文中间，用来放重要的话或者别人的观点。

## 二、列表与代码

无序列表：

- 第一项
- 第二项
  - 嵌套一层（会被摊平显示）

有序列表：

1. 第一步
2. 第二步

代码块：

```python
def hello(name: str) -> str:
    return f"你好，{name}！"

print(hello("世界"))
```

## 三、数学公式

行内公式：质能方程 $E = mc^2$，勾股定理 $a^2 + b^2 = c^2$。

独占一行的公式：

$$
\int_0^{+\infty} e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}
$$

## 四、表格

| 分类 | 用途 | 示例 |
| --- | --- | --- |
| 研究 | 论文、调研 | 这一行 |
| 工程 | 开发实践 | 这一行 |
| 生活 | 随笔杂谈 | 这一行 |

## 五、插图

**单张图**：原图放 `content/md_images/`，正文写相对路径 `../md_images/xxx.png`。

![单张示例图](../md_images/sample-1.png)

**多张并排**：同一行写多张图，自动等宽对齐：

![并排1](../md_images/sample-2.png) ![并排2](../md_images/sample-3.png)

**图片网格**：连续图片行之间空一行，就自动合成矩阵，窄屏手机上变单列竖排：

![网格1](../md_images/sample-1.png) ![网格2](../md_images/sample-2.png)

![网格3](../md_images/sample-3.png) ![网格4](../md_images/sample-4.png)

> 不支持原始 HTML（会被转义成纯文本显示）。
