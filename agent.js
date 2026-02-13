const fs = require("fs");
const readline = require("readline");
const { spawn, exec } = require("child_process");
const { promisify } = require("util");
const net = require("net");

const { askLLM } = require("./llm");

const execAsync = promisify(exec);

let ollamaProcess = null;
let ollamaStartedByAgent = false;
let conversationHistory = [];

let state = "chat";
let pendingCommands = [];
let systemContext = {};
let commandKnowledge = {};
let failedCommands = [];

const MAX_HISTORY = 10;

// ===============================
// Error Analysis Engine
// ===============================
function analyzeError(cmd, exitCode, stdout, stderr) {
  const output = (stdout + "\n" + stderr).toLowerCase();
  const analysis = { suggestion: null, critical: false };

  // Permission denied → add sudo
  if (output.includes("permission denied") || output.includes("permiso denegado")) {
    if (!cmd.startsWith("sudo ")) {
      analysis.suggestion = `Command needs root privileges. Try: sudo ${cmd}`;
    } else {
      analysis.suggestion = "Command failed even with sudo. Check if the path exists and you have the right permissions.";
    }
  }

  // Command not found
  if (output.includes("command not found") || output.includes("no existe") || output.includes("not found")) {
    const cmdName = cmd.replace(/^sudo\s+/, "").split(/\s+/)[0];
    analysis.suggestion = `'${cmdName}' is not installed. Install it using your system's package manager.`;
  }

  // Unknown subcommand
  if (output.includes("unknown command") || output.includes("invalid option")) {
    const cmdName = cmd.replace(/^sudo\s+/, "").split(/\s+/)[0];
    analysis.suggestion = `Invalid subcommand. Run '${cmdName} --help' to see valid options.`;
  }

  // Package not found (generic)
  if (output.includes("target not found") || output.includes("unable to locate package") || output.includes("no package")) {
    analysis.suggestion = "Package doesn't exist in repositories. Check the correct package name.";
  }

  // Already up to date / skipping
  if (output.includes("skipping") && output.includes("same") || output.includes("already up to date") || output.includes("already installed")) {
    analysis.suggestion = "Already up to date or installed. This is not a real failure, just informational.";
    analysis.critical = false;
  }

  // Keys or certificates already exist
  if (output.includes("already been created") || output.includes("already exists")) {
    analysis.suggestion = "Resource already exists. This may not be an error - check if you can skip this step.";
  }

  return analysis;
}

// ===============================
// Command Knowledge
// ===============================
async function learnCommand(cmdName) {
  if (commandKnowledge[cmdName]) return commandKnowledge[cmdName];
  try {
    const result = await execAsync(
      `${cmdName} --help 2>&1 || ${cmdName} -h 2>&1 || echo 'no help'`
    );
    commandKnowledge[cmdName] = result.stdout.substring(0, 500);
    return commandKnowledge[cmdName];
  } catch (e) {
    return "no help available";
  }
}

// ===============================
// Capture command output
// ===============================
function runCommandCapture(command) {
  return new Promise((resolve) => {
    exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout || "",
        stderr: stderr || "",
        exitCode: error ? error.code || 1 : 0,
        success: !error
      });
    });
  });
}

// ===============================
// Interactive execution (sudo)
// ===============================
function runCommandInteractive(command) {
  return new Promise((resolve) => {
    const child = spawn(command, {
      stdio: "inherit",
      shell: true
    });

    let output = "";

    child.on("exit", (code) => {
      resolve({ exitCode: code || 0, success: code === 0, stdout: output, stderr: "" });
    });

    child.on("error", (err) => {
      console.error(`❌ ${err.message}`);
      resolve({ exitCode: 127, success: false, error: err.message, stdout: "", stderr: err.message });
    });
  });
}

// ===============================
// System Context
// ===============================
async function gatherSystemContext() {
  const context = {};

  const commands = {
    os: "cat /etc/os-release 2>&1 || echo 'unknown'",
    kernel: "uname -r 2>&1 || echo 'unknown'",
    packageManager: "command -v apt || command -v dnf || command -v pacman || command -v yum || echo 'unknown'",
    diskUsage: "df -h / 2>&1 || echo 'error'",
    memInfo: "free -h 2>&1 || echo 'error'",
    systemd: "systemctl --version 2>&1 | head -n1 || echo 'not available'",
    shell: "echo $SHELL 2>&1 || echo 'unknown'"
  };

  for (const [key, cmd] of Object.entries(commands)) {
    try {
      const result = await execAsync(cmd);
      context[key] = result.stdout.substring(0, 400).trim();
    } catch (e) {
      context[key] = "error: " + e.message.substring(0, 100);
    }
  }

  return context;
}

// ===============================
// System Prompt
// ===============================
function buildSystemPrompt(context) {
  const failedList = failedCommands.length > 0
    ? failedCommands.map(f => `- "${f.command}" FAILED: ${f.error}\n  FIX: ${f.fix || "unknown"}`).join("\n")
    : "none";

  return `You are a Linux system administration expert helping users configure and troubleshoot their systems.

=== LIVE SYSTEM STATE ===
${JSON.stringify(context, null, 2)}

=== FAILED COMMANDS (NEVER repeat these exact commands) ===
${failedList}

=== YOUR GOAL ===
Help the user step by step with their system administration tasks.

=== REASONING RULES ===
Before suggesting ANY command you MUST:
1. Check the FAILED COMMANDS list - never repeat a failed command without fixing it
2. Check the LIVE SYSTEM STATE - don't suggest installing something already installed
3. If a command failed, your FIRST sentence must explain WHY it failed and HOW you fixed it
4. Read error messages literally - if it says "use --flag", then use that flag
5. Consider the user's Linux distribution and adjust package manager commands accordingly

=== GENERAL BEST PRACTICES ===
- Always verify current system state before making changes
- Suggest using appropriate package manager (apt, dnf, pacman, yum, etc.) based on system
- Use sudo only when necessary for system-level operations
- Explain what each command does in simple terms
- Provide rollback instructions when making critical changes
- Never assume a specific bootloader, init system, or configuration

=== COMMAND FORMAT ===
- Put commands in \`\`\`bash blocks
- Each line = one runnable command
- NO if/then/fi/for/while/do/done
- NO fake prompts
- Use sudo for system commands when needed

=== RESPONSE FORMAT ===
1. ONE sentence: what happened (acknowledge errors if any)
2. ONE sentence: what you will do now and why
3. Bash block with commands
4. Brief explanation of each command

KEEP RESPONSES SHORT. No walls of text.
`;
}

// ===============================
// Helpers
// ===============================
function trimHistory() {
  if (conversationHistory.length > MAX_HISTORY) {
    conversationHistory = [
      conversationHistory[0],
      ...conversationHistory.slice(-MAX_HISTORY + 1)
    ];
  }
}

function extractCommands(text) {
  const matches = text.matchAll(/```(?:bash|sh)\n([\s\S]*?)```/g);
  const commands = [];

  for (const match of matches) {
    for (let line of match[1].trim().split("\n")) {
      line = line.trim();
      if (!line || line.startsWith("#")) continue;

      // Strip inline comments
      const idx = line.indexOf("#");
      if (idx > 0) line = line.substring(0, idx).trim();

      // Skip shell structures
      if (/^(if|then|else|elif|fi|for|while|do|done|case|esac|function|\{|\})/.test(line)) continue;
      // Skip prompts
      if (/\[.*\]|\?$/.test(line) && !line.includes("grep")) continue;

      if (line) commands.push(line);
    }
  }

  return commands.length > 0 ? commands : null;
}

function isInteractive(cmd) {
  return /\b(vim|nano|less|more|vi|emacs|top|htop|man|micro)\b/i.test(cmd);
}

function needsSudo(cmd) {
  return cmd.trim().startsWith("sudo ");
}

function isYes(input) {
  return ["yes","y","ok","run","execute","go","proceed","confirm","do it"].includes(input.toLowerCase().trim());
}

function isNo(input) {
  return ["no","n","cancel","stop","skip","abort","nope"].includes(input.toLowerCase().trim());
}

// ===============================
// Ollama
// ===============================
function isOllamaRunning() {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(500);
    socket.connect(11434, "127.0.0.1", () => { socket.destroy(); resolve(true); })
      .on("error", () => { socket.destroy(); resolve(false); });
  });
}

async function startOllamaIfNeeded() {
  if (await isOllamaRunning()) return;
  console.log("🚀 Starting Ollama...");
  ollamaProcess = spawn("ollama", ["serve"], { stdio: "inherit" });
  ollamaStartedByAgent = true;
  while (!(await isOllamaRunning())) await new Promise(r => setTimeout(r, 500));
  console.log("✅ Ollama ready.");
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// ===============================
// Execute Commands
// ===============================
async function executeCommands(commands) {
  const results = [];

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    console.log(`\n[${i + 1}/${commands.length}] 🔧 ${cmd}\n`);

    let result;
    if (needsSudo(cmd)) {
      result = await runCommandInteractive(cmd);
    } else {
      result = await runCommandCapture(cmd);
      const output = (result.stdout + "\n" + result.stderr).trim();
      if (output) console.log(output);
    }

    // Analyze errors
    if (!result.success) {
      const analysis = analyzeError(cmd, result.exitCode, result.stdout || "", result.stderr || "");

      // Record failure with analysis
      failedCommands.push({
        command: cmd,
        error: (result.stderr || result.stdout || "unknown").substring(0, 200),
        fix: analysis.suggestion
      });

      console.log(`\n❌ Failed (exit ${result.exitCode})`);
      if (analysis.suggestion) {
        console.log(`💡 ${analysis.suggestion}`);
      }

      // If agent can auto-fix, do it
      if (analysis.suggestion && !analysis.critical && i < commands.length - 1) {
        console.log("Continue? (yes/no)");
        const answer = await new Promise(r => rl.question("> ", r));
        if (!isYes(answer)) { console.log("❌ Stopped.\n"); break; }
      } else if (analysis.critical) {
        console.log("⚠️  Critical issue. Stopping to let the agent analyze.");
        break;
      }
    } else {
      console.log("✅");
    }

    results.push({
      command: cmd,
      success: result.success,
      exitCode: result.exitCode,
      stdout: (result.stdout || "").substring(0, 400),
      stderr: (result.stderr || "").substring(0, 400)
    });
  }

  return results;
}

// ===============================
// Ask LLM and handle response
// ===============================
async function askAndHandle(extraContext) {
  if (extraContext) {
    conversationHistory.push({ role: "user", content: extraContext });
    trimHistory();
  }

  const systemPrompt = buildSystemPrompt(systemContext);
  const response = await askLLM(systemPrompt, conversationHistory);

  if (!response) {
    console.log("⚠️  No response.\n");
    return;
  }

  console.log("\n🤖 Agent:\n");
  console.log(response);
  console.log();

  conversationHistory.push({ role: "assistant", content: response });
  trimHistory();

  const commands = extractCommands(response);

  if (commands) {
    const valid = commands.filter(c => !isInteractive(c));
    const blocked = commands.filter(c => isInteractive(c));

    if (blocked.length > 0) console.log("⛔ Blocked:", blocked.join(", "));

    if (valid.length > 0) {
      pendingCommands = valid;
      console.log(`\n📋 ${pendingCommands.length} command(s):`);
      pendingCommands.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
      console.log("\nConfirm? (yes/no/ok/run)");
      state = "awaiting_confirmation";
    } else {
      console.log("💬 Type your question, or 'next' to continue.\n");
    }
  } else {
    console.log("💬 Type your question, or 'next' to continue.\n");
  }
}

// ===============================
// Main Loop
// ===============================
async function main() {
  await startOllamaIfNeeded();

  console.log("\n🧠 System Agent");
  console.log("💡 Commands: next, refresh, context, failures, help <cmd>, reset, quit\n");

  console.log("🔍 Scanning system...");
  systemContext = await gatherSystemContext();
  console.log("✅ Ready\n");

  while (true) {
    const userInput = await new Promise(r => rl.question("You > ", r));

    // Meta commands
    if (userInput.toLowerCase() === "quit" || userInput.toLowerCase() === "exit") shutdown();
    if (userInput.toLowerCase() === "reset") {
      conversationHistory = []; failedCommands = []; state = "chat"; pendingCommands = [];
      console.log("🔄 Reset.\n"); continue;
    }
    if (userInput.toLowerCase() === "refresh") {
      console.log("🔍 Refreshing..."); systemContext = await gatherSystemContext();
      console.log("✅\n"); continue;
    }
    if (userInput.toLowerCase() === "context") {
      console.log(JSON.stringify(systemContext, null, 2)); continue;
    }
    if (userInput.toLowerCase() === "failures") {
      if (failedCommands.length === 0) { console.log("No failures.\n"); }
      else { failedCommands.forEach((f, i) => console.log(`  ${i+1}. ${f.command}\n     Error: ${f.error}\n     Fix: ${f.fix || "unknown"}`)); console.log(); }
      continue;
    }
    if (userInput.toLowerCase().startsWith("help ")) {
      const c = userInput.substring(5).trim();
      console.log(`📚 ${c}:`); console.log(await learnCommand(c)); continue;
    }
    if (userInput.toLowerCase() === "next") {
      await askAndHandle("Continue to the next step. Provide concrete commands. Remember the failed commands list."); continue;
    }

    // Confirmation
    if (state === "awaiting_confirmation") {
      if (isYes(userInput)) {
        console.log("\n⚙️  Executing...\n");
        const results = await executeCommands(pendingCommands);

        const summary = results.map((r, i) => {
          let s = `${i+1}. ${r.success ? "✅" : "❌"} ${r.command}`;
          if (r.stdout) s += `\n   stdout: ${r.stdout.substring(0, 200)}`;
          if (r.stderr) s += `\n   stderr: ${r.stderr.substring(0, 200)}`;
          if (!r.success) s += `\n   exit: ${r.exitCode}`;
          return s;
        }).join("\n\n");

        const hasErrors = results.some(r => !r.success);

        // Refresh context
        systemContext = await gatherSystemContext();

        state = "chat";
        pendingCommands = [];

        // Auto-ask LLM for next steps with results
        await askAndHandle(
          `EXECUTION RESULTS:\n${summary}\n\n${
            hasErrors
              ? "COMMANDS FAILED. Read the error output. Check the FAILED COMMANDS list for suggested fixes. DO NOT repeat the same command. Fix the issue."
              : "All commands succeeded. What is the next step in the plan?"
          }`
        );
        continue;
      } else if (isNo(userInput)) {
        console.log("❌ Cancelled.\n");
        conversationHistory.push({ role: "user", content: "Cancelled." });
        trimHistory(); state = "chat"; pendingCommands = []; continue;
      } else {
        // New question
        state = "chat"; pendingCommands = [];
      }
    }

    // Chat
    await askAndHandle(userInput);
  }
}

// ===============================
// Shutdown
// ===============================
function shutdown() {
  console.log("\n👋 Goodbye!");
  if (ollamaStartedByAgent && ollamaProcess) ollamaProcess.kill("SIGTERM");
  rl.close(); process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main();
