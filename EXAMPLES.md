# Usage Examples

This document provides practical examples of how to use the Local AI System Agent.

## Basic Usage

### Starting the Agent

```bash
node agent.js
```

You'll see:
```
🧠 System Agent
💡 Commands: next, refresh, context, failures, help <cmd>, reset, quit

🔍 Scanning system...
✅ Ready

You >
```

## Example Sessions

### Example 1: Checking System Information

```
You > tell me about my system

🤖 Agent:
I'll gather basic system information for you.

```bash
uname -a
```

This shows your kernel version and system architecture.

📋 1 command(s):
  1. uname -a

Confirm? (yes/no/ok/run)
You > yes

⚙️  Executing...

[1/1] 🔧 uname -a

Linux myhost 6.1.0-18-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.76-1 (2024-02-01) x86_64 GNU/Linux
✅

🤖 Agent:
Your system is running Debian with kernel 6.1.0 on a 64-bit architecture. What would you like to do next?

You >
```

### Example 2: Checking Disk Space

```
You > check my disk space

🤖 Agent:
I'll check your disk usage to see how much space is available.

```bash
df -h
```

This displays disk usage in human-readable format.

📋 1 command(s):
  1. df -h

Confirm? (yes/no/ok/run)
You > yes

[output shows disk usage...]
```

### Example 3: Installing a Package

```
You > I need to install htop

🤖 Agent:
I'll install htop, a system monitoring tool.

```bash
sudo apt install htop
```

This will install htop using the apt package manager.

📋 1 command(s):
  1. sudo apt install htop

Confirm? (yes/no/ok/run)
You > yes

[installation proceeds with sudo password prompt...]
```

### Example 4: Using Meta Commands

#### Refresh System Context
```
You > refresh

🔍 Refreshing...
✅
```

#### View System Context
```
You > context

{
  "os": "Ubuntu 22.04.3 LTS",
  "kernel": "6.5.0-26-generic",
  "packageManager": "/usr/bin/apt",
  "diskUsage": "Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1       100G   45G   51G  47% /",
  "memInfo": "total        used        free      shared  buff/cache   available\nMem:           15Gi       3.2Gi       8.5Gi       123Mi       3.8Gi        12Gi",
  "systemd": "systemd 249 (249.11-0ubuntu3.12)",
  "shell": "/bin/bash"
}
```

#### View Failed Commands
```
You > failures

  1. apt update
     Error: permission denied
     Fix: Command needs root privileges. Try: sudo apt update

  2. systemctl restart unknown-service
     Error: failed to restart unknown-service.service: Unit unknown-service.service not found
     Fix: 'unknown-service' is not installed. Install it using your system's package manager.
```

#### Get Help for a Command
```
You > help git

📚 git:
usage: git [--version] [--help] [-C <path>] [-c <name>=<value>]
           [--exec-path[=<path>]] [--html-path] [--man-path] [--info-path]
           [-p | --paginate | -P | --no-pager] [--no-replace-objects]
           [--bare] [--git-dir=<path>] [--work-tree=<path>]
           [--namespace=<name>] <command> [<args>]
...
```

#### Reset Conversation
```
You > reset

🔄 Reset.
```

## Advanced Usage

### Multi-Step Tasks

The agent can guide you through multi-step processes:

```
You > I want to set up a web server

🤖 Agent:
I'll help you set up a basic web server. First, let's install nginx.

```bash
sudo apt update
sudo apt install nginx -y
```

This updates package lists and installs nginx web server.

📋 2 command(s):
  1. sudo apt update
  2. sudo apt install nginx -y

Confirm? (yes/no/ok/run)
You > yes

[commands execute...]

🤖 Agent:
Nginx is now installed. Let's start and enable it.

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

This starts nginx and configures it to start on boot.

📋 2 command(s):
  1. sudo systemctl start nginx
  2. sudo systemctl enable nginx

Confirm? (yes/no/ok/run)
You > yes
```

### Using "next" to Continue

After a command completes, use "next" to ask the agent what to do next:

```
You > next

🤖 Agent:
Let's verify that nginx is running correctly.

```bash
systemctl status nginx
```

This shows the current status of the nginx service.
```

### Handling Errors

When a command fails, the agent learns from it:

```
You > install foo-package

[command fails: package not found]

❌ Failed (exit 1)
💡 Package doesn't exist in repositories. Check the correct package name.

🤖 Agent:
The package 'foo-package' was not found in the repositories. Did you mean a different package name? What were you trying to install?

You > I wanted to install foo
```

## Tips and Best Practices

### 1. Be Specific
Instead of: "fix my network"
Try: "my wifi connection keeps dropping, help me diagnose the issue"

### 2. Confirm Important Commands
The agent asks for confirmation before executing. Always review commands, especially those with `sudo`.

### 3. Use "refresh" After Manual Changes
If you make changes outside the agent, run `refresh` to update the system context.

### 4. Check Failures Regularly
Use `failures` to see what went wrong and learn from errors.

### 5. Use "reset" for New Topics
If switching to a completely different task, use `reset` to clear conversation history.

### 6. Cancel Anytime
If you don't want to run suggested commands:
```
Confirm? (yes/no/ok/run)
You > no

❌ Cancelled.
```

### 7. Ask Follow-up Questions
You can ask questions instead of confirming commands:
```
Confirm? (yes/no/ok/run)
You > what does this command do exactly?

🤖 Agent:
[explains the command in detail...]
```

## Common Use Cases

### System Maintenance
- Update packages
- Clean up disk space
- Check system logs
- Monitor resource usage

### Service Management
- Start/stop/restart services
- Enable/disable services
- Check service status
- View service logs

### Package Management
- Install packages
- Remove packages
- Search for packages
- Update package lists

### Troubleshooting
- Diagnose network issues
- Check for errors in logs
- Identify resource bottlenecks
- Debug service failures

### Configuration
- Edit configuration files
- Set up new services
- Configure system settings
- Manage user permissions

## Safety Features

The agent includes several safety features:

1. **Confirmation Required**: Never executes without your approval
2. **Command Blocking**: Dangerous commands are blocked (rm -rf /, mkfs, dd)
3. **Error Learning**: Remembers failures and suggests fixes
4. **Sudo Awareness**: Only uses sudo when necessary

## Exiting

To exit the agent:
```
You > quit
```
or
```
You > exit
```

If the agent started Ollama, it will stop it on exit.
