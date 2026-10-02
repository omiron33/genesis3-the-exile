"""Separate the vocal stem (local Hybrid Demucs checkpoint) so forced alignment hears the voice alone."""
import sys, torch, torchaudio
from torchaudio.pipelines import HDEMUCS_HIGH_MUSDB_PLUS as B
from torchaudio.models import hdemucs_high
SRC = ['drums', 'bass', 'other', 'vocals']
m = hdemucs_high(sources=SRC); m.load_state_dict(torch.load(sys.argv[1], map_location='cpu')); m.eval()
torch.set_num_threads(8)
import wave, numpy as np
with wave.open(sys.argv[2]) as f:
    sr = f.getframerate(); w = torch.from_numpy(np.frombuffer(f.readframes(f.getnframes()), dtype=np.int16).reshape(-1, f.getnchannels()).T.astype(np.float32) / 32768.0)
if sr != B.sample_rate: w = torchaudio.functional.resample(w, sr, B.sample_rate)
ref = w.mean(0); w = (w - ref.mean()) / ref.std()
seg = B.sample_rate * 10; ov = B.sample_rate; out = torch.zeros(len(SRC), 2, w.shape[1])
cnt = torch.zeros(w.shape[1])
with torch.no_grad():
    for s in range(0, w.shape[1], seg - ov):
        chunk = w[:, s:s + seg]
        y = m(chunk[None])[0]
        out[:, :, s:s + chunk.shape[1]] += y; cnt[s:s + chunk.shape[1]] += 1
out /= cnt.clamp(min=1); out = out * ref.std() + ref.mean()
v = out[SRC.index('vocals')]
v = torchaudio.functional.resample(v, B.sample_rate, 48000)
with wave.open(sys.argv[3], 'wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(48000)
    f.writeframes((v.clamp(-1, 1).T.numpy() * 32767).astype(np.int16).tobytes())
print('wrote', sys.argv[3])
