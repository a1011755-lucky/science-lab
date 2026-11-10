/* 很輕的正弦音。預設關閉；要點一下才會出聲（瀏覽器規定）。音量壓很低。 */
export function createSonify() {
  let ctx = null;
  let osc = null;
  let gain = null;
  let on = false;
  let wasMax = false;
  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 146;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 780;
    gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
  }
  return {
    get enabled() { return on; },
    async toggle() {
      if (!on) {
        ensure();
        await ctx.resume();
        on = true;
      } else {
        on = false;
        this.level(0);
      }
      return on;
    },
    /** 0 到 1。0 完全安靜；接近 1 時輕輕「叮」一聲。 */
    level(amount) {
      if (!ctx || !gain) return;
      const a = on ? Math.max(0, Math.min(1, amount || 0)) : 0;
      const now = ctx.currentTime;
      const freq = 132 + a * 360;
      const vol = a < 0.02 ? 0.00001 : 0.004 + a * 0.028;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(vol, now, 0.09);
      osc.frequency.cancelScheduledValues(now);
      osc.frequency.setTargetAtTime(freq, now, 0.09);
      const maxed = a > 0.94;
      if (on && maxed && !wasMax) {
        const tick = ctx.createOscillator();
        const tg = ctx.createGain();
        tick.type = 'sine';
        tick.frequency.value = 740;
        tg.gain.setValueAtTime(0.00001, now);
        tg.gain.exponentialRampToValueAtTime(0.02, now + 0.025);
        tg.gain.exponentialRampToValueAtTime(0.00001, now + 0.22);
        tick.connect(tg);
        tg.connect(ctx.destination);
        tick.start(now);
        tick.stop(now + 0.24);
      }
      wasMax = maxed;
    }
  };
}

export function mountSoundToggle(host) {
  const synth = createSonify();
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.textContent = '🔈 聲音關';
  b.title = '預設安靜。點一下才會有很輕的聲音。';
  b.addEventListener('click', async () => {
    const on = await synth.toggle();
    b.textContent = on ? '🔊 聲音開' : '🔈 聲音關';
    b.classList.toggle('on', on);
  });
  host.appendChild(b);
  return synth;
}
