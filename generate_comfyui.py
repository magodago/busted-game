#!/usr/bin/env python3
"""Generate ONE asset at a time via ComfyUI REST API on 6GB VRAM"""
import json, requests, time, os, sys, random

BASE = "http://127.0.0.1:8188"
OUT = "/home/dorti/busted/public/assets/generated"
os.makedirs(OUT, exist_ok=True)

# Ultra-light workflow for 6GB - 384x512, 10 steps, euler, lowvram-friendly
def make_wf(prompt, seed=None, width=384, height=512, prefix="asset"):
    return {
        "3": {"class_type": "KSampler", "inputs": {"seed": seed or random.randint(0,2**31-1), "steps": 10, "cfg": 3.5, 
            "sampler_name": "euler", "scheduler": "normal", "denoise": 1, 
            "model": ["4",0], "positive": ["6",0], "negative": ["7",0], "latent_image": ["5",0]}},
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "RealVisXL_V4.0.safetensors"}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["4",1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": "ugly, deformed, blurry, low quality, watermark, text, signature, bad anatomy, extra fingers, cartoon, illustration", "clip": ["4",1]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3",0], "vae": ["4",2]}},
        "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": prefix, "images": ["8",0]}}
    }

def generate(prompt, fname, width=384, height=512, seed=None):
    wf = make_wf(prompt, seed=seed, width=width, height=height, prefix=fname)
    resp = requests.post(f"{BASE}/api/prompt", json={"prompt": wf})
    if resp.status_code != 200:
        print(f"  SUBMIT FAIL: {resp.status_code}")
        return None
    pid = resp.json()["prompt_id"]
    print(f"  ⏳ Submitted {pid[:8]}...", end="", flush=True)
    
    # Poll every 10 seconds for up to 10 minutes
    for i in range(60):
        time.sleep(10)
        try:
            hist = requests.get(f"{BASE}/history/{pid}", timeout=5).json()
        except:
            print(".", end="", flush=True)
            continue
        
        if pid in hist:
            info = hist[pid]
            status = info.get("status", {}).get("status_str", "")
            
            if status == "error":
                msgs = info.get("status", {}).get("messages", [])
                for m in msgs:
                    if m[0] == "execution_error":
                        err = m[1].get("exception_message", "?")
                        print(f"\n  ❌ Error: {err[:80]}")
                        return None
                print(f"\n  ❌ Unknown error")
                return None
            
            outputs = info.get("outputs", {})
            for nid, node_out in outputs.items():
                for img_data in node_out.get("images", []):
                    fn = img_data["filename"]
                    sub = img_data.get("subfolder", "")
                    img = requests.get(f"{BASE}/api/view", params={"filename": fn, "subfolder": sub, "type": "output"})
                    if img.status_code == 200:
                        path = os.path.join(OUT, f"{fname}.png")
                        with open(path, "wb") as f:
                            f.write(img.content)
                        kb = os.path.getsize(path) // 1024
                        print(f" ✅ {kb}KB")
                        return path
            print(f"  ⚠️  No image (status={status})")
            return None
    
    print(f"  ⏰ Timeout")
    return None

# TEST FIRST - tiny generation to verify pipeline works
print("=" * 50)
print("TEST: Generating 1 image to verify pipeline")
print("=" * 50)
r = generate(
    "dark police interrogation room, empty wooden table, green lamp hanging above, noir atmosphere, cinematic shadows",
    "test_verify",
    width=320, height=448
)

if not r:
    print("\n❌ TEST FAILED - ComfyUI pipeline broken")
    print("Check errors above")
    sys.exit(1)

print("\n✅ TEST PASSED! Now generating premium assets...\n")

# =============================================================
# ASSET GENERATION
# =============================================================

# 1. HOME BACKGROUND - 512x768
print("1️⃣ HOME BACKGROUND (512x768)")
generate(
    "dark cinematic police interrogation room, wooden table with green glass lampshade, "
    "evidence board with red strings in background, noir atmosphere, volumetric lighting, "
    "neon cyan and magenta accents, moody shadows, empty chair, blade runner aesthetic",
    "home_bg_premium",
    width=384, height=576,
    seed=777
)

# 2. CHARACTER PORTRAITS
portraits = [
    ("char_detective", "portrait of stern male detective 40s, sharp suit and tie, police badge, "
     "intense eyes, film noir lighting, dark background, dramatic shadows, cinematic portrait", 333),
    ("char_suspect_m", "portrait of nervous teenage boy, sweaty forehead, shifty eyes, "
     "disheveled hair, interrogation lighting, high contrast, dark background", 444),
    ("char_suspect_f", "portrait of confident teenage girl with smirk, mysterious expression, "
     "half face in shadow, cinematic portrait, dark background, dramatic film lighting", 555),
    ("char_eccentric", "portrait of eccentric detective with wild hair and unusual glasses, "
     "colorful shirt under trench coat, intense curious expression, dark background", 666),
    ("char_witness", "portrait of a witness, scared but cooperative expression, "
     "soft lighting from table lamp, dark background, cinematic", 777),
    ("char_mastermind", "portrait of a criminal mastermind, calm calculated expression, "
     "wearing glasses, smoke in background, dark dramatic lighting, cinematic", 888),
]

print("\n2️⃣ CHARACTER PORTRAITS")
for name, prompt, seed in portraits:
    print(f"\n  {name}:")
    generate(prompt, name, width=320, height=448, seed=seed)

# 3. LOGO BACKGROUND
print("\n3️⃣ LOGO BACKGROUND")
generate(
    "dark brick wall with 'BUSTED' in glowing neon tubes, magenta and cyan neon light, "
    "police sign style, cinematic lighting, dramatic shadows, night atmosphere",
    "logo_bg_premium",
    width=448, height=256,
    seed=42
)

# 4. BADGE / BUTTON
print("\n4️⃣ BUTTON BACKGROUND")
generate(
    "close up macro photography of golden police badge star, shiny metallic texture, "
    "dark background, dramatic rim lighting, detailed engraving, premium texture",
    "btn_badge_premium",
    width=320, height=320,
    seed=123
)

print("\n" + "=" * 50)
print(f"✅ ALL ASSETS GENERATED in {OUT}/")
print("=" * 50)
