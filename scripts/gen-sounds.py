"""
Generate Dropped's three paper sounds procedurally (original, royalty-free).

    python scripts/gen-sounds.py

Writes mono 22.05 kHz 16-bit WAVs to assets/sounds/:
  paper_rustle.wav  — the wax seal cracks (band-passed crinkle bursts)
  pen_scratch.wav   — the confession is committed (two nib strokes)
  soft_thud.wav     — the "Dropped" screen lands (low body + felt click)

Deterministic (fixed seed), so re-running produces identical files.
Needs numpy only.
"""
import os
import wave

import numpy as np

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')
rng = np.random.default_rng(1879)


def bandpass(x, lo, hi):
    """Crude FFT band-pass with soft edges — fine for noise shaping."""
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    gain = np.clip((f - lo * 0.7) / (lo * 0.3 + 1e-9), 0, 1) * np.clip((hi * 1.3 - f) / (hi * 0.3), 0, 1)
    return np.fft.irfft(spec * gain, len(x))


def env_adsr(n, a, d, s_level, r):
    """Attack/decay/sustain/release envelope over n samples (times in s)."""
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    s = max(n - a - d - r, 0)
    return np.concatenate([
        np.linspace(0, 1, a, endpoint=False),
        np.linspace(1, s_level, d, endpoint=False),
        np.full(s, s_level),
        np.linspace(s_level, 0, r),
    ])[:n]


def fade(x, ms=6):
    k = int(SR * ms / 1000)
    x[:k] *= np.linspace(0, 1, k)
    x[-k:] *= np.linspace(1, 0, k)
    return x


def write(name, x, peak=0.7):
    x = fade(x.astype(np.float64))
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    data = (x * 32767).astype('<i2').tobytes()
    os.makedirs(OUT, exist_ok=True)
    with wave.open(os.path.join(OUT, name), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data)
    print(f'{name}: {len(x) / SR:.2f}s, {len(data) // 1024} KB')


def paper_rustle():
    """A dozen short crinkles of varying brightness, front-loaded like a fold
    being pulled open, over a faint papery hiss."""
    dur = 0.62
    n = int(dur * SR)
    out = bandpass(rng.standard_normal(n), 1800, 7000) * 0.06 * env_adsr(n, 0.02, 0.2, 0.4, 0.3)
    t0 = 0.0
    for i in range(14):
        t0 += rng.uniform(0.012, 0.05) * (1 + i * 0.12)
        if t0 > dur - 0.08:
            break
        ln = int(rng.uniform(0.02, 0.07) * SR)
        lo = rng.uniform(1200, 3000)
        burst = bandpass(rng.standard_normal(ln), lo, lo * rng.uniform(2.2, 3.5))
        burst *= np.exp(-np.linspace(0, rng.uniform(4, 9), ln))
        start = int(t0 * SR)
        amp = rng.uniform(0.5, 1.0) * (1 - t0 / dur) ** 0.6
        out[start:start + ln] += burst[: n - start] * amp
    return out


def pen_scratch():
    """Two quick nib strokes: high-band friction noise with a grainy
    amplitude wobble (the paper's tooth), the second stroke shorter."""
    gap = np.zeros(int(0.06 * SR))
    strokes = []
    for dur, bright in ((0.22, 1.0), (0.14, 0.85)):
        n = int(dur * SR)
        noise = bandpass(rng.standard_normal(n), 2500 * bright, 8500)
        tooth = 0.65 + 0.35 * np.abs(np.sin(np.linspace(0, dur * 2 * np.pi * rng.uniform(55, 75), n)))
        grain = 1 + 0.4 * bandpass(rng.standard_normal(n), 20, 120) / 0.05
        grain = np.clip(grain, 0.3, 1.6)
        strokes.append(noise * tooth * grain * env_adsr(n, 0.015, 0.05, 0.75, 0.07))
    return np.concatenate([strokes[0], gap, strokes[1], np.zeros(int(0.04 * SR))])


def soft_thud():
    """A note landing on a desk: a 70→52 Hz decaying body, a 140 Hz overtone,
    and a muffled felt click on the attack."""
    dur = 0.38
    n = int(dur * SR)
    t = np.arange(n) / SR
    freq = 52 + 18 * np.exp(-t * 18)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    body = np.sin(phase) * np.exp(-t * 11)
    over = 0.25 * np.sin(2 * phase) * np.exp(-t * 22)
    click_n = int(0.018 * SR)
    click = np.zeros(n)
    click[:click_n] = bandpass(rng.standard_normal(click_n), 300, 1800) * np.exp(-np.linspace(0, 6, click_n)) * 0.35
    att = np.clip(t / 0.004, 0, 1)
    return (body + over) * att + click


if __name__ == '__main__':
    write('paper_rustle.wav', paper_rustle(), peak=0.55)
    write('pen_scratch.wav', pen_scratch(), peak=0.45)
    write('soft_thud.wav', soft_thud(), peak=0.8)
