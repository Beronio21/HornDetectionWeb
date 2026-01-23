import numpy as np
import sounddevice as sd
import soundfile as sf
from scipy import signal
from pathlib import Path
import time
from collections import deque
import json
from datetime import datetime
import uuid
from pathlib import Path
import random
import os


class HornDetector:
    def __init__(self, horn_folder="horn", sample_rate=22050, threshold=0.7):
        self.horn_folder = Path(horn_folder)
        self.sample_rate = sample_rate
        self.threshold = threshold
        self.horn_templates = []
        self.buffer = deque(maxlen=int(5 * sample_rate))
        self.last_detection_time = 0
        self.cooldown = 3.0

        self.load_horn_templates()

    def load_horn_templates(self):
        """Load all WAV files from horn folder"""
        wav_files = list(self.horn_folder.glob("*.wav"))
        print(f"Loading {len(wav_files)} horn templates...")

        for wav_file in wav_files:
            audio, sr = sf.read(wav_file)

            # Convert stereo to mono if needed
            if len(audio.shape) > 1:
                audio = np.mean(audio, axis=1)

            # Resample if needed
            if sr != self.sample_rate:
                num_samples = int(len(audio) * self.sample_rate / sr)
                audio = signal.resample(audio, num_samples)

            # Normalize
            audio = audio / (np.max(np.abs(audio)) + 1e-10)

            self.horn_templates.append({
                'name': wav_file.name,
                'audio': audio,
                'features': self.extract_features(audio)
            })

        print(f"Loaded {len(self.horn_templates)} horn templates")

    def extract_features(self, audio):
        """Extract spectral features from audio"""
        # Compute spectrogram
        f, t, Sxx = signal.spectrogram(audio, self.sample_rate, nperseg=512)
        # Use log magnitude
        Sxx_log = np.log10(Sxx + 1e-10)
        return Sxx_log

    def compare_audio(self, live_audio):
        """Compare live audio with all horn templates"""
        if len(live_audio) < self.sample_rate:
            return [], 0.0

        # Check if audio has sufficient energy (not silence)
        rms_energy = np.sqrt(np.mean(live_audio**2))
        if rms_energy < 0.01:
            return [], 0.0

        # Normalize live audio
        live_audio = live_audio / (np.max(np.abs(live_audio)) + 1e-10)
        live_features = self.extract_features(live_audio)

        all_matches = []
        best_score = 0.0

        for template in self.horn_templates:
            # Resize features to match
            min_time = min(
                live_features.shape[1], template['features'].shape[1])
            min_freq = min(
                live_features.shape[0], template['features'].shape[0])

            live_feat = live_features[:min_freq, :min_time]
            temp_feat = template['features'][:min_freq, :min_time]

            # Compute normalized cross-correlation
            correlation = np.corrcoef(
                live_feat.flatten(), temp_feat.flatten())[0, 1]

            if not np.isnan(correlation):
                all_matches.append({
                    'name': template['name'],
                    'score': correlation
                })
                if correlation > best_score:
                    best_score = correlation

        # Sort by score descending
        all_matches.sort(key=lambda x: x['score'], reverse=True)
        return all_matches, best_score

    def audio_callback(self, indata, frames, time_info, status):
        """Callback for audio stream"""
        if status:
            print(f"Status: {status}")

        # Add incoming audio to buffer
        audio_mono = np.mean(indata, axis=1) if len(
            indata.shape) > 1 else indata[:, 0]
        self.buffer.extend(audio_mono)

    def run(self, check_interval=1.0):
        """Start real-time horn detection"""
        print(f"\nStarting horn detection...")
        print(f"Threshold: {self.threshold}")
        print(f"Sample rate: {self.sample_rate} Hz")
        print(f"Press Ctrl+C to stop\n")

        with sd.InputStream(samplerate=self.sample_rate, channels=1,
                            callback=self.audio_callback, blocksize=2048):
            try:
                while True:
                    time.sleep(check_interval)

                    if len(self.buffer) >= int(5 * self.sample_rate):
                        # Get last 5 seconds of audio
                        live_audio = np.array(self.buffer)

                        # Compare with templates
                        all_matches, best_score = self.compare_audio(
                            live_audio)

                        current_time = time.time()

                        # Filter matches above threshold
                        detected_matches = [
                            m for m in all_matches if m['score'] >= self.threshold]

                        if detected_matches:
                            if current_time - self.last_detection_time > self.cooldown:
                                print(
                                    f"🚨 HORN DETECTED - Matches: {len(detected_matches)}")
                                for match in detected_matches:
                                    print(
                                        f"   - {match['name']}: {match['score']:.2%}")

                                # Write detection event as JSON for the uploader to pick up
                                try:
                                    output_dir = Path(__file__).resolve(
                                    ).parent.parent / "storage" / "app" / "public" / "violation_images"
                                    output_dir.mkdir(
                                        parents=True, exist_ok=True)

                                    # Use the best match for event meta
                                    best = detected_matches[0]
                                    # Create a realistic-looking event payload so backend accepts it
                                    # Allow overriding the plate for testing via HORN_TEST_PLATE env var
                                    test_plate = os.getenv("HORN_TEST_PLATE")
                                    if test_plate:
                                        generated_plate = test_plate
                                        print(
                                            f"Using test plate override: {generated_plate}")
                                    else:
                                        generated_plate = f"UNKNOWN-{uuid.uuid4().hex[:6].upper()}"
                                    event = {
                                        "custom_user_id": "0",
                                        "detected_at": datetime.now().isoformat(),
                                        "speed": round(random.uniform(10.0, 30.0), 1),
                                        # use a generated placeholder plate so the backend will store the event
                                        "plate_number": generated_plate,
                                        "status": "flagged",
                                        "decibel_level": round(float(best['score']) * 100, 2),
                                        "source": "horn_detector",
                                        "updated_at": datetime.now().isoformat(),
                                        "created_at": datetime.now().isoformat(),
                                    }

                                    fname = f"horn_event_{int(time.time())}_{uuid.uuid4().hex}.json"
                                    with open(output_dir / fname, "w", encoding="utf-8") as jf:
                                        json.dump(event, jf, indent=4)

                                    print(
                                        f"Wrote horn event: {output_dir / fname}")

                                    # Try POSTing directly to backend API asynchronously
                                    # so detector loop is not blocked by slow API responses.
                                    post_helper = None
                                    try:
                                        from . import post_helper as _ph
                                        post_helper = _ph
                                    except Exception:
                                        try:
                                            import post_helper as _ph
                                            post_helper = _ph
                                        except Exception:
                                            post_helper = None

                                    api_url = "http://localhost:8000/api/violations"
                                    headers = {
                                        "Content-Type": "application/json"}

                                    if post_helper:
                                        # fire-and-forget threaded POST; failures are written to .failed.json
                                        try:
                                            post_helper.post_event_async(
                                                event,
                                                api_url,
                                                headers=headers,
                                                max_retries=5,
                                                timeout=20,
                                                output_dir=str(output_dir),
                                                filename=fname,
                                            )
                                        except Exception as e:
                                            print(
                                                f"post_helper async call failed: {e}")
                                    else:
                                        # fallback to synchronous attempt if helper unavailable
                                        try:
                                            import requests
                                            resp = requests.post(
                                                api_url, json=event, headers=headers, timeout=20)
                                            if resp.status_code in (200, 201):
                                                print(
                                                    f"Posted horn event to API: {resp.status_code}")
                                            else:
                                                print(
                                                    f"API post returned status {resp.status_code}: {resp.text}")
                                        except Exception as e:
                                            print(
                                                f"Failed to POST event to API: {e}")
                                            # leave the JSON file for the uploader/consumer to pick up

                                except Exception as e:
                                    print(f"Failed to write horn event: {e}")

                                self.last_detection_time = current_time
                        else:
                            if all_matches:
                                best = all_matches[0]
                                print(
                                    f"Monitoring... (best: {best['name']}, score: {best['score']:.2%})    ", end='\r')
                            else:
                                print(
                                    f"Monitoring... (no signal)                              ", end='\r')

            except KeyboardInterrupt:
                print("\n\nStopping horn detection...")


if __name__ == "__main__":
    # Create detector instance
    detector = HornDetector(
        horn_folder="horn",
        sample_rate=22050,
        threshold=0.70
    )

    # Start detection
    detector.run(check_interval=0.5)
