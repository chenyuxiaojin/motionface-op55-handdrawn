import '@fontsource/zcool-kuaile/400.css';
import {Composition} from 'remotion';
import {Main} from './Main';
import {DURATION_IN_FRAMES, FPS} from './captions';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Main"
    component={Main}
    durationInFrames={DURATION_IN_FRAMES}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
