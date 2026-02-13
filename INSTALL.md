# Installation Guide

This guide will walk you through setting up the Local AI System Agent from scratch.

## Step 1: System Requirements

Ensure you have:
- A Linux-based operating system
- Terminal access
- Internet connection (for initial setup)
- At least 8GB RAM (16GB recommended for larger models)
- 10-50GB free disk space (depending on model size)

## Step 2: Install Node.js

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install -y nodejs npm
```

### Fedora/RHEL
```bash
sudo dnf install -y nodejs npm
```

### Arch Linux
```bash
sudo pacman -S nodejs npm
```

### macOS
```bash
brew install node
```

Verify installation:
```bash
node --version
npm --version
```

## Step 3: Install Ollama

Ollama is required to run local LLMs.

### Linux & macOS
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Manual Installation
Visit [https://ollama.com/download](https://ollama.com/download) for alternative installation methods.

### Verify Ollama Installation
```bash
ollama --version
```

## Step 4: Pull a Language Model

Choose and download a model. **For system administration tasks, reasoning models work best:**

### Recommended Models (in order of capability)

1. **qwen2.5-coder:32b** (Best for system tasks, ~19GB)
   ```bash
   ollama pull qwen2.5-coder:32b
   ```

2. **deepseek-r1:8b** (Great reasoning, ~4.9GB)
   ```bash
   ollama pull deepseek-r1:8b
   ```

3. **deepseek-coder:33b** (Excellent for troubleshooting, ~19GB)
   ```bash
   ollama pull deepseek-coder:33b
   ```

4. **codestral:22b** (Good balance, ~13GB)
   ```bash
   ollama pull codestral:22b
   ```

5. **mistral:7b** (Lightweight option, ~4.1GB)
   ```bash
   ollama pull mistral:7b
   ```

**Note**: Larger models provide better reasoning but require more RAM and disk space.

## Step 5: Clone the Repository

```bash
git clone https://github.com/Diego-Dominguezz/localcachyosSysAgent.git
cd localcachyosSysAgent
```

## Step 6: Install Dependencies

```bash
npm install
```

This will install any required Node.js packages.

## Step 7: Configure the Model

Open `llm.js` in your text editor:

```bash
nano llm.js
# or
vim llm.js
```

Find this line:
```javascript
const MODEL = "mistral";
```

Change it to your chosen model:
```javascript
const MODEL = "qwen2.5-coder:32b";  // or your preferred model
```

Save and exit.

## Step 8: Start the Agent

```bash
node agent.js
```

You should see:
```
🚀 Starting Ollama... (if not already running)
✅ Ollama ready.

🧠 System Agent
💡 Commands: next, refresh, context, failures, help <cmd>, reset, quit

🔍 Scanning system...
✅ Ready

You >
```

## Step 9: Test the Agent

Try a simple command:

```
You > tell me about my system

🤖 Agent:
[The agent will respond with information about your system]
```

## Troubleshooting Installation

### Issue: "ollama: command not found"

**Solution**: Ollama is not in your PATH. Try:
```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH=$PATH:$HOME/.ollama/bin

# Or use full path
/usr/local/bin/ollama --version
```

### Issue: "Cannot connect to Ollama"

**Solution**: Start Ollama manually:
```bash
ollama serve
```

Then in another terminal, run the agent.

### Issue: "Model not found"

**Solution**: Pull the model first:
```bash
ollama pull <model-name>
```

### Issue: "Out of memory" when running large models

**Solution**: 
- Use a smaller model (e.g., `mistral:7b`)
- Close other applications
- Increase swap space if on Linux

### Issue: Node.js version too old

**Solution**: Update Node.js:
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts
```

## Optional: Make it a System Service

To run the agent as a background service (Linux):

1. Create a systemd service file:
```bash
sudo nano /etc/systemd/system/ai-agent.service
```

2. Add:
```ini
[Unit]
Description=Local AI System Agent
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/localcachyosSysAgent
ExecStart=/usr/bin/node agent.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

3. Enable and start:
```bash
sudo systemctl enable ai-agent
sudo systemctl start ai-agent
```

## Next Steps

- Read the [README.md](README.md) for usage examples
- Experiment with different models to find what works best for your use case
- Customize the system prompts in `agent.js` for your specific needs

## Getting Help

If you encounter issues:
1. Check that Ollama is running: `ps aux | grep ollama`
2. Verify the model is downloaded: `ollama list`
3. Check Node.js version: `node --version` (should be v14+)
4. Review error messages carefully
5. Open an issue on GitHub with details

Happy system administration! 🚀
