/*
 * Run with:  node tests/run.js
 * A tiny node test harness for the simulated shell and the course content.
 */
global.window = global;
require('../js/terminal.js');
require('../js/lessons.js');
const { Shell, COURSE } = global.LinuxDojo;
const assert = require('assert');

/* ---------- shell behaviour ---------- */
let s = new Shell({ fs: { home: { learner: { 'notes.txt': 'Linux is fun\nLearn a command a day\n' } } }, cwd: '/home/learner' });
assert.strictEqual(s.run('pwd')[0].text, '/home/learner');
assert.deepStrictEqual(s.run('cat notes.txt').map((l) => l.text), ['Linux is fun', 'Learn a command a day']);
s.run('echo Hello > story.txt');
s.run('echo World >> story.txt');
assert.ok(s.content('story.txt').includes('Hello') && s.content('story.txt').includes('World'));
s.run('mkdir -p a/b/c');
assert.ok(s.exists('a/b/c'));
s.run('touch a/b/c/f');
assert.ok(s.exists('a/b/c/f'));
s.run('cp notes.txt copy.txt');
s.run('mv copy.txt renamed.txt');
assert.ok(s.exists('renamed.txt') && !s.exists('copy.txt'));
s.run('rm renamed.txt');
assert.ok(!s.exists('renamed.txt'));
assert.ok(s.run('grep Linux notes.txt').some((l) => l.cls === 'match'));
s.run('chmod 755 notes.txt');
assert.strictEqual(s.mode('notes.txt'), '755');
s.run('cd a');
assert.strictEqual(s.cwd(), '/home/learner/a');
s.run('cd ~');
assert.strictEqual(s.cwd(), '/home/learner');
s.run('ssh-keygen');
assert.ok(s.exists('~/.ssh/id_rsa.pub'));
s.run('cd ~/.ssh');
assert.strictEqual(s.cwd(), '/home/learner/.ssh');

let t = new Shell({ fs: { home: { learner: { f: 'a\nb\nc\nd' } } }, cwd: '/home/learner' });
assert.deepStrictEqual(t.run('head -n 2 f').map((l) => l.text), ['a', 'b']);
assert.deepStrictEqual(t.run('tail -n 1 f').map((l) => l.text), ['d']);
console.log('✓ shell behaviour');

/* ---------- course data is well-formed ---------- */
let lessonCount = 0;
let quizCount = 0;
COURSE.modules.forEach((mod) => {
  mod.lessons.forEach((l) => {
    lessonCount++;
    assert.ok(l.id && l.title && l.xp, 'missing fields: ' + l.id);
    assert.ok(typeof l.content === 'string' && l.content.length > 20, 'content: ' + l.id);
    if (l.quiz) {
      l.quiz.forEach((q) => {
        quizCount++;
        assert.ok(q.options.length >= 2, 'options: ' + l.id);
        assert.ok(q.answer >= 0 && q.answer < q.options.length, 'answer: ' + l.id);
        assert.ok(q.why, 'explanation: ' + l.id);
      });
    }
  });
});
console.log('✓ course data (' + lessonCount + ' lessons, ' + quizCount + ' questions)');

/* ---------- every task starts unpassed and is completable via its hint ---------- */
const FLOWS = {
  'hello-shell': ['pwd', 'ls', 'whoami', 'help'],
  'paths-cd': ['cd projects', 'pwd', 'cd ..', 'cd ~'],
  'man-help': ['man grep'],
  'touch-mkdir': ['touch todo.txt', 'mkdir archive', 'ls'],
  'cp-mv-rm': ['cp notes.txt copy.txt', 'mv todo.txt done.txt', 'rm copy.txt'],
  'cat-echo-redirect': ['echo Hello > story.txt', 'echo World >> story.txt', 'cat story.txt'],
  'head-tail-wc': ['head -n 2 notes.txt', 'tail -n 1 notes.txt', 'wc -l notes.txt'],
  grep: ['grep Learn notes.txt'],
  'pipes-sort': ['sort names.txt', 'wc -l names.txt'],
  'ls-l-chmod': ['chmod 755 script.sh', 'ls -l'],
  'users-sudo': ['whoami'],
  'ps-kill': ['ps', 'kill 204'],
  'first-script': ['echo "#!/bin/bash" > hello.sh', 'echo "echo Hello, world" >> hello.sh', 'chmod +x hello.sh', 'bash hello.sh'],
  'variables-args': ['cat vars.sh', 'bash vars.sh'],
  'conditionals-loops': ['cat loop.sh', 'bash loop.sh'],
  'ssh-basics': ['ssh learner@server'],
  'ssh-keys-scp': ['ssh-keygen', 'ls -a ~/.ssh'],
};
let taskCount = 0;
COURSE.modules.forEach((mod) => {
  mod.lessons.forEach((l) => {
    if (!l.task) return;
    const fresh = new Shell(l.terminal || {});
    assert.strictEqual(l.task.check(fresh).pass, false, 'task starts passed: ' + l.id);
    const flow = FLOWS[l.id];
    assert.ok(flow, 'no test flow for ' + l.id);
    const sh = new Shell(l.terminal || {});
    flow.forEach((c) => sh.run(c));
    const result = l.task.check(sh);
    assert.ok(result.pass, 'task not completable: ' + l.id + ' -> ' + result.message);
    taskCount++;
  });
});
console.log('✓ ' + taskCount + ' lesson tasks are completable');
console.log('\nALL TESTS PASSED');
