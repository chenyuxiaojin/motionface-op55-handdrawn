# 手绘纸张风口播短片(Remotion)

16:9(1920×1080 / 30fps)、7.2 秒。风格:手绘线条 + 纸张质感,轻松讲故事。

- 画面:米黄纸纹理,线条每 3 帧"抖"一次(手绘 boiling 效果)。猫学长被一笔笔画出来、挥爪招呼朋友们;第二句开口时镜头摇到手绘任务卡片,写出 "motion face"、荧光笔划出"视频发布任务"、圈出"发布"按钮、纸飞机起飞。
- 字幕:`subtitles.srt` 原文、顺序、起止时间逐字照搬(`src/captions.ts`),首尾空白保留。
- 片长:max(最后一条字幕结束 6.06s, 原音 7.2s) = 7.2s(216 帧)。
- 字体:站酷快乐体 ZCOOL KuaiLe(OFL,经 npm 包 `@fontsource/zcool-kuaile` 引入)。

## 口播原音(私有素材,不在仓库里)

原音从 0 秒起原速整条播放。重新渲染前,把原音文件放到:

```
public/private/voice.webm
```

该目录已在 `.gitignore` 中排除。若原音是其他路径/格式,复制或改名到上面这个位置即可(代码里引用的是 `staticFile('private/voice.webm')`,见 `src/Main.tsx` 顶部 `VOICE_SRC`)。

## 安装

需要 Node.js 20+ 与 pnpm 11。

```bash
pnpm install
```

## 预览

```bash
pnpm run dev        # 打开 Remotion Studio,选 Main
```

## 渲染

```bash
pnpm run render     # 输出 out/video.mp4(H.264 + AAC)
```

单帧检查:`pnpm run still`(输出 out/still.png)。

## 文件

| 路径 | 说明 |
|---|---|
| `src/Main.tsx` | 全部画面、字幕、原音 |
| `src/captions.ts` | 字幕数据与片长计算 |
| `subtitles.srt` | 原始字幕 |
| `remotion.config.ts` | 编码设置(h264 / aac) |
