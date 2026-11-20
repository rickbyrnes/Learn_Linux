/*
 * lessons.js — all course content lives here.
 *
 * To add a lesson: copy an existing lesson object into a module's `lessons`
 * array. Each lesson has:
 *   id, title, xp, content (HTML), optional task {description, hint, check},
 *   optional terminal {fs, cwd}, and optional quiz [{q, options, answer, why}].
 *
 * `check` receives the Shell instance (see terminal.js) and must return
 * { pass: bool, message: string }.
 */
(function (global) {
  'use strict';
  const NS = (global.LinuxDojo = global.LinuxDojo || {});

  /* ---------- checker helpers ---------- */
  const ran = (s, c) => s.ran(c);
  const ranAny = (s, arr) => arr.some((c) => s.ran(c));
  const started = (s, p) => s.ranStarts(p);
  const exists = (s, p) => s.exists(p);
  const gone = (s, p) => !s.exists(p);
  const text = (s, p) => s.content(p) || '';
  const modeOf = (s, p) => s.mode(p) || '';
  const ok = (message) => ({ pass: true, message: message });
  const wait = (message) => ({ pass: false, message: message });

  const DEFAULT_FS = {
    home: {
      learner: {
        '.bashrc': '# ~/.bashrc\nalias ll="ls -la"\n',
        'notes.txt': 'Linux is fun\nLearn a command a day\nPractice makes permanent\n',
        projects: {
          'readme.md': '# My project\nA place to build things.\n',
        },
      },
    },
    etc: { hosts: '127.0.0.1 localhost\n::1 localhost\n' },
    var: { log: { 'syslog': 'Jan  1 00:00:00 host kernel: boot\n' } },
  };

  const COURSE = {
    title: 'Linux Dojo',
    tagline: 'Learn Linux by doing — one command at a time.',
    modules: [
      /* ============================ 1. FOUNDATIONS ============================ */
      {
        id: 'foundations',
        title: 'Foundations',
        icon: '⌘',
        description: 'The shell, your prompt, paths, and where to get help.',
        lessons: [
          {
            id: 'hello-shell',
            title: 'Meet the Shell',
            xp: 20,
            content: `
              <p>A <strong>shell</strong> is a program that reads your commands and runs them. The one you'll use most is <code>bash</code> (the <em>Bourne Again SHell</em>). The prompt you see — something like <code>learner@linux-dojo:~$</code> — tells you who you are, which machine you're on, and where you are.</p>
              <p>The tilde <code>~</code> means your <strong>home directory</strong>, your personal workspace. Let's look around. Try these commands in the terminal below:</p>
              <ul>
                <li><code>pwd</code> — print working directory (where am I?)</li>
                <li><code>ls</code> — list files here</li>
                <li><code>whoami</code> — print your username</li>
                <li><code>help</code> — list all commands in this dojo</li>
              </ul>
              <p class="tip">Very important: commands are case-sensitive, and <code>Tab</code> completion is your best friend in a real terminal — start typing and press Tab.</p>`,
            terminal: { fs: DEFAULT_FS, cwd: '/home/learner' },
            task: {
              description: 'Run <code>pwd</code>, <code>ls</code>, <code>whoami</code>, and <code>help</code> at least once.',
              hint: 'Type each command and press Enter. Use ↑ to repeat a previous command.',
              check: (s) => ranAny(s, ['pwd', 'ls', 'whoami', 'help']) &&
                ran(s, 'pwd') && ran(s, 'whoami') && ran(s, 'help')
                ? ok('You know where you are. Onward!')
                : wait('Run pwd, whoami and help (ls too) to complete this task.'),
            },
            quiz: [
              {
                q: 'What does the shell do?',
                options: ['Draws windows and icons', 'Interprets the commands you type and runs them', 'Stores your files permanently', 'Connects you to the internet'],
                answer: 1,
                why: 'A shell is a command-line interpreter: it reads commands and launches programs.',
              },
              {
                q: 'What does ~ mean in a path?',
                options: ['The root directory', 'The current directory', 'Your home directory', 'A hidden file'],
                answer: 2,
                why: '~ is shorthand for your home directory, e.g. /home/learner.',
              },
            ],
          },
          {
            id: 'paths-cd',
            title: 'Paths & cd',
            xp: 25,
            content: `
              <p>Everything in Linux is a file or directory in one big tree starting at <code>/</code> (the <strong>root</strong>). A <strong>path</strong> describes a location:</p>
              <ul>
                <li><strong>Absolute</strong> paths start at root: <code>/home/learner/projects</code></li>
                <li><strong>Relative</strong> paths start where you are: <code>projects/readme.md</code></li>
                <li><code>.</code> means <em>here</em>, <code>..</code> means <em>parent</em></li>
                <li><code>~</code> means <em>home</em></li>
              </ul>
              <p>Use <code>cd</code> to move around and <code>pwd</code> to check where you ended up. Try: <code>cd projects</code>, then <code>pwd</code>, then <code>cd ..</code>, then <code>cd ~</code>.</p>`,
            terminal: { fs: DEFAULT_FS, cwd: '/home/learner' },
            task: {
              description: 'Visit <code>projects</code>, go back up with <code>cd ..</code>, then return home with <code>cd ~</code>.',
              hint: 'Order matters: cd projects → cd .. → cd ~',
              check: (s) => ran(s, 'cd projects') && ran(s, 'cd ..') && ran(s, 'cd ~') && s.cwd() === '/home/learner'
                ? ok('You can navigate the tree.')
                : wait('Run cd projects, then cd .., then cd ~.'),
            },
            quiz: [
              {
                q: 'You are in /home/learner. Where does cd .. take you?',
                options: ['/home', '/', '/root', '/home/learner/projects'],
                answer: 0,
                why: '.. moves one level up, from /home/learner to /home.',
              },
              {
                q: 'Which is an absolute path?',
                options: ['projects/readme.md', './notes.txt', '../notes.txt', '/etc/hosts'],
                answer: 3,
                why: 'Absolute paths begin with /, the root of the filesystem.',
              },
            ],
          },
          {
            id: 'man-help',
            title: 'Getting Help',
            xp: 15,
            content: `
              <p>You don't need to memorize every command or flag. Real Linux systems ship with <strong>man pages</strong> (manual pages). Type <code>man ls</code> to read about <code>ls</code>, including all its options.</p>
              <p>In this dojo, <code>man &lt;command&gt;</code> and <code>help &lt;command&gt;</code> both show a short description. Try <code>man grep</code> and <code>help</code>.</p>
              <p class="tip">In real man pages: press <code>q</code> to quit, <code>/word</code> to search, and arrow keys to scroll. The convention <code>command --help</code> also works for most programs.</p>`,
            terminal: { fs: DEFAULT_FS, cwd: '/home/learner' },
            task: {
              description: 'Open the manual for <code>grep</code> with <code>man grep</code>.',
              hint: 'Just type man grep and press Enter.',
              check: (s) => ran(s, 'man grep') ? ok('Help is always one command away.') : wait('Try: man grep'),
            },
            quiz: [
              {
                q: 'What does `man ls` do?',
                options: ['Deletes ls', 'Shows the manual page for ls', 'Lists manual files', 'Runs ls with flags'],
                answer: 1,
                why: 'man displays the manual page for the named command.',
              },
              {
                q: 'Inside a real man page, which key quits?',
                options: ['q', 'x', 'Esc', 'Ctrl+C'],
                answer: 0,
                why: 'Press q to quit the man page pager.',
              },
            ],
          },
        ],
      },

      /* ======================== 2. FILES & DIRECTORIES ======================== */
      {
        id: 'files',
        title: 'Files & Directories',
        icon: '▤',
        description: 'Create, copy, move, remove, and write files.',
        lessons: [
          {
            id: 'touch-mkdir',
            title: 'touch & mkdir',
            xp: 20,
            content: `
              <p><code>touch</code> creates empty files (or updates their timestamp). <code>mkdir</code> makes directories. Use <code>mkdir -p</code> to create a whole chain of parent directories at once — handy and safe.</p>
              <pre>mkdir drafts
touch drafts/idea.txt
mkdir -p work/2026/notes</pre>
              <p>See your creations with <code>ls</code> and <code>ls -l</code>.</p>`,
            terminal: { fs: DEFAULT_FS, cwd: '/home/learner' },
            task: {
              description: 'Create a file <code>todo.txt</code> and a directory <code>archive</code> inside your home.',
              hint: 'touch todo.txt  then  mkdir archive',
              check: (s) => exists(s, 'todo.txt') && exists(s, 'archive') && s.node('archive').type === 'dir'
                ? ok('Files and folders created.')
                : wait('Create todo.txt (touch) and an archive directory (mkdir).'),
            },
            quiz: [
              {
                q: 'Which command creates an empty file?',
                options: ['mkdir', 'touch', 'cat', 'pwd'],
                answer: 1,
                why: 'touch creates empty files; mkdir creates directories.',
              },
              {
                q: 'What does mkdir -p do?',
                options: ['Prompts for confirmation', 'Creates missing parent directories', 'Makes a private directory', 'Prints the directory'],
                answer: 1,
                why: '-p creates parent directories as needed and doesn\'t error if the directory exists.',
              },
            ],
          },
          {
            id: 'cp-mv-rm',
            title: 'cp, mv & rm',
            xp: 25,
            content: `
              <p><code>cp</code> copies, <code>mv</code> moves or renames, and <code>rm</code> removes. Directories need <code>-r</code> (recursive) for <code>cp</code> and <code>rm</code>.</p>
              <pre>cp notes.txt notes-backup.txt
mv todo.txt tasks.txt
rm notes-backup.txt
rm -r old-folder</pre>
              <p class="warning">There is no Recycle Bin in a shell. <code>rm</code> is permanent — double-check before you press Enter, especially with wildcards like <code>rm *.txt</code>.</p>`,
            terminal: { fs: { home: { learner: { 'notes.txt': 'hello\n', 'todo.txt': 'buy milk\n' } } }, cwd: '/home/learner' },
            task: {
              description: 'Copy <code>notes.txt</code> to <code>copy.txt</code>, rename <code>todo.txt</code> to <code>done.txt</code>, then delete <code>copy.txt</code>.',
              hint: 'cp notes.txt copy.txt → mv todo.txt done.txt → rm copy.txt',
              check: (s) => gone(s, 'copy.txt') && exists(s, 'done.txt') && gone(s, 'todo.txt') &&
                ranAny(s, ['cp notes.txt copy.txt']) && ran(s, 'mv todo.txt done.txt')
                ? ok('Copy, move, remove — the file lifecycle.')
                : wait('Copy notes.txt to copy.txt, rename todo.txt to done.txt, and remove copy.txt.'),
            },
            quiz: [
              {
                q: 'To copy a directory you need:',
                options: ['cp -r', 'mv -r', 'rm -r', 'ls -r'],
                answer: 0,
                why: 'cp -r copies directories recursively.',
              },
              {
                q: 'Which command renames a file?',
                options: ['cp', 'mv', 'ren', 'touch'],
                answer: 1,
                why: 'mv moves a file; moving it to a new name in the same directory renames it.',
              },
            ],
          },
          {
            id: 'cat-echo-redirect',
            title: 'cat, echo & Redirection',
            xp: 25,
            content: `
              <p><code>cat</code> prints a file's contents. <code>echo</code> prints text. With <code>&gt;</code> you can send output <em>into</em> a file (creating or overwriting it); with <code>&gt;&gt;</code> you <em>append</em> instead.</p>
              <pre>echo "Hello Linux" > greeting.txt   # create/overwrite
echo "Second line" >> greeting.txt  # append
cat greeting.txt</pre>
              <p>This <strong>redirection</strong> is one of the superpowers of the shell: the output of one command becomes the input of a file (or another command).</p>`,
            terminal: { fs: { home: { learner: {} } }, cwd: '/home/learner' },
            task: {
              description: 'Create <code>story.txt</code> containing the line <code>Hello</code>, then append <code>World</code> as a second line. Check with <code>cat story.txt</code>.',
              hint: 'echo Hello > story.txt  then  echo World >> story.txt',
              check: (s) => {
                const c = text(s, 'story.txt');
                return c.indexOf('Hello') !== -1 && c.indexOf('World') !== -1 && c.indexOf('Hello') < c.indexOf('World')
                  ? ok('You redirected output like a pro.')
                  : wait('Write "Hello" to story.txt with > and append "World" with >>.');
              },
            },
            quiz: [
              {
                q: 'What does >> do?',
                options: ['Overwrite a file', 'Append output to a file', 'Delete a file', 'Read a file backwards'],
                answer: 1,
                why: '>> appends; > overwrites (creates a fresh file).',
              },
              {
                q: 'Which command prints a file to the screen?',
                options: ['cat', 'touch', 'mkdir', 'cd'],
                answer: 0,
                why: 'cat concatenates and prints file contents.',
              },
            ],
          },
        ],
      },

      /* ========================== 3. TEXT & PIPES ========================== */
      {
        id: 'text',
        title: 'Text & Pipes',
        icon: '≋',
        description: 'Inspect and filter text — the Unix way.',
        lessons: [
          {
            id: 'head-tail-wc',
            title: 'head, tail & wc',
            xp: 20,
            content: `
              <p>Log files can be huge. <code>head</code> shows the first lines, <code>tail</code> the last lines, and <code>wc</code> counts lines (<code>-l</code>), words (<code>-w</code>) or characters (<code>-c</code>).</p>
              <pre>head -n 2 notes.txt
tail -n 1 notes.txt
wc -l notes.txt</pre>
              <p class="tip">A classic trick: <code>tail -f logfile</code> follows a log as it grows — perfect for watching what a server is doing in real time.</p>`,
            terminal: { fs: DEFAULT_FS, cwd: '/home/learner' },
            task: {
              description: 'Using <code>notes.txt</code>: show its first 2 lines, its last line, and count its lines.',
              hint: 'head -n 2 notes.txt → tail -n 1 notes.txt → wc -l notes.txt',
              check: (s) => ranAny(s, ['head -n 2 notes.txt']) && ranAny(s, ['tail -n 1 notes.txt']) && ran(s, 'wc -l notes.txt')
                ? ok('You can peek inside any text file.')
                : wait('Run head -n 2, tail -n 1, and wc -l on notes.txt.'),
            },
            quiz: [
              {
                q: 'Which option makes wc count lines?',
                options: ['-w', '-c', '-l', '-n'],
                answer: 2,
                why: 'wc -l counts lines; -w counts words, -c counts characters.',
              },
              {
                q: 'tail -f is useful for…',
                options: ['Creating files', 'Following a growing log file', 'Sorting text', 'Deleting old files'],
                answer: 1,
                why: '-f follows the file and prints new lines as they are written.',
              },
            ],
          },
          {
            id: 'grep',
            title: 'grep — search text',
            xp: 25,
            content: `
              <p><code>grep</code> searches for lines matching a pattern. Add <code>-i</code> to ignore case and <code>-n</code> to show line numbers. It's named after the old ed command <code>g/re/p</code> — "global / regular expression / print".</p>
              <pre>grep Linux notes.txt
grep -i "learn" notes.txt
grep -n "practice" notes.txt</pre>
              <p class="tip">grep powers countless workflows: find errors in logs, filter command output, search source code. Patterns can be sophisticated <em>regular expressions</em>.</p>`,
            terminal: { fs: DEFAULT_FS, cwd: '/home/learner' },
            task: {
              description: 'Find the line containing <code>Learn</code> in <code>notes.txt</code> using <code>grep</code>.',
              hint: 'grep Learn notes.txt',
              check: (s) => started(s, 'grep') && ranAny(s, ['grep Learn notes.txt', 'grep -i learn notes.txt'])
                ? ok('You found the needle in the haystack.')
                : wait('Try: grep Learn notes.txt'),
            },
            quiz: [
              {
                q: 'What does grep -i do?',
                options: ['Inverts the match', 'Ignores case', 'Shows line numbers', 'Counts matches'],
                answer: 1,
                why: '-i = case-insensitive search; -n shows line numbers; -v inverts.',
              },
              {
                q: 'Which command searches text for a pattern?',
                options: ['grep', 'sort', 'head', 'wc'],
                answer: 0,
                why: 'grep prints lines that match a pattern.',
              },
            ],
          },
          {
            id: 'pipes-sort',
            title: 'Pipes & sort',
            xp: 25,
            content: `
              <p>The pipe <code>|</code> connects commands: the output of the left command becomes the input of the right one. This is the Unix philosophy — small tools that do one thing well, chained together.</p>
              <pre>cat notes.txt | grep Linux | sort
cat /var/log/access.log | grep ERROR | wc -l</pre>
              <p><code>sort</code> orders lines alphabetically; <code>sort -r</code> reverses, <code>sort -u</code> removes duplicates. Practice sort on its own below — and remember that in a real shell you could pipe into it.</p>
              <p class="tip">Pipes work with any commands that write to standard output. There's no limit to how many you chain.</p>`,
            terminal: { fs: { home: { learner: { 'names.txt': 'Zoe\nAdam\nMaya\nBen\n' } } }, cwd: '/home/learner' },
            task: {
              description: 'Sort <code>names.txt</code> and then count its lines with <code>wc -l</code>.',
              hint: 'sort names.txt → wc -l names.txt',
              check: (s) => ran(s, 'sort names.txt') && ran(s, 'wc -l names.txt')
                ? ok('Small tools, chained together.')
                : wait('Run sort names.txt and wc -l names.txt.'),
            },
            quiz: [
              {
                q: 'What does the | (pipe) do?',
                options: ['Runs commands at the same time', 'Sends one command\'s output into another\'s input', 'Creates a new file', 'Pauses a command'],
                answer: 1,
                why: 'A pipe connects stdout of one process to stdin of the next.',
              },
              {
                q: 'Which flag sorts in reverse order?',
                options: ['-r', '-u', '-n', '-f'],
                answer: 0,
                why: 'sort -r reverses; -u keeps unique lines; -n sorts numerically.',
              },
            ],
          },
        ],
      },

      /* ==================== 4. PERMISSIONS & USERS ==================== */
      {
        id: 'permissions',
        title: 'Permissions & Users',
        icon: '⚿',
        description: 'Who can read, write, and execute — and why it matters.',
        lessons: [
          {
            id: 'ls-l-chmod',
            title: 'Permissions & chmod',
            xp: 30,
            content: `
              <p>Run <code>ls -l</code> and you'll see strings like <code>-rw-r--r--</code>. Read them in three groups of three: <strong>owner</strong>, <strong>group</strong>, <strong>others</strong>. Each group has <code>r</code> (read = 4), <code>w</code> (write = 2), <code>x</code> (execute = 1).</p>
              <p>Numeric modes add those bits: <code>755</code> = owner rwx (7), group r-x (5), others r-x (5). <code>644</code> is the usual file mode. Only the owner can write (w); everyone can read (r).</p>
              <pre>ls -l
chmod 755 script.sh     # make it executable by everyone
chmod u+x script.sh     # symbolic alternative
chmod 600 secrets.txt   # only owner can read/write</pre>
              <p class="warning">The first character is the type: <code>-</code> file, <code>d</code> directory. Directories need <code>x</code> to be entered.</p>`,
            terminal: { fs: { home: { learner: { 'script.sh': '#!/bin/bash\necho hi\n', 'secrets.txt': 'top secret\n' } } }, cwd: '/home/learner' },
            task: {
              description: 'Set <code>script.sh</code> to mode <code>755</code>, then view it with <code>ls -l</code>.',
              hint: 'chmod 755 script.sh → ls -l',
              check: (s) => modeOf(s, 'script.sh') === '755' && ran(s, 'ls -l')
                ? ok('You control who can do what.')
                : wait('Run chmod 755 script.sh, then ls -l.'),
            },
            quiz: [
              {
                q: 'What does mode 644 mean for a file?',
                options: ['Everyone can execute it', 'Owner can read/write, others read-only', 'Only owner can read', 'Nobody can access it'],
                answer: 1,
                why: '6 = rw for owner, 4 = r for group, 4 = r for others.',
              },
              {
                q: 'Which bit allows a file to be run as a program?',
                options: ['r', 'w', 'x', 'd'],
                answer: 2,
                why: 'The execute bit x (value 1) makes a file runnable.',
              },
            ],
          },
          {
            id: 'users-sudo',
            title: 'Users & sudo',
            xp: 20,
            content: `
              <p>Linux is multi-user. <code>whoami</code> shows who you are; every file has an owner and a group. The <code>root</code> user is the all-powerful administrator.</p>
              <p><code>sudo</code> ("superuser do") runs a command as root — but only for users allowed by <code>/etc/sudoers</code>. It prompts for <em>your</em> password, not root's.</p>
              <pre>whoami
sudo apt update     # run as administrator
id                  # show your uid and groups</pre>
              <p class="warning">With great power comes great responsibility: a mistyped sudo command can damage the system. Don't run untrusted commands with sudo.</p>`,
            terminal: { fs: DEFAULT_FS, cwd: '/home/learner' },
            task: {
              description: 'Find out who you are with <code>whoami</code>.',
              hint: 'whoami',
              check: (s) => ran(s, 'whoami') ? ok('Identity confirmed.') : wait('Run whoami.'),
            },
            quiz: [
              {
                q: 'What does sudo do?',
                options: ['Changes your password', 'Runs a command with administrator privileges', 'Deletes a user', 'Lists files'],
                answer: 1,
                why: 'sudo executes a command as another user (root by default).',
              },
              {
                q: 'Which user has full administrative power?',
                options: ['guest', 'nobody', 'root', 'learner'],
                answer: 2,
                why: 'root (uid 0) bypasses normal permission checks.',
              },
            ],
          },
        ],
      },

      /* ========================== 5. PROCESSES ========================== */
      {
        id: 'processes',
        title: 'Processes',
        icon: '⚙',
        description: 'See what\'s running and take control of it.',
        lessons: [
          {
            id: 'ps-kill',
            title: 'ps & kill',
            xp: 25,
            content: `
              <p>A <strong>process</strong> is a running program. <code>ps</code> lists processes with their PID (process ID). <code>ps -ef</code> shows a fuller list. Every process has a parent, forming a tree you can view with <code>pstree</code>.</p>
              <pre>ps
ps -ef
kill 204          # politely ask PID 204 to stop (SIGTERM)
kill -9 204       # force-kill (SIGKILL) — last resort</pre>
              <p>By default <code>kill</code> sends signal 15 (SIGTERM): "please shut down cleanly." <code>-9</code> is SIGKILL: unblockable, immediate, and the app can't clean up after itself.</p>`,
            terminal: { fs: DEFAULT_FS, cwd: '/home/learner' },
            task: {
              description: 'List processes with <code>ps</code>, then send a signal with <code>kill 204</code>.',
              hint: 'ps → kill 204',
              check: (s) => ran(s, 'ps') && ran(s, 'kill 204') ? ok('You can see and stop processes.') : wait('Run ps, then kill 204.'),
            },
            quiz: [
              {
                q: 'What is a PID?',
                options: ['A password', 'A process ID number', 'A file type', 'A network port'],
                answer: 1,
                why: 'PID = process identifier, a unique number for each running process.',
              },
              {
                q: 'Which signal does plain `kill 123` send?',
                options: ['SIGKILL (9)', 'SIGSTOP', 'SIGTERM (15)', 'SIGHUP'],
                answer: 2,
                why: 'kill sends SIGTERM (15) by default; use -9 for SIGKILL.',
              },
            ],
          },
        ],
      },

      /* ======================= 6. SHELL SCRIPTING ======================= */
      {
        id: 'scripting',
        title: 'Shell Scripting',
        icon: '›_',
        description: 'Automate the boring stuff with bash scripts.',
        lessons: [
          {
            id: 'first-script',
            title: 'Your First Script',
            xp: 35,
            content: `
              <p>A shell script is just a text file of commands. The first line, the <strong>shebang</strong> <code>#!/bin/bash</code>, tells the system which interpreter to use. Make the file executable with <code>chmod +x</code>, then run it with <code>./script.sh</code> or <code>bash script.sh</code>.</p>
              <pre>echo "#!/bin/bash" > hello.sh
echo "echo Hello, world" >> hello.sh
chmod +x hello.sh
bash hello.sh</pre>
              <p>Comments start with <code>#</code>. Use them to explain what your script does — your future self will thank you.</p>`,
            terminal: { fs: { home: { learner: {} } }, cwd: '/home/learner' },
            task: {
              description: 'Build <code>hello.sh</code>: a shebang line, then a line that echoes <code>Hello, world</code>. Make it executable with <code>chmod +x</code> and run it with <code>bash hello.sh</code>.',
              hint: 'echo "#!/bin/bash" > hello.sh → echo "echo Hello, world" >> hello.sh → chmod +x hello.sh → bash hello.sh',
              check: (s) => {
                const c = text(s, 'hello.sh');
                const x = modeOf(s, 'hello.sh').split('').some((d) => parseInt(d, 10) % 2 === 1);
                return c.indexOf('#!/bin/bash') !== -1 && c.indexOf('Hello, world') !== -1 && x && ran(s, 'bash hello.sh')
                  ? ok('Your first script runs. Automating everything is next.')
                  : wait('Write the shebang + echo line into hello.sh, chmod +x it, then run bash hello.sh.');
              },
            },
            quiz: [
              {
                q: 'What is the shebang line for bash?',
                options: ['# bash', '#!/bin/bash', '!!/bin/bash', '&/bin/bash'],
                answer: 1,
                why: '#!/bin/bash selects the bash interpreter to run the script.',
              },
              {
                q: 'What does chmod +x do?',
                options: ['Adds execute permission', 'Adds a file extension', 'Copies the file', 'Opens the file'],
                answer: 0,
                why: '+x adds the execute bit so the script can be run as a program.',
              },
            ],
          },
          {
            id: 'variables-args',
            title: 'Variables & Arguments',
            xp: 30,
            content: `
              <p>Variables store values. Assign with <code>NAME=value</code> (no spaces!) and read with <code>$NAME</code>. Quote variables to keep spaces intact.</p>
              <pre>NAME="Linux"
echo "Hello, $NAME"
echo "Home is $HOME"</pre>
              <p>Scripts receive arguments as <code>$1</code>, <code>$2</code>, etc. <code>$0</code> is the script name, <code>$#</code> is the number of arguments, and <code>$@</code> is all of them.</p>
              <pre>echo "First argument: $1"</pre>
              <p class="tip">Environment variables like <code>$HOME</code>, <code>$PATH</code> and <code>$USER</code> are available to every shell. See them all with <code>env</code>.</p>`,
            terminal: { fs: { home: { learner: { 'vars.sh': '#!/bin/bash\nNAME="Linux"\necho "Hello, $NAME"\n' } } }, cwd: '/home/learner' },
            task: {
              description: 'Read <code>vars.sh</code> with <code>cat</code>, then run it with <code>bash vars.sh</code>.',
              hint: 'cat vars.sh → bash vars.sh',
              check: (s) => ran(s, 'cat vars.sh') && ran(s, 'bash vars.sh')
                ? ok('Variables make scripts flexible.')
                : wait('Cat the script and then run it with bash.'),
            },
            quiz: [
              {
                q: 'How do you read a variable named NAME in bash?',
                options: ['NAME', '$NAME', '%NAME%', '(NAME)'],
                answer: 1,
                why: 'Prefix the name with $ to expand its value.',
              },
              {
                q: 'What is $1 in a script?',
                options: ['The script name', 'The first argument', 'The number of arguments', 'The current directory'],
                answer: 1,
                why: '$1 is the first argument; $0 is the script name; $# is the argument count.',
              },
            ],
          },
          {
            id: 'conditionals-loops',
            title: 'Conditionals & Loops',
            xp: 35,
            content: `
              <p>Branching with <code>if</code>:</p>
              <pre>if [ -f notes.txt ]; then
  echo "notes.txt exists"
else
  echo "missing"
fi</pre>
              <p>Looping with <code>for</code>:</p>
              <pre>for name in Alice Bob Carol; do
  echo "Hello, $name"
done</pre>
              <p><code>[ ... ]</code> is the test command (note the spaces inside the brackets!). Common tests: <code>-f</code> file exists, <code>-d</code> directory exists, <code>-eq</code> numbers equal, <code>=</code> strings equal. Combine with <code>&amp;&amp;</code> (and) and <code>||</code> (or).</p>
              <p class="tip">These building blocks — variables, conditionals, loops — turn a list of commands into a real program. That's how you automate backups, deployments, and cleanup.</p>`,
            terminal: { fs: { home: { learner: { 'loop.sh': '#!/bin/bash\nfor name in Alice Bob Carol; do\n  echo "Hello, $name"\ndone\n' } } }, cwd: '/home/learner' },
            task: {
              description: 'Inspect <code>loop.sh</code> with <code>cat</code> and run it with <code>bash loop.sh</code>.',
              hint: 'cat loop.sh → bash loop.sh',
              check: (s) => ran(s, 'cat loop.sh') && ran(s, 'bash loop.sh')
                ? ok('You can automate repetitive work.')
                : wait('Cat loop.sh and run it with bash.'),
            },
            quiz: [
              {
                q: 'Which test checks whether a file exists?',
                options: ['[ -f file ]', '[ -e file ]', '[ -x file ]', '[ -n file ]'],
                answer: 0,
                why: '-f tests for a regular file; -d tests for a directory.',
              },
              {
                q: 'Which loop runs once per item in a list?',
                options: ['while', 'until', 'for ... in', 'case'],
                answer: 2,
                why: 'for name in a b c; do ...; done iterates over a list.',
              },
            ],
          },
        ],
      },

      /* ======================= 7. SSH & REMOTE ======================= */
      {
        id: 'ssh',
        title: 'SSH & Remote Machines',
        icon: '⇄',
        description: 'Work securely on machines across the world.',
        lessons: [
          {
            id: 'ssh-basics',
            title: 'SSH Basics',
            xp: 25,
            content: `
              <p><strong>SSH</strong> (Secure Shell) gives you an encrypted terminal on a remote machine.</p>
              <pre>ssh user@server.example.com
ssh -p 2222 user@server      # custom port
ssh user@server 'uptime'     # run one command and exit</pre>
              <p>The first time you connect, SSH asks you to verify the host's fingerprint — this protects against man-in-the-middle attacks. Your session is encrypted end to end.</p>
              <p class="tip">Admins use SSH constantly to manage servers. Combined with scripting, you can automate tasks across many machines.</p>`,
            terminal: { fs: DEFAULT_FS, cwd: '/home/learner' },
            task: {
              description: 'Open a simulated SSH session: <code>ssh learner@server</code>.',
              hint: 'ssh learner@server',
              check: (s) => started(s, 'ssh ') ? ok('You\'re connected (simulated).') : wait('Try: ssh learner@server'),
            },
            quiz: [
              {
                q: 'What does SSH provide?',
                options: ['An encrypted remote terminal', 'A file manager', 'A web server', 'A text editor'],
                answer: 0,
                why: 'SSH is an encrypted protocol for remote command-line access.',
              },
              {
                q: 'What is the usual syntax to connect?',
                options: ['ssh host:user', 'ssh user@host', 'connect user host', 'ssh -u user -h host'],
                answer: 1,
                why: 'ssh user@hostname is the standard form.',
              },
            ],
          },
          {
            id: 'ssh-keys-scp',
            title: 'SSH Keys & scp',
            xp: 30,
            content: `
              <p>Passwords can be guessed; <strong>SSH keys</strong> are far stronger. <code>ssh-keygen</code> creates a private key (<code>~/.ssh/id_rsa</code> — guard it with your life) and a public key (<code>~/.ssh/id_rsa.pub</code> — safe to share). You put the public key in the server's <code>~/.ssh/authorized_keys</code>.</p>
              <pre>ssh-keygen -t rsa
ssh-copy-id user@server     # install your public key
scp file.txt user@server:/tmp/   # copy a file over SSH</pre>
              <p><code>scp</code> copies files securely using the same SSH connection. For ongoing syncing, look at <code>rsync</code>.</p>
              <p class="warning">Never share or commit your private key. Use a passphrase for extra protection.</p>`,
            terminal: { fs: { home: { learner: {} } }, cwd: '/home/learner' },
            task: {
              description: 'Generate a key pair with <code>ssh-keygen</code>, then confirm <code>~/.ssh/id_rsa.pub</code> exists with <code>ls -a ~/.ssh</code>.',
              hint: 'ssh-keygen → ls -a ~/.ssh',
              check: (s) => exists(s, '~/.ssh/id_rsa.pub') && ran(s, 'ls -a ~/.ssh')
                ? ok('Key-based auth: secure and convenient.')
                : wait('Run ssh-keygen, then ls -a ~/.ssh.'),
            },
            quiz: [
              {
                q: 'Which file must you keep secret?',
                options: ['id_rsa.pub', 'id_rsa (private key)', 'authorized_keys', 'known_hosts'],
                answer: 1,
                why: 'The private key id_rsa must never leave your machine.',
              },
              {
                q: 'Which command copies files over SSH?',
                options: ['cp', 'scp', 'mv', 'ssh-copy-id'],
                answer: 1,
                why: 'scp (secure copy) transfers files over an SSH connection.',
              },
            ],
          },
        ],
      },
    ],
  };

  NS.COURSE = COURSE;
})(window);
