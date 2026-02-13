const { exec } = require("child_process");

function runCommand(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { shell: "/bin/bash" }, (error, stdout, stderr) => {
      resolve({
        error: error ? error.message : null,
        stdout,
        stderr
      });
    });
  });
}

module.exports = { runCommand };
