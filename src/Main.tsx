import {useEffect, useState} from 'react';
import {
  AbsoluteFill,
  Easing,
  Html5Audio,
  cancelRender,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {CUES, msToFrame} from './captions';

// 口播原音(私有素材,不入库):重新渲染前放到 public/private/voice.webm
const VOICE_SRC = 'private/voice.webm';

const INK = '#2B2A28';
const PAPER = '#F4EEDF';
const CARD = '#FFFCF4';
const BLUE = '#3D85E8';
const RED = '#E0533D';
const YELLOW = '#FFE066';
const CAT = '#F6D58E';
const FONT = '"ZCOOL KuaiLe", "PingFang SC", sans-serif';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// 0→1 的描线 / 出现进度
const prog = (f: number, start: number, dur: number) =>
  interpolate(f, [start, start + dur], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.quad),
  });

// 关键时间点(帧),全部由字幕时间换算
const T_CUE1 = msToFrame(CUES[0].startMs); // 24
const T_CUE2 = msToFrame(CUES[1].startMs); // 99
const T_END = msToFrame(CUES[1].endMs); // 182

/* ---------- 基础笔触 ---------- */

const Stroke: React.FC<{
  d: string;
  p: number;
  w?: number;
  color?: string;
  opacity?: number;
}> = ({d, p, w = 6, color = INK, opacity = 1}) =>
  p <= 0 ? null : (
    <path
      d={d}
      pathLength={1}
      strokeDasharray="1 1"
      strokeDashoffset={1 - p}
      fill="none"
      stroke={color}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
    />
  );

// 上色:比线稿稍微错位,像蜡笔涂色没对齐
const Fill: React.FC<{d: string; color: string; a: number}> = ({d, color, a}) =>
  a <= 0 ? null : (
    <path d={d} fill={color} opacity={a} transform="translate(7 6)" />
  );

// 手写文字:从左往右"写"出来
const Written: React.FC<{
  id: string;
  x: number;
  y: number;
  size: number;
  width: number;
  text: string;
  p: number;
  color?: string;
}> = ({id, x, y, size, width, text, p, color = INK}) => {
  if (p <= 0) return null;
  return (
    <g>
      <clipPath id={id}>
        <rect
          x={x - 12}
          y={y - size * 1.2}
          width={(width + 24) * p}
          height={size * 1.7}
        />
      </clipPath>
      <text
        x={x}
        y={y}
        fontFamily={FONT}
        fontSize={size}
        fill={color}
        clipPath={`url(#${id})`}
      >
        {text}
      </text>
    </g>
  );
};

/* ---------- 纸张 ---------- */

const Paper: React.FC = () => (
  <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
    <defs>
      <filter id="grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.85"
          numOctaves={3}
          seed={7}
          stitchTiles="stitch"
        />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0.42  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0.16 0"
        />
      </filter>
      <filter id="blotch" x="0" y="0" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.006"
          numOctaves={2}
          seed={3}
        />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0.55  0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0.22 -0.06"
        />
      </filter>
      <radialGradient id="vignette" cx="50%" cy="48%" r="75%">
        <stop offset="60%" stopColor="#7A5F3C" stopOpacity={0} />
        <stop offset="100%" stopColor="#7A5F3C" stopOpacity={0.22} />
      </radialGradient>
    </defs>
    <rect width={1920} height={1080} fill={PAPER} />
    <rect width={1920} height={1080} filter="url(#blotch)" />
    <rect width={1920} height={1080} filter="url(#grain)" />
    <rect width={1920} height={1080} fill="url(#vignette)" />
  </svg>
);

/* ---------- 猫学长 ---------- */

const HEAD =
  'M -50 -75 L -110 -150 L -138 -30 C -168 60 -110 125 0 125 C 110 125 168 60 138 -30 L 110 -150 L 50 -75 C 20 -84 -20 -84 -50 -75 Z';
const BODY =
  'M -95 110 C -130 240 -120 330 -70 365 L 70 365 C 120 330 130 240 95 110 Z';
const TAIL = 'M 95 330 C 190 345 230 280 200 220 C 185 190 210 168 232 182';
const LEFT_ARM = 'M -100 185 C -145 230 -145 285 -112 305';
const EYES = 'M -78 12 Q -56 -10 -34 12 M 34 12 Q 56 -10 78 12';
const NOSE = 'M -10 36 L 10 36 L 0 47 Z';
const MOUTH = 'M 0 47 Q -14 66 -30 56 M 0 47 Q 14 66 30 56';
const WHISKERS =
  'M -62 44 L -150 32 M -62 58 L -150 68 M 62 44 L 150 32 M 62 58 L 150 68';
const CAP_BOARD = 'M -105 0 L 0 -40 L 105 0 L 0 38 Z';
const CAP_BASE = 'M -62 12 L -62 46 C -25 62 25 62 62 46 L 62 12';
const TASSEL = 'M 0 0 L 82 10 L 86 62';
const ARM = 'M 0 0 C 40 -20 80 -50 105 -85';

const Cat: React.FC<{frame: number; cam: number}> = ({frame, cam}) => {
  const outline = prog(frame, 0, 18);
  const body = prog(frame, 6, 18);
  const face = prog(frame, 14, 14);
  const cap = prog(frame, 20, 12);
  const color = prog(frame, 22, 12);
  const arm = prog(frame, 16, 10);

  // 说话时脑袋轻轻晃
  const talking = frame >= T_CUE1 && frame < T_END;
  const headTilt = talking ? Math.sin(frame * 0.5) * 2.5 : 0;

  // 挥爪 → 镜头移过去时改成指向卡片
  const amp = interpolate(frame, [26, 36], [0, 1], clamp);
  const wave = -8 + Math.sin((frame - 26) * 0.32) * 24 * amp;
  const armRot = interpolate(cam, [0, 1], [wave, 33], clamp);

  return (
    <g>
      <Fill d={BODY} color={CAT} a={color} />
      <Stroke d={BODY} p={body} />
      <Stroke d={TAIL} p={body} />
      <Stroke d={LEFT_ARM} p={body} w={5} />
      <g transform={`translate(95 178) rotate(${armRot})`}>
        <Stroke d={ARM} p={arm} w={6} />
        {arm >= 1 ? (
          <circle
            cx={105}
            cy={-85}
            r={24}
            fill={CAT}
            stroke={INK}
            strokeWidth={5}
          />
        ) : null}
      </g>
      <g transform={`rotate(${headTilt} 0 110)`}>
        <Fill d={HEAD} color={CAT} a={color} />
        <Stroke d={HEAD} p={outline} w={7} />
        <ellipse cx={-92} cy={62} rx={22} ry={12} fill="#F4A6A0" opacity={0.75 * color} />
        <ellipse cx={92} cy={62} rx={22} ry={12} fill="#F4A6A0" opacity={0.75 * color} />
        <Stroke d={EYES} p={face} />
        <Stroke d={NOSE} p={face} w={5} />
        <Stroke d={MOUTH} p={face} w={5} />
        <Stroke d={WHISKERS} p={face} w={3.5} />
        <g transform="translate(0 -112) rotate(-10)">
          <Stroke d={CAP_BASE} p={cap} w={6} />
          {cap > 0 ? <path d={CAP_BOARD} fill={INK} opacity={cap} /> : null}
          <Stroke d={TASSEL} p={cap} w={5} color={RED} />
        </g>
      </g>
    </g>
  );
};

/* ---------- 朋友们 ---------- */

const BLOB =
  'M -70 0 C -70 -50 -35 -72 0 -72 C 40 -72 72 -45 70 5 C 68 50 35 70 -5 70 C -45 70 -70 45 -70 0 Z';
const EXTRAS: Record<string, string> = {
  bunny:
    'M -30 -66 C -48 -140 -14 -152 -8 -70 M 24 -68 C 30 -150 62 -140 40 -62',
  bear: 'M -62 -42 C -82 -62 -60 -92 -38 -66 M 62 -42 C 82 -62 60 -92 38 -66',
  sprout:
    'M 0 -72 C -2 -95 2 -105 0 -118 M 0 -110 C 18 -132 42 -118 32 -104 C 22 -96 6 -104 0 -110',
  curl: 'M -12 -72 C -8 -98 22 -94 10 -74',
};

const FRIENDS = [
  {x: 640, y: 250, color: '#9CC3F0', extra: 'bunny', at: 46},
  {x: 1360, y: 300, color: '#A8D8A0', extra: 'sprout', at: 52},
  {x: 600, y: 660, color: '#F5B3C3', extra: 'bear', at: 58},
  {x: 1400, y: 660, color: '#C9B6EC', extra: 'curl', at: 64},
];

const Friend: React.FC<{
  frame: number;
  fps: number;
  i: number;
  f: (typeof FRIENDS)[number];
}> = ({frame, fps, i, f}) => {
  if (frame < f.at) return null;
  const pop = spring({frame: frame - f.at, fps, config: {damping: 11}});
  // 「快来用」时一起蹦
  const hop =
    frame >= 78 && frame < 128
      ? Math.abs(Math.sin((frame - 78) * 0.42 + i * 0.8)) * 18
      : 0;
  const draw = prog(frame, f.at, 8);
  return (
    <g transform={`translate(${f.x} ${f.y - hop}) scale(${pop})`}>
      <path d={BLOB} fill={f.color} transform="translate(6 5)" />
      <Stroke d={BLOB} p={draw} w={5} />
      <Stroke d={EXTRAS[f.extra]} p={draw} w={5} />
      <circle cx={-22} cy={-8} r={7} fill={INK} />
      <circle cx={22} cy={-8} r={7} fill={INK} />
      <Stroke d="M -20 18 Q 0 36 20 18" p={draw} w={4.5} />
    </g>
  );
};

/* ---------- 任务卡片 ---------- */

const CARD_D = 'M 1660 118 L 2760 110 L 2766 832 L 1655 838 Z';
const THUMB_D = 'M 1730 382 L 2130 378 L 2134 640 L 1728 644 Z';
const PLAY_D = 'M 1895 462 L 1895 558 L 1980 510 Z';
const CIRCLE_D =
  'M 2310 498 C 2485 492 2495 684 2310 686 C 2135 688 2118 506 2300 496 C 2352 494 2402 504 2428 522';

const quad = (t: number, a: number, b: number, c: number) =>
  (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
const PLANE_P = [
  [2420, 560],
  [2660, 650],
  [2960, 130],
];
const planeAt = (t: number) => ({
  x: quad(t, PLANE_P[0][0], PLANE_P[1][0], PLANE_P[2][0]),
  y: quad(t, PLANE_P[0][1], PLANE_P[1][1], PLANE_P[2][1]),
});

const TaskCard: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const box = prog(frame, 104, 18);
  const bar = prog(frame, 114, 8);
  const title = prog(frame, 112, 24);
  const underline = prog(frame, 134, 12);
  const thumb = prog(frame, 124, 14);
  const play = prog(frame, 134, 10);
  const scrub = prog(frame, 138, 12);
  const label = prog(frame, 132, 18);
  const marker = prog(frame, 146, 14);
  const circle = prog(frame, 166, 18);

  const btnPop =
    frame >= 156
      ? spring({frame: frame - 156, fps, config: {damping: 10}})
      : 0;
  const press = interpolate(frame, [184, 188, 194], [0, 1, 0], clamp);
  const btnScale = btnPop * (1 - 0.08 * press);

  const fly = interpolate(frame, [186, 214], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const plane = planeAt(fly);
  const ahead = planeAt(Math.min(1, fly + 0.02));
  const planeRot =
    (Math.atan2(ahead.y - plane.y, ahead.x - plane.x) * 180) / Math.PI;

  if (box <= 0) return null;
  return (
    <g>
      <path
        d={CARD_D}
        fill="url(#hatch)"
        transform="translate(22 22)"
        opacity={box}
      />
      <path d={CARD_D} fill={CARD} opacity={box} />
      <Stroke d={CARD_D} p={box} w={7} />
      <Stroke d="M 1660 192 L 2762 188" p={bar} w={5} />
      {[RED, YELLOW, '#7BC67B'].map((c, i) => (
        <circle
          key={c}
          cx={1712 + i * 42}
          cy={152}
          r={13 * prog(frame, 118 + i * 2, 5)}
          fill={c}
          stroke={INK}
          strokeWidth={3}
        />
      ))}

      <Written
        id="title"
        x={1730}
        y={305}
        size={100}
        width={600}
        text="motion face"
        p={title}
      />
      <Stroke
        d="M 1730 335 C 1900 322 2100 345 2300 326"
        p={underline}
        w={9}
        color={BLUE}
      />

      {thumb > 0 ? (
        <path
          d={THUMB_D}
          fill="#DCEBFB"
          opacity={thumb}
          transform="translate(6 5)"
        />
      ) : null}
      <Stroke d={THUMB_D} p={thumb} w={6} />
      {play > 0 ? (
        <path
          d={PLAY_D}
          fill={BLUE}
          stroke={INK}
          strokeWidth={5}
          strokeLinejoin="round"
          opacity={play}
        />
      ) : null}
      <Stroke d="M 1730 694 L 2132 690" p={scrub} w={5} />
      <Stroke d="M 1730 694 L 1880 692" p={scrub} w={9} color={BLUE} />
      {scrub >= 1 ? (
        <circle cx={1880} cy={692} r={13} fill={CARD} stroke={INK} strokeWidth={4} />
      ) : null}

      <Stroke
        d="M 2178 446 L 2594 442"
        p={marker}
        w={60}
        color={YELLOW}
        opacity={0.8}
      />
      <Written
        id="label"
        x={2185}
        y={468}
        size={66}
        width={400}
        text="视频发布任务"
        p={label}
      />

      {btnScale > 0 ? (
        <g transform={`translate(2310 590) scale(${btnScale})`}>
          <rect
            x={-110}
            y={-48}
            width={220}
            height={96}
            rx={26}
            fill={INK}
            opacity={0.22}
            transform="translate(8 8)"
          />
          <rect
            x={-110}
            y={-48}
            width={220}
            height={96}
            rx={26}
            fill={BLUE}
            stroke={INK}
            strokeWidth={5}
          />
          <text
            x={0}
            y={19}
            fontFamily={FONT}
            fontSize={54}
            fill="#FFFFFF"
            textAnchor="middle"
          >
            发布
          </text>
        </g>
      ) : null}
      <Stroke d={CIRCLE_D} p={circle} w={7} color={RED} />

      {fly > 0
        ? Array.from({length: 16}, (_, k) => k / 16)
            .filter((u) => u < fly - 0.05)
            .map((u) => {
              const pt = planeAt(u);
              return (
                <circle key={u} cx={pt.x} cy={pt.y} r={5} fill={INK} opacity={0.55} />
              );
            })
        : null}
      {fly > 0 ? (
        <g transform={`translate(${plane.x} ${plane.y}) rotate(${planeRot})`}>
          <path
            d="M -48 -28 L 52 0 L -48 30 L -26 2 Z"
            fill="#FFFFFF"
            stroke={INK}
            strokeWidth={5}
            strokeLinejoin="round"
          />
          <path
            d="M -26 2 L 52 0 M -26 2 L -36 30"
            fill="none"
            stroke={INK}
            strokeWidth={4}
            strokeLinecap="round"
          />
        </g>
      ) : null}
    </g>
  );
};

/* ---------- 字幕 ---------- */

const Subtitle: React.FC<{frame: number}> = ({frame}) => {
  const cue = CUES.find(
    (c) => frame >= msToFrame(c.startMs) && frame < msToFrame(c.endMs),
  );
  if (!cue) return null;
  const local = frame - msToFrame(cue.startMs);
  const enter = interpolate(local, [0, 4], [0, 1], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        left: 96,
        right: 96,
        top: 895,
        height: 105,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 58,
          lineHeight: 1.15,
          color: INK,
          whiteSpace: 'nowrap',
          padding: '10px 34px',
          background: 'rgba(255, 252, 244, 0.9)',
          border: `3px solid ${INK}`,
          borderRadius: 14,
          boxShadow: '7px 7px 0 rgba(43, 42, 40, 0.18)',
          opacity: enter,
          transform: `translateY(${(1 - enter) * 10}px) rotate(-0.6deg)`,
        }}
      >
        {cue.text}
      </div>
    </div>
  );
};

/* ---------- 主画面 ---------- */

export const Main: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // 等手写字体的中文子集加载完再出帧,避免掉字
  const [fontHandle] = useState(() => delayRender('Loading ZCOOL KuaiLe'));
  useEffect(() => {
    const allText = [...CUES.map((c) => c.text), '猫学长motion face视频发布任务'].join('');
    Promise.all([
      document.fonts.load(`60px "ZCOOL KuaiLe"`, allText),
      document.fonts.ready,
    ])
      .then(() => continueRender(fontHandle))
      .catch((err) => cancelRender(err));
  }, [fontHandle]);

  // 一个世界、一台摄像机:第二句开口时从猫学长摇到任务卡片
  const cam = interpolate(frame, [T_CUE2, T_CUE2 + 26], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const s = interpolate(cam, [0, 1], [1, 0.72], clamp);
  const tx = interpolate(cam, [0, 1], [0, -361], clamp);
  const ty = interpolate(cam, [0, 1], [0, 90], clamp);

  // 手绘线条"抖动":每 3 帧换一次噪声种子
  const seed = Math.floor(frame / 3) % 6;

  const tag = prog(frame, 30, 16);
  const tagArrow = prog(frame, 44, 10);
  const shadow = prog(frame, 10, 14);

  return (
    <AbsoluteFill>
      <Html5Audio src={staticFile(VOICE_SRC)} />
      <Paper />
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <defs>
          <filter id="boil" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.02"
              numOctaves={2}
              seed={seed}
            />
            <feDisplacementMap
              in="SourceGraphic"
              scale={5}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <pattern
            id="hatch"
            width={12}
            height={12}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(40)"
          >
            <line x1={0} y1={0} x2={0} y2={12} stroke={INK} strokeWidth={2.4} opacity={0.32} />
          </pattern>
        </defs>
        <g
          transform={`translate(${tx} ${ty}) scale(${s})`}
          filter="url(#boil)"
        >
          <ellipse
            cx={960}
            cy={800}
            rx={200}
            ry={26}
            fill="url(#hatch)"
            opacity={shadow}
          />
          {FRIENDS.map((f, i) => (
            <Friend key={f.extra} frame={frame} fps={fps} i={i} f={f} />
          ))}
          <g transform="translate(960 430)">
            <Cat frame={frame} cam={cam} />
          </g>
          <Written
            id="tag"
            x={1150}
            y={155}
            size={60}
            width={180}
            text="猫学长"
            p={tag}
            color={BLUE}
          />
          <Stroke
            d="M 1140 168 C 1100 180 1082 225 1076 268"
            p={tagArrow}
            w={5}
            color={BLUE}
          />
          <Stroke
            d="M 1062 246 L 1076 268 L 1094 250"
            p={tagArrow >= 1 ? 1 : 0}
            w={5}
            color={BLUE}
          />
          <TaskCard frame={frame} fps={fps} />
        </g>
      </svg>
      <Subtitle frame={frame} />
    </AbsoluteFill>
  );
};
