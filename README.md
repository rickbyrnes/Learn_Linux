# Linux Dojo

An interactive, hands-on Linux course that runs entirely in your browser. No installs, no build step, no risk — the "terminal" is a safe simulation with its own virtual filesystem.

## Run it

Open `index.html` in any modern browser. That's it.

If you prefer serving it locally:

```bash
cd /path/to/Learn_Linux
python3 -m http.server 8000
# then visit http://localhost:8000
```

Progress (completed lessons, quiz scores, XP) is saved in your browser's `localStorage` and survives reloads. Use **Reset progress** in the sidebar to start over.

## What's inside

17 lessons across 7 levels, each with a short explanation, a task you complete in the practice terminal, and a multiple-choice quiz with explanations:

1. **Foundations** — the shell, paths & `cd`, getting help
2. **Files & Directories** — `touch`, `mkdir`, `cp`, `mv`, `rm`, `cat`, redirection
3. **Text & Pipes** — `head`, `tail`, `wc`, `grep`, `sort`, pipes
4. **Permissions & Users** — `ls -l`, `chmod`, `whoami`, `sudo`
5. **Processes** — `ps`, `kill`, signals
6. **Shell Scripting** — shebangs, variables, arguments, conditionals, loops
7. **SSH & Remote Machines** — `ssh`, keys, `scp`

The simulated shell supports `help`, `man`, `pwd`, `ls`, `cd`, `cat`, `echo`, `touch`, `mkdir`, `rm`, `cp`, `mv`, `grep`, `head`, `tail`, `wc`, `sort`, `chmod`, `chown`, `whoami`, `date`, `history`, `ps`, `kill`, `ssh`, `ssh-keygen`, `scp`, `bash` and `clear`. Type `help` in the terminal for the full list.

## Project layout

```
index.html       app shell
css/styles.css   all styling
js/terminal.js   simulated shell + virtual filesystem (window.LinuxDojo.Shell)
js/lessons.js    ALL course content  ← edit this to add lessons
js/app.js        rendering, navigation, progress
tests/run.js     node test harness
```

## Add a lesson

Everything about a lesson lives in one object in `js/lessons.js`. Add an object to a module's `lessons` array:

```js
{
  id: 'my-lesson',                 // unique id
  title: 'My Lesson',
  xp: 20,
  content: `<p>HTML explanation goes here.</p>`,  // use <code>, <pre>, .tip, .warning
  terminal: {                      // starting filesystem + directory
    fs: { home: { learner: { 'file.txt': 'hello\n' } } },
    cwd: '/home/learner'
  },
  task: {
    description: 'Create <code>new.txt</code>.',
    hint: 'touch new.txt',
    check: (s) => s.exists('new.txt')
      ? { pass: true,  message: 'Done!' }
      : { pass: false, message: 'Try touch new.txt.' }
  },
  quiz: [{
    q: 'Which command creates an empty file?',
    options: ['mkdir', 'touch', 'cat', 'pwd'],
    answer: 1,
    why: 'touch creates empty files.'
  }]
}
```

The `check` function receives the `Shell` instance. Useful helpers: `s.ran('ls')`, `s.ranStarts('grep')`, `s.exists(path)`, `s.content(path)`, `s.mode(path)`, `s.node(path)`, `s.cwd()`. Return `{ pass, message }`.

To add a whole new level, add a module object with `id`, `title`, `icon`, `description`, and a `lessons` array.

## Tests

```bash
node tests/run.js
```

Checks the shell commands, verifies every lesson is well-formed, and confirms every task can actually be completed by following its own hint.
