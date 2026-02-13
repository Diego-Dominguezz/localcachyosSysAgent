# Local AI System Agent

An intelligent system administration agent that uses local LLMs (via Ollama) to help configure and troubleshoot Linux systems. The agent can suggest and execute commands with your approval, learn from failures, and provide intelligent recommendations.

## Features

- 🤖 **AI-Powered Assistance**: Uses local LLMs through Ollama for intelligent system configuration help
- 🔍 **System Context Awareness**: Automatically gathers system information to provide relevant suggestions
- 🛡️ **Safe Command Execution**: Requires explicit confirmation before running commands
- 📊 **Error Analysis**: Learns from failed commands and suggests fixes
- 💬 **Conversational Interface**: Natural language interaction with command history
- 🔄 **Self-Learning**: Maintains knowledge of command behaviors and system state

## Prerequisites

- **Node.js** (v14 or later)
- **Ollama** installed and accessible
- **Linux-based OS** (Ubuntu, Debian, Arch, Fedora, etc.)
- Basic system administration knowledge

## Quick Start

### 1. Install Ollama

If you don't have Ollama installed:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Pull a Recommended LLM

For best results with system administration tasks, use a **reasoning-capable model**:

```bash
# Best for code and system tasks (recommended)
ollama pull qwen2.5-coder:32b

# Alternative reasoning models
ollama pull deepseek-r1:8b
ollama pull deepseek-coder:33b
ollama pull codestral:22b

# Lighter option (faster but less capable)
ollama pull mistral:7b
```

**Recommendation**: `qwen2.5-coder:32b` or `deepseek-r1:8b` are excellent for system troubleshooting and can actually understand and fix complex issues.

### 3. Clone and Install

```bash
# Note: Repository name contains "cachyos" for historical reasons,
# but the agent now works on all Linux distributions
git clone https://github.com/Diego-Dominguezz/localcachyosSysAgent.git
cd localcachyosSysAgent
npm install
```

### 4. Configure the Model

Edit `llm.js` and set your preferred model:

```javascript
const MODEL = "qwen2.5-coder:32b";  // or your chosen model
```

### 5. Run the Agent

```bash
node agent.js
```

## Usage

Once started, the agent provides an interactive prompt:

```
🧠 System Agent
💡 Commands: next, refresh, context, failures, help <cmd>, reset, quit

You >
```

### Available Commands

- **next** - Ask the agent to continue to the next step
- **refresh** - Refresh system context information
- **context** - Display current system context
- **failures** - Show list of failed commands and suggested fixes
- **help \<cmd\>** - Get help for a specific command
- **reset** - Clear conversation history and start fresh
- **quit/exit** - Exit the agent

### Example Interaction

```
You > I need to check my disk usage

🤖 Agent:
Let me check your disk usage across all mounted filesystems.

```bash
df -h
```

This will show human-readable disk usage for all mounted filesystems.

📋 1 command(s):
  1. df -h

Confirm? (yes/no/ok/run)
You > yes
```

## Configuration

### Changing the LLM Model

Edit `llm.js`:

```javascript
const MODEL = "your-preferred-model";
```

### Customizing System Prompts

The agent uses a dynamic system prompt based on gathered system context. The base prompt is generated in `agent.js` by the `buildSystemPrompt()` function.

### Safety Guards

The agent includes built-in safety guards in `guard.js` that block dangerous commands like:
- Recursive deletions (`rm -rf /`)
- Filesystem formatting (`mkfs`)
- Disk operations (`dd`)
- Fork bombs

## Architecture

- **agent.js** - Main agent loop and orchestration
- **llm.js** - LLM communication interface
- **executor.js** - Command execution utilities
- **guard.js** - Safety checks for dangerous commands

## Troubleshooting

### Ollama Not Running

If you see connection errors:

```bash
# Start Ollama service
ollama serve
```

The agent will attempt to start Ollama automatically if it's not running.

### Model Not Found

Pull the model first:

```bash
ollama pull <model-name>
```

### Permission Errors

Some system commands require sudo. The agent will prompt you when sudo is needed.

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## License

ISC - See [LICENSE](LICENSE) file for details.

## Documentation

- **[Installation Guide](INSTALL.md)** - Detailed step-by-step installation instructions
- **[Usage Examples](EXAMPLES.md)** - Practical examples and common use cases  
- **[Configuration Guide](CONFIG.md)** - Advanced configuration and customization options

## Security Note

Always review commands before executing them. While the agent includes safety guards, you should understand what each command does before confirming execution.
