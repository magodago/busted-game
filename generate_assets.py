#!/usr/bin/env python3
"""Generate assets with lower resolution for 6GB VRAM"""
import json, requests, time, os, random, sys

BASE = "http://127.0.0.1:8188"
OUTPUT = "/home/dorti/busted/public/assets"
os.makedirs(OUTPUT, exist_ok=True)

# Minimal workflow for 6GB - 512x768, 20 steps, lowvram mode
WF = {
  "3": {"class_type": "KSampler", "inputs": {"seed": 0, "steps": 20, "cfg": 5, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["4",0], "positive": ["6",0], "negative": ["7",0], "latent_image": ["5",0]}},
  "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "RealVisXL_V4.0.safetensors"}},
  "5": {"class_type": "EmptyLatentImage", "inputs": {"width": 512, "height": 768, "batch_size": 1}},
  "6": {"class_type": "CLIPTextEncode", "inputs": {"text": "", "clip": ["4",1]}},
  "7": {"class_type": "CLIPTextEncode", "inputs": {"text": "ugly, deformed, blurry, low quality, watermark, text, bad anatomy", "clip": ["4",1]}},
  "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3",0], "vae": ["4",2]}},
  "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "busted", "images": ["8",0]}}
}

def generate(prompt, seed=None, prefix="busted"):
    wf = json.loads(json.dumps(WF))
    wf["6"]["inputs"]["text"] = prompt
    wf["3"]["inputs"]["seed"] = seed or random.randint(0, 2**31-1)
    wf["9"]["inputs"]["filename_prefix"] = prefix
    
    resp = requests.post(f"{BASE}/api/prompt", json={"prompt": wf})
    if resp.status_code != 200:
        print(f"  ❌ HTTP {resp.status_code}: {resp.text[:200]}")
        return None
    
    pid = resp.json()["prompt_id"]
    print(f"  ⏳ {pid[:8]}...", end=" ", flush=True)
    
    for _ in range(120):  # 6 min max
        time.sleep(3)
        hist = requests.get(f"{BASE}/history/{pid}").json()
        if pid in hist:
            status = hist[pid].get("status", {}).get("status_str", "")
            if status == "error":
                msgs = hist[pid].get("status", {}).get("messages", [])
                err = [m[1] for m in msgs if m[0] == "execution_error"]
                print(f"❌ Error: {str(err)[:100] if err else 'OOM'}")
                return None
            outputs = hist[pid].get("outputs", {})
            for nid, node_out in outputs.items():
                for img_data in node_out.get("images", []):
                    fn = img_data["filename"]
                    sub = img_data.get("subfolder", "")
                    img = requests.get(f"{BASE}/api/view", params={"filename": fn, "subfolder": sub, "type": "output"})
                    if img.status_code == 200:
                        out = os.path.join(OUTPUT, f"{prefix}_{fn}")
                        with open(out, "wb") as f:
                            f.write(img.content)
                        print(f"✅ {os.path.getsize(out)//1024}KB")
                        return out
            print("⚠️ No output")
            return None
    print("⏰ Timeout")
    return None

print("="*50)
print("ASSETS BUSTED (512x768, modo bajo VRAM)")
print("="*50)

# 1. Background
print("\n1️⃣ Fondo Home:")
generate("dark police interrogation room, wooden table, green lamp hanging above, "
         "evidence board with red string, noir atmosphere, neon magenta and cyan, "
         "dramatic shadows, empty room, moody cinematic", seed=777, prefix="home_bg")

# 2. Characters (close-up portraits)
chars = [
    ("char_detective", "portrait of stern male detective, 40s, suit and tie, police badge, intense eyes, "
     "film noir lighting, dark background, dramatic shadows, cinematic portrait"),
    ("char_suspect_m", "portrait of nervous teenage boy, sweaty, shifty eyes, disheveled, "
     "interrogation lights, high contrast, dark background, moody"),
    ("char_suspect_f", "portrait of smirking teenage girl, confident, mysterious, "
     "half face in shadow, cinematic portrait, dark background, dramatic film lighting"),
    ("char_eccentric", "portrait of eccentric detective, wild hair, colorful shirt under coat, "
     "intense curious expression, dark background, dramatic lighting"),
]
for name, prompt in chars:
    print(f"\n  {name}:")
    generate(prompt, prefix=name)

# 3. Logo
print("\n3️⃣ Logo:")
generate("glowing neon text 'BUSTED' on dark brick wall, magenta and cyan neon tubes, "
         "police station sign style, cinematic lighting, dramatic, premium game logo",
         seed=42, prefix="logo_busted")

# 4. Badge
print("\n4️⃣ Badge:")
generate("close up of golden police badge star, shiny metallic texture, dark background, "
         "dramatic lighting, macro photography, detailed engraving",
         seed=123, prefix="btn_badge")

print(f"\n✅ Assets en {OUTPUT}/")
