# 🔥 Forge

**A local-first AI automation dashboard that builds your projects — and itself.**

Forge is an open-source command center for managing AI-powered workflows from any device. Run it fully local with Ollama, connect to cloud APIs like OpenAI or Anthropic, or mix both — Forge doesn't care where the intelligence comes from.

You bring the models. Forge brings the orchestration.

---

## What is Forge?

Forge is a self-hosted dashboard that orchestrates AI tasks across your projects. It chains together multi-step workflows — research, scoring, drafting, analysis — and queues the results for your review before anything goes out the door.

Run it fully local with your own GPU, use cloud APIs, or mix both depending on the task. Forge doesn't lock you into any single model or provider — assign the right model to the right job and swap anytime.

It's designed to run on a local machine and be accessed from anywhere: your laptop, your phone, or any browser.

**Forge also builds itself.** Its own development, task tracking, and automation workflows are managed through its own dashboard.

## Key Features

- **Multi-project dashboard** — manage multiple projects from a single interface with per-project pipelines, approval queues, and analytics
- **Human-in-the-loop** — every AI-generated output requires explicit review, edit, approve, or reject before it propagates
- **Model-agnostic** — use local models via Ollama (Llama, Qwen, DeepSeek, Mistral, etc.), cloud APIs (OpenAI, Anthropic, Google), or both at the same time
- **Automated pipelines** — configurable multi-step workflows that chain AI tasks together
- **Mobile-responsive** — review approval queues and monitor tasks from your phone
- **Self-improving** — Forge is used to build and improve Forge

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React · TypeScript · Vite · Tailwind · Shadcn/ui |
| Backend | FastAPI (Python) |
| AI Layer | Model-agnostic — Ollama (local) and/or cloud APIs |
| Database | SQLite |
| Task Queue | Celery · Redis |

### Supported AI Providers

| Provider | Type | Examples |
|---|---|---|
| **Ollama** | Local | Llama 3.2, Qwen 3.5, DeepSeek V2, Mistral, Gemma |
| **OpenAI** | Cloud API | GPT-4o, GPT-4o-mini |
| **Anthropic** | Cloud API | Claude Sonnet, Claude Haiku |
| **Google** | Cloud API | Gemini Pro, Gemini Flash |
| **OpenRouter** | Cloud API | Access to 100+ models via single key |

You can assign different providers per task — e.g., a fast local 8B model for scoring, a cloud API for complex drafting — and switch anytime from the dashboard.

## Requirements

- **OS**: Ubuntu 22.04+ / macOS / Windows (with WSL2)
- **Software**: Python 3.11+, Node.js 20+, Redis
- **For local models** (optional): NVIDIA GPU with 10GB+ VRAM, 32GB+ RAM, Ollama installed
- **For cloud APIs** (optional): API key from your preferred provider

## Quick Start

```bash
# Clone the repo
git clone https://github.com/your-username/forge.git
cd forge

# Install backend dependencies
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install

# Configure your AI providers (edit to match your setup)
cp .env.example .env
# → Set OLLAMA_HOST for local models
# → Set OPENAI_API_KEY, ANTHROPIC_API_KEY, etc. for cloud APIs
# → Or both!

# (Optional) Pull local models if using Ollama
ollama pull qwen3.5:8b
ollama pull deepseek-v2:32b

# Start everything
cd ..
./start.sh
```

Then open `http://localhost:3000` in your browser.

For remote access from your phone or another machine, see the [Remote Access Guide](docs/remote-access.md).

## How It Works

1. **Define a project** — set up your project in Forge with its own task pipelines
2. **Configure workflows** — chain AI steps together (e.g., research → score → draft → review)
3. **Let it run** — Forge executes tasks using your configured AI providers, local or cloud
4. **Review & approve** — everything lands in your approval queue for human review before it goes anywhere
5. **Iterate** — refine workflows based on results; Forge gets better as you use it

## Remote Access

Forge is a web app, so accessing it from other devices is straightforward:

- **Same network**: just open `http://<your-machine-ip>:3000`
- **From anywhere**: use [Tailscale](https://tailscale.com) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) for secure remote access without port forwarding

## Contributing

Forge is open source and contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT