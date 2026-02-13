# Configuration Guide

This guide covers advanced configuration options for the Local AI System Agent.

## Model Configuration

### Changing the LLM Model

Edit `llm.js` and modify the `MODEL` constant:

```javascript
const MODEL = "your-model-name";
```

### Recommended Models by Use Case

#### For Maximum Capability (if you have 16GB+ RAM)
- `qwen2.5-coder:32b` - Best reasoning and problem-solving
- `deepseek-coder:33b` - Excellent for complex debugging
- `codestral:22b` - Good balance of capability and speed

#### For Good Performance (8-16GB RAM)
- `deepseek-r1:8b` - Great reasoning capabilities
- `mistral:7b` - Fast and capable
- `llama2:13b` - Good general-purpose model

#### For Limited Resources (< 8GB RAM)
- `mistral:7b` - Best lightweight option
- `deepseek-r1:1.5b` - Minimal but functional
- `phi:2.7b` - Small but capable

### Installing Multiple Models

You can have multiple models installed and switch between them:

```bash
ollama pull qwen2.5-coder:32b
ollama pull mistral:7b
ollama pull deepseek-r1:8b
```

List installed models:
```bash
ollama list
```

## System Context Configuration

### Customizing System Context Gathering

In `agent.js`, the `gatherSystemContext()` function determines what system information is collected. You can customize this:

```javascript
async function gatherSystemContext() {
  const context = {};

  const commands = {
    os: "cat /etc/os-release 2>&1 || echo 'unknown'",
    kernel: "uname -r 2>&1 || echo 'unknown'",
    packageManager: "command -v apt || command -v dnf || command -v pacman || command -v yum || echo 'unknown'",
    diskUsage: "df -h / 2>&1 || echo 'error'",
    memInfo: "free -h 2>&1 || echo 'error'",
    systemd: "systemctl --version 2>&1 | head -n1 || echo 'not available'",
    shell: "echo $SHELL 2>&1 || echo 'unknown'",
    
    // Add your custom context here:
    // customKey: "your-command-here 2>&1 || echo 'error'"
  };
  // ...
}
```

### Examples of Custom Context

#### Add Docker Information
```javascript
docker: "docker --version 2>&1 || echo 'not installed'",
dockerRunning: "systemctl is-active docker 2>&1 || echo 'not running'"
```

#### Add Network Information
```javascript
network: "ip -br addr 2>&1 || echo 'error'",
gateway: "ip route | grep default 2>&1 || echo 'none'"
```

#### Add GPU Information
```javascript
gpu: "lspci | grep -i vga 2>&1 || echo 'none'",
nvidia: "nvidia-smi --query-gpu=name --format=csv,noheader 2>&1 || echo 'none'"
```

## Environment Variables

### Ollama Configuration

If Ollama is running on a different host or port, you can configure it in `llm.js`:

```javascript
const OLLAMA_URL = "http://localhost:11434/api/generate";
```

Change to:
```javascript
const OLLAMA_URL = "http://your-host:port/api/generate";
```

### GPU Configuration (Optional)

If you need specific GPU settings, you can set environment variables before starting:

```bash
# For AMD ROCm (example)
export OLLAMA_USE_ROCM=1
export HSA_OVERRIDE_GFX_VERSION=11.0.0

# For NVIDIA CUDA (example)
export CUDA_VISIBLE_DEVICES=0

# Then start the agent
node agent.js
```

**Note**: The default configuration no longer sets system-specific GPU variables, making it compatible with all systems.

## Safety Guards

### Customizing Blocked Commands

Edit `guard.js` to customize which commands are blocked:

```javascript
const blockedPatterns = [
  /rm\s+-rf\s+\//,      // Prevent recursive deletion from root
  /mkfs/,               // Prevent filesystem formatting
  /dd\s+/,              // Prevent disk operations
  /:\(\)\s*{\s*:\|\:&\s*};:/, // Prevent fork bombs
  
  // Add your own patterns:
  // /dangerous-command/,
];
```

### Adding Warning Patterns

You can add patterns that trigger warnings but don't block execution:

```javascript
const warningPatterns = [
  /rm\s+-rf/,           // Warn on recursive delete
  /chmod\s+777/,        // Warn on overly permissive chmod
  /systemctl\s+stop/,   // Warn when stopping services
];
```

## Prompt Customization

### Modifying the System Prompt

The system prompt is generated dynamically in `agent.js` by the `buildSystemPrompt()` function. You can customize it:

```javascript
function buildSystemPrompt(context) {
  const failedList = failedCommands.length > 0
    ? failedCommands.map(f => `- "${f.command}" FAILED: ${f.error}\n  FIX: ${f.fix || "unknown"}`).join("\n")
    : "none";

  return `You are a Linux system administration expert...
  
  // Customize the prompt here
  // Add your specific instructions, focus areas, or constraints
  
  `;
}
```

### Focus Areas

You can specialize the agent for specific domains:

#### Web Server Management
```javascript
=== SPECIALIZED FOCUS ===
You specialize in web server management including:
- nginx configuration and troubleshooting
- Apache setup and optimization  
- SSL/TLS certificate management
- Load balancing and reverse proxies
```

#### Database Administration
```javascript
=== SPECIALIZED FOCUS ===
You specialize in database administration including:
- PostgreSQL/MySQL configuration
- Database performance tuning
- Backup and recovery procedures
- User and permission management
```

#### Container Management
```javascript
=== SPECIALIZED FOCUS ===
You specialize in container and orchestration:
- Docker container management
- Kubernetes cluster administration
- Container networking and storage
- Service deployment and scaling
```

## Conversation History

### Adjusting History Length

In `agent.js`, change the `MAX_HISTORY` constant:

```javascript
const MAX_HISTORY = 10;  // Number of conversation turns to remember
```

Increase for longer memory (uses more context):
```javascript
const MAX_HISTORY = 20;  // Longer memory
```

Decrease for shorter memory (faster responses):
```javascript
const MAX_HISTORY = 5;   // Shorter memory
```

## Timeout Configuration

### Command Timeout

In `agent.js`, modify the timeout in `runCommandCapture()`:

```javascript
exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
  // 60000 = 60 seconds
```

Change to:
```javascript
exec(command, { timeout: 120000 }, (error, stdout, stderr) => {
  // 120000 = 120 seconds for longer-running commands
```

## Error Analysis Customization

### Adding Custom Error Patterns

In `agent.js`, extend the `analyzeError()` function:

```javascript
// Add after existing error checks
if (output.includes("your-error-pattern")) {
  analysis.suggestion = "Your custom suggestion here";
  analysis.critical = false;  // or true for critical errors
}
```

### Example: Custom Package Manager Error

```javascript
// For Arch Linux AUR helpers
if (output.includes("failed to prepare transaction")) {
  analysis.suggestion = "Package conflict detected. Review conflicting packages and resolve manually.";
  analysis.critical = true;
}
```

## Ollama Server Configuration

### Auto-start Behavior

By default, the agent starts Ollama if it's not running. To disable this:

In `agent.js`, modify the `main()` function:

```javascript
async function main() {
  // Comment out or remove this line:
  // await startOllamaIfNeeded();
  
  // Add a check instead:
  if (!(await isOllamaRunning())) {
    console.error("❌ Ollama is not running. Please start it with: ollama serve");
    process.exit(1);
  }
```

### Using External Ollama Instance

If using a remote Ollama server:

1. Update `llm.js`:
```javascript
const OLLAMA_URL = "http://remote-server:11434/api/generate";
```

2. Disable auto-start in `agent.js` (see above)

## Logging Configuration

### Enable Debug Logging

Add to the beginning of `agent.js`:

```javascript
const DEBUG = process.env.DEBUG === "1";

function debug(...args) {
  if (DEBUG) console.log("[DEBUG]", ...args);
}
```

Then use throughout the code:
```javascript
debug("System context:", systemContext);
debug("Extracted commands:", commands);
```

Run with:
```bash
DEBUG=1 node agent.js
```

## Performance Tuning

### Reduce Context Size

To improve response time with large system contexts, limit the output:

```javascript
context[key] = result.stdout.substring(0, 200).trim();  // Reduced from 400
```

### Stream Responses

For faster perceived response time, enable streaming in `llm.js`:

```javascript
body: JSON.stringify({
  model: MODEL,
  prompt: `${systemPrompt}...`,
  stream: true  // Enable streaming
})
```

Note: This requires handling streamed responses differently.

## Example Custom Configuration

Here's a complete example of a specialized configuration for Docker management:

**llm.js**:
```javascript
const MODEL = "qwen2.5-coder:32b";  // Use powerful model for complex Docker tasks
```

**agent.js** (in `gatherSystemContext()`):
```javascript
const commands = {
  os: "cat /etc/os-release 2>&1 || echo 'unknown'",
  kernel: "uname -r 2>&1 || echo 'unknown'",
  docker: "docker --version 2>&1 || echo 'not installed'",
  dockerRunning: "systemctl is-active docker 2>&1 || echo 'not running'",
  containers: "docker ps -a --format '{{.Names}}: {{.Status}}' 2>&1 || echo 'none'",
  images: "docker images --format '{{.Repository}}:{{.Tag}}' 2>&1 || echo 'none'",
  volumes: "docker volume ls --format '{{.Name}}' 2>&1 || echo 'none'",
  networks: "docker network ls --format '{{.Name}}' 2>&1 || echo 'none'"
};
```

This configuration makes the agent Docker-aware and ready to help with container management tasks.

## Testing Configuration Changes

After making changes:

1. Check syntax:
```bash
node -c agent.js
node -c llm.js
```

2. Test with a simple query:
```bash
node agent.js
# Then type: tell me about my system
```

3. Verify context gathering:
```bash
# In the agent, type:
context
```

This should show your customized system information.
