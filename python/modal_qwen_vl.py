"""
Modal deployment for Qwen 2.5 VL 7B — OpenAI-compatible vision LLM endpoint.

Serves as the primary LLM for Browser Use agent apply.
Scale-to-zero: only costs money when processing applications.

Deploy:   modal deploy python/modal_qwen_vl.py
Test:     modal run python/modal_qwen_vl.py
Logs:     modal app logs recrutas-qwen-vl

Cost: ~$0.01-0.02 per application ($30/mo free credits covers ~2000 apps)
"""

import modal

MINUTES = 60
MODEL_NAME = "Qwen/Qwen2.5-VL-7B-Instruct"
VLLM_PORT = 8000

vllm_image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.8.0-devel-ubuntu22.04", add_python="3.12"
    )
    .entrypoint([])
    .pip_install(
        "vllm>=0.9.0",
        "huggingface-hub>=0.30.0",
    )
)

hf_cache_vol = modal.Volume.from_name("hf-cache", create_if_missing=True)

app = modal.App("recrutas-qwen-vl")


@app.function(
    image=vllm_image,
    gpu="A10G",                         # 24GB VRAM — sufficient for 7B VL in bf16
    scaledown_window=10 * MINUTES,      # Stay warm 10 min after last request
    timeout=10 * MINUTES,
    volumes={
        "/root/.cache/huggingface": hf_cache_vol,
    },
    min_containers=0,                   # Scale to zero when idle
    max_containers=1,                   # Cap cost — 1 container at a time
)
@modal.concurrent(max_inputs=4)
@modal.web_server(port=VLLM_PORT, startup_timeout=10 * MINUTES)
def serve():
    import subprocess

    cmd = [
        "python", "-m", "vllm.entrypoints.openai.api_server",
        "--model", MODEL_NAME,
        "--served-model-name", MODEL_NAME,
        "--host", "0.0.0.0",
        "--port", str(VLLM_PORT),
        "--dtype", "bfloat16",
        "--max-model-len", "16384",
        "--gpu-memory-utilization", "0.95",
        "--enforce-eager",
        "--tensor-parallel-size", "1",
        "--trust-remote-code",
    ]

    print(f"Starting vLLM: {' '.join(cmd)}")
    subprocess.Popen(cmd)


@app.local_entrypoint()
async def test():
    """Quick test: send a vision request to the deployed endpoint."""
    import aiohttp
    import asyncio
    import json

    url = serve.web_url
    print(f"Endpoint: {url}")

    # Wait for health
    async with aiohttp.ClientSession() as session:
        for i in range(120):
            try:
                async with session.get(f"{url}/health") as resp:
                    if resp.status == 200:
                        print(f"Server healthy after {i * 5}s")
                        break
            except Exception:
                pass
            await asyncio.sleep(5)
        else:
            print("Server did not become healthy in time")
            return

        # Send a test completion
        payload = {
            "model": MODEL_NAME,
            "messages": [
                {
                    "role": "user",
                    "content": "Say 'Hello from Qwen VL on Modal!' in exactly those words.",
                }
            ],
            "max_tokens": 50,
        }

        async with session.post(
            f"{url}/v1/chat/completions",
            json=payload,
            headers={"Content-Type": "application/json"},
        ) as resp:
            result = await resp.json()
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"Response: {content}")
