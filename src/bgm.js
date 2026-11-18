// Background music. Plays site.bgm when set; otherwise a quiet generated ambient pad,
// so the toggle works before a licensed track is added.
const CHORDS = [
  [220.0, 277.18, 329.63, 415.3],   // A maj7
  [185.0, 233.08, 277.18, 369.99],  // F#m7
  [146.83, 220.0, 277.18, 329.63],  // D maj9
  [164.81, 246.94, 311.13, 369.99], // E6/9
];

function createSynth(){
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain(); master.gain.value = 0;
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1400;
  const delay = ctx.createDelay(1); delay.delayTime.value = .42;
  const feedback = ctx.createGain(); feedback.gain.value = .38;
  const wet = ctx.createGain(); wet.gain.value = .35;
  filter.connect(master); filter.connect(delay); delay.connect(feedback); feedback.connect(delay); delay.connect(wet); wet.connect(master);
  master.connect(ctx.destination);
  let step = 0, timer = null;
  const chord = () => {
    const now = ctx.currentTime, notes = CHORDS[step++ % CHORDS.length];
    notes.forEach((freq, i) => {
      for (const detune of [-5, 5]) {
        const osc = ctx.createOscillator(), env = ctx.createGain();
        osc.type = i === 0 ? 'sine' : 'triangle'; osc.frequency.value = i === 0 ? freq / 2 : freq; osc.detune.value = detune;
        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(i === 0 ? .055 : .028, now + 2.2);
        env.gain.linearRampToValueAtTime(0, now + 8.5);
        osc.connect(env); env.connect(filter); osc.start(now); osc.stop(now + 8.6);
      }
    });
  };
  return {
    async play(){
      await ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(.6, ctx.currentTime + 1.5);
      if (!timer) { chord(); timer = setInterval(chord, 6000); }
    },
    pause(){
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + .6);
      clearInterval(timer); timer = null;
      setTimeout(() => { if (!timer) void ctx.suspend(); }, 700);
    },
    dispose(){ clearInterval(timer); void ctx.close(); },
  };
}

function createTrack(url){
  const audio = new Audio(url); audio.loop = true; audio.volume = .45; audio.preload = 'none';
  return {
    play: () => audio.play(),
    pause: () => audio.pause(),
    dispose(){ audio.pause(); audio.src = ''; },
  };
}

export function createBgm(url){
  let player = null, wanted = false;
  const get = () => player ??= url ? createTrack(url) : createSynth();
  const onVisibility = () => { if (!player || !wanted) return; if (document.hidden) player.pause(); else player.play().catch(() => {}); };
  document.addEventListener('visibilitychange', onVisibility);
  return {
    async set(on){ wanted = on; if (on) await get().play(); else player?.pause(); },
    dispose(){ document.removeEventListener('visibilitychange', onVisibility); player?.dispose(); },
  };
}
