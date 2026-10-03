// 逐字照抄自 subtitles.srt(原文、顺序、起止时间不改)
export type Cue = {text: string; startMs: number; endMs: number};

export const CUES: Cue[] = [
  {text: '猫学长的朋友们，快来用', startMs: 800, endMs: 3300},
  {text: 'motion face的视频发布任务功能吧', startMs: 3300, endMs: 6060},
];

// 原音完整时长(毫秒);画面覆盖 max(最后一条字幕结束, 原音时长)
export const AUDIO_MS = 7200;
export const FPS = 30;
export const DURATION_IN_FRAMES = Math.ceil(
  (Math.max(CUES[CUES.length - 1].endMs, AUDIO_MS) / 1000) * FPS,
);

export const msToFrame = (ms: number) => Math.round((ms / 1000) * FPS);
