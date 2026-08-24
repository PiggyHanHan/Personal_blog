---
title: 一次关于 DSH 配置的“破案”之旅
slug: dsh-config-debugging
date: 2026-08-25
category: 个人
excerpt: 模型列表里明明有视觉模型，上传图片却总报错？一次手把手教你发现 YAML 纯覆盖与字段缺失真相的实战记录。
tags: [DSH, deepseek-v4-flash-vision-exp, 踩坑]
---

一次配置失误，让我花了一整个晚上，从怀疑源码、切换分支，到最终锁定罪魁祸首——原来，真正的“法官”不是源码，而是我自己的 `settings.yaml`。

## 故事起因

最近 DeepSeek 推出了最新的实验版视觉模型 `deepseek-v4-flash-vision-exp`，我想在自己的 DSH（DeepSeek Harness）WebUI 里体验一下。按照官方文档，通过 `npx` 启动是没问题的，但我觉得每次 `npx` 都要联网下载太慢，于是决定用源码启动。

结果，WebUI 的模型下拉列表里**确实出现了视觉模型**，但当我满怀期待地上传一张图片并发送时，却**收到了报错，或者模型根本不理睬图片**——它仿佛就是个纯文本模型。

## 第一轮排查：怀疑源码

我首先想到的是“源码是不是太旧了？”于是我执行了 `git pull`，重新构建，甚至删掉仓库重新克隆，但问题依旧。模型列表里能看到它，但就是不能处理图片。

后来我尝试切换到最新的发布候选标签 `dsh-v0.1.1-rc.2`，发现视觉模型功能竟然正常了！这让我更加困惑——难道 `main` 分支真的有 bug？

## 转折点：发现 YAML 覆盖逻辑与字段缺失

在朋友提醒下，我开始关注 `~/.dsh/settings.yaml`。我回忆起之前曾经手动修改过这个文件，添加过模型列表。当时的配置文件长这样：

```yaml
ui-onboarding:
  welcomeNoticeVersion: 2026-08-13.1
ui-theme:
  preference: dark
llm-deepseek:
  models:
    - id: deepseek-v4-flash
      name: DeepSeek-V4-Flash
      contextWindow: 1000000
    - id: deepseek-v4-pro
      name: DeepSeek-V4-Pro
      contextWindow: 1000000
    - id: deepseek-v4-flash-vision-exp
      name: DeepSeek-V4-Flash-Vision-Exp
      contextWindow: 1000000
      # ❌ 漏掉了最关键的一行：input: [text, image]
agent-default-model:
  provider: deepseek-official
  model: deepseek-v4-flash-vision-exp
  reasoningEffort: high
```

眼尖的你一定发现了：**视觉模型那一行，只有 `id`、`name`、`contextWindow`，却没有 `input: [text, image]`**。而这个字段，恰恰是告诉 DSH 的适配器“这是一个支持图像输入的模型”的关键开关。

抱着试试看的心态，我把这个文件移走，然后重启源码——这时视觉模型不仅能出现在列表中，上传图片后也能正常工作了！

这时我恍然大悟：

1. **`settings.yaml` 不是“补充”，而是“完全覆盖”**。只要文件里定义了 `llm-deepseek.models`，程序就会**抛弃源码内置的所有模型**，只使用你在 YAML 中列出的那些。
2. 我虽然列了视觉模型的 `id` 和 `name`，但**缺少 `input` 字段**。DSH 的适配器会检查该字段，如果它不存在，就不会启用图像处理通道——所以模型看起来在，但本质上被“阉割”了视觉能力，适配器层直接把它当文本模型对待。

更关键的是，这个问题**与源码分支无关**。无论是在 `main`、`master` 还是 `rc` 分支，只要我的 YAML 写错了 `input`，视觉功能就永远出不来。**源码内置的默认列表再完整，也敌不过用户配置的一行覆盖**。

## 后续验证：配置是全局的

我还发现，无论我是用 `npx`、全局安装还是源码启动，它们都读取**同一个** `~/.dsh/settings.yaml`。这意味着，我在一个版本里改错的配置，会影响到所有 DSH 实例。这解释了为什么我切换分支后问题依然存在——配置是共用的。

## 收获与教训

1. **YAML 是“圣旨”**：一旦定义了模型列表，它就是唯一的真相来源。源码内置的模型只是一个“备胎”。
2. **视觉模型必须声明 `input: [text, image]`**：缺少它，适配器就不会把图片传给模型，即使你在下拉列表里选了这个模型，上传图片也会无效或报错。
3. **排查问题时，第一件事就是移走 `settings.yaml`**，看看问题是否消失，这样可以快速区分是配置问题还是源码问题。
4. **如果想省心，就不要在 YAML 里写 `models`**，让程序使用内置列表，这样官方出什么新模型都能自动跟上，且不会因为自己手写漏字段而翻车。

## 结语

这次经历让我深刻体会到了“配置覆盖”的力量，也让我对 Git 分支和标签有了更清晰的认识。开源工具的设计哲学往往是“用户配置高于一切”，理解这一点，就能少走很多弯路。

希望我的“破案”过程能给你一些启发。如果你也遇到类似问题——模型列表里有视觉模型但上传图片不好使——不妨先检查一下你的 `settings.yaml` 里，是否忘了给视觉模型加上 `input: [text, image]` 吧。

---

*本文完全基于真实排查经历，如有雷同，说明你也该检查 `settings.yaml` 了。* 😄