/*
 * terminal.js — a small, self-contained simulated Unix shell.
 *
 * It maintains a virtual filesystem in memory and implements a useful subset
 * of everyday commands. Lessons provide their own starting filesystem and a
 * `check` function that inspects the shell (history + filesystem) to decide
 * whether an exercise is complete.
 *
 * Exposed globally as window.LinuxDojo.Shell so everything works from file://
 * with plain <script> tags (no modules / no build step).
 */
(function (global) {
  'use strict';

  const NS = (global.LinuxDojo = global.LinuxDojo || {});

  /* ---------- path + filesystem helpers ---------- */

  function splitPath(p) {
    return String(p || '').split('/').filter(Boolean);
  }

  function resolveParts(cwdParts, arg) {
    const a = String(arg == null ? '' : arg);
    if (a === '' || a === '.') return cwdParts.slice();
    if (a === '~' || a.startsWith('~/')) return splitPath('/home/learner' + a.slice(1));
    if (a.startsWith('/')) return splitPath(a);
    const parts = cwdParts.slice();
    for (const seg of splitPath(a)) {
      if (seg === '.') continue;
      if (seg === '..') parts.pop();
      else parts.push(seg);
    }
    return parts;
  }

  function joinParts(parts) {
    return '/' + parts.join('/');
  }

  function getNode(root, parts) {
    let node = root;
    for (const seg of parts) {
      if (!node || node.type !== 'dir' || !Object.prototype.hasOwnProperty.call(node.children, seg)) {
        return null;
      }
      node = node.children[seg];
    }
    return node;
  }

  function parentNode(root, parts) {
    if (!parts.length) return null;
    return getNode(root, parts.slice(0, -1));
  }

  function defaultMode(node) {
    return node.type === 'dir' ? '755' : '644';
  }

  /* Build a node tree from a plain spec object:
   *   { home: { learner: { 'notes.txt': 'hello', projects: {} } } }
   * Objects become directories, strings become files (the string is content).
   */
  function buildFS(spec) {
    const root = { type: 'dir', name: '/', children: {}, mode: '755' };
    function add(parent, obj) {
      for (const key of Object.keys(obj || {})) {
        const val = obj[key];
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          const dir = { type: 'dir', name: key, children: {}, mode: '755' };
          parent.children[key] = dir;
          add(dir, val);
        } else {
          parent.children[key] = {
            type: 'file',
            name: key,
            content: String(val == null ? '' : val),
            mode: '644',
          };
        }
      }
    }
    add(root, spec || {});
    return root;
  }

  /* ---------- line helpers ---------- */

  function line(text, cls) {
    return { text: String(text == null ? '' : text), cls: cls || 'out' };
  }

  /* ---------- the shell ---------- */

  class Shell {
    constructor(options) {
      options = options || {};
      this.root = buildFS(options.fs || {});
      this.cwdParts = resolveParts([], options.cwd || '/home/learner');
      // Ensure cwd exists; fall back to home, then root.
      if (!this.nodeAt(this.cwdParts) || this.nodeAt(this.cwdParts).type !== 'dir') {
        this.cwdParts = splitPath('/home/learner');
        if (!this.nodeAt(this.cwdParts)) this.cwdParts = [];
      }
      this.home = splitPath('/home/learner');
      this.user = options.user || 'learner';
      this.host = options.host || 'linux-dojo';
      this.history = [];
      this.commandHelp = COMMAND_HELP;
    }

    /* public helpers used by lesson checkers */

    cwd() {
      return joinParts(this.cwdParts);
    }

    nodeAt(parts) {
      return getNode(this.root, parts);
    }

    resolve(arg) {
      return resolveParts(this.cwdParts, arg);
    }

    exists(arg) {
      return !!this.nodeAt(this.resolve(arg));
    }

    node(arg) {
      return this.nodeAt(this.resolve(arg));
    }

    content(arg) {
      const n = this.node(arg);
      return n && n.type === 'file' ? n.content : null;
    }

    mode(arg) {
      const n = this.node(arg);
      return n ? n.mode || defaultMode(n) : null;
    }

    ran(cmd) {
      const c = String(cmd).trim();
      return this.history.some((h) => h.trim() === c);
    }

    ranStarts(prefix) {
      return this.history.some((h) => h.trim().indexOf(prefix) === 0);
    }

    /* ---------- filesystem mutations ---------- */

    ensureParent(parts, createMissing) {
      const parent = parentNode(this.root, parts);
      if (!parent || parent.type !== 'dir') {
        if (!createMissing) return null;
        // create intermediate dirs (used by mkdir -p)
        let cur = this.root;
        for (let i = 0; i < parts.length - 1; i++) {
          const seg = parts[i];
          if (!cur.children[seg]) cur.children[seg] = { type: 'dir', name: seg, children: {}, mode: '755' };
          cur = cur.children[seg];
          if (cur.type !== 'dir') return null;
        }
        return cur;
      }
      return parent;
    }

    makeDir(parts, createMissing) {
      const name = parts[parts.length - 1];
      const parent = this.ensureParent(parts, createMissing);
      if (!parent) return false;
      if (!createMissing && parent.children[name]) return false;
      if (!parent.children[name]) parent.children[name] = { type: 'dir', name: name, children: {}, mode: '755' };
      return parent.children[name].type === 'dir';
    }

    makeFile(parts, content) {
      const name = parts[parts.length - 1];
      const parent = this.ensureParent(parts, false);
      if (!parent || parent.type !== 'dir') return false;
      if (parent.children[name] && parent.children[name].type === 'dir') return false;
      if (!parent.children[name]) {
        parent.children[name] = { type: 'file', name: name, content: '', mode: '644' };
      }
      if (content != null) parent.children[name].content = content;
      return true;
    }

    remove(parts, recursive) {
      const node = this.nodeAt(parts);
      if (!node) return { ok: false, reason: 'no such file or directory' };
      if (node.type === 'dir' && Object.keys(node.children).length && !recursive) {
        return { ok: false, reason: 'is a directory (use -r)' };
      }
      const parent = parentNode(this.root, parts);
      if (!parent) return { ok: false, reason: 'cannot remove root' };
      delete parent.children[node.name];
      return { ok: true };
    }

    copy(srcParts, dstParts, recursive) {
      const src = this.nodeAt(srcParts);
      if (!src) return { ok: false, reason: 'source not found' };
      let target = this.nodeAt(dstParts);
      if (target && target.type === 'dir') {
        target = this.nodeAt(dstParts.concat([src.name]));
      }
      const tp = target ? dstParts.concat([src.name]) : dstParts;
      if (src.type === 'dir') {
        if (!recursive) return { ok: false, reason: 'omitting directory (use -r)' };
        if (!this.makeDir(tp, true)) return { ok: false, reason: 'cannot create directory' };
        const srcDir = src;
        const dstDir = this.nodeAt(tp);
        for (const k of Object.keys(srcDir.children)) {
          const child = srcDir.children[k];
          if (child.type === 'file') dstDir.children[k] = { type: 'file', name: k, content: child.content, mode: child.mode };
          else {
            const sub = tp.concat([k]);
            this.makeDir(sub, true);
            // shallow recursive copy
            this.copy(srcParts.concat([k]), sub, true);
          }
        }
        return { ok: true };
      }
      const parent = parentNode(this.root, tp);
      if (!parent || parent.type !== 'dir') return { ok: false, reason: 'destination not found' };
      parent.children[tp[tp.length - 1]] = { type: 'file', name: tp[tp.length - 1], content: src.content, mode: src.mode };
      return { ok: true };
    }

    /* ---------- command runner ---------- */

    run(input) {
      const raw = String(input == null ? '' : input).trim();
      if (!raw) return [];
      this.history.push(raw);
      if (raw === 'clear' || raw === 'cls') return [{ clear: true }];

      // Tokenize on whitespace (good enough for a teaching shell). Keep quotes
      // together so `echo "hello world"` works.
      const tokens = tokenize(raw);
      if (!tokens.length) return [];
      const cmd = tokens[0];
      const args = tokens.slice(1);
      const flags = args.filter((a) => a.startsWith('-') && a !== '-');
      const positional = args.filter((a) => !a.startsWith('-'));
      const has = (f) => flags.some((x) => x.indexOf(f) !== -1);

      switch (cmd) {
        case 'help': return this.cmdHelp(positional[0]);
        case 'man': return this.cmdHelp(positional[0]);
        case 'pwd': return [line(this.cwd())];
        case 'whoami': return [line(this.user)];
        case 'date': return [line(new Date().toString())];
        case 'history': return this.history.map((h, i) => line('  ' + (i + 1) + '  ' + h));
        case 'echo': return this.cmdEcho(args);
        case 'cd': return this.cmdCd(positional[0]);
        case 'ls': return this.cmdLs(flags, positional);
        case 'cat': return this.cmdCat(positional);
        case 'touch': return this.cmdTouch(positional);
        case 'mkdir': return this.cmdMkdir(has('p'), positional);
        case 'rm': return this.cmdRm(has('r') || has('R') || has('f'), positional);
        case 'cp': return this.cmdCp(has('r') || has('R'), positional);
        case 'mv': return this.cmdMv(positional);
        case 'grep': return this.cmdGrep(flags, positional);
        case 'head': return this.cmdHeadTail('head', flags, positional, args);
        case 'tail': return this.cmdHeadTail('tail', flags, positional, args);
        case 'wc': return this.cmdWc(flags, positional);
        case 'sort': return this.cmdSort(flags, positional);
        case 'chmod': return this.cmdChmod(positional);
        case 'chown': return this.cmdChown(positional);
        case 'ssh': return this.cmdSsh(positional);
        case 'ssh-keygen': return this.cmdKeygen();
        case 'scp': return this.cmdScp(positional);
        case 'ps': return this.cmdPs(flags);
        case 'kill': return this.cmdKill(positional);
        case 'bash':
        case 'sh':
          return this.cmdScript(positional[0]);
        case 'clear': return [{ clear: true }];
        case 'exit': return [line('(this is a simulation — there is no real shell to exit)', 'muted')];
        default:
          return [line(cmd + ': command not found', 'err')];
      }
    }

    /* ---------- individual commands ---------- */

    cmdHelp(topic) {
      if (topic && COMMAND_HELP[topic]) {
        return [line(COMMAND_HELP[topic], 'info')];
      }
      if (topic) return [line('No help for: ' + topic, 'err')];
      const names = Object.keys(COMMAND_HELP).sort();
      const out = [line('Available commands:', 'accent')];
      for (let i = 0; i < names.length; i += 4) {
        out.push(line('  ' + names.slice(i, i + 4).map((n) => n.padEnd(14)).join('')));
      }
      out.push(line(''));
      out.push(line('Tip: type `man <command>` for details.', 'muted'));
      return out;
    }

    cmdEcho(args) {
      // Detect redirection: echo text > file  /  echo text >> file
      let redirectIdx = -1;
      let append = false;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '>') { redirectIdx = i; append = false; break; }
        if (args[i] === '>>') { redirectIdx = i; append = true; break; }
      }
      const isWhole = args[0] === '>>' || args[0] === '>';
      const textArgs = isWhole ? [] : args.slice(0, redirectIdx === -1 ? args.length : redirectIdx);
      let text = textArgs.join(' ');
      if (textArgs[0] === '-n') text = textArgs.slice(1).join(' ');
      if (redirectIdx !== -1 || isWhole) {
        const fileArg = isWhole ? args[1] : args[redirectIdx + 1];
        if (!fileArg) return [line('echo: missing filename after redirection', 'err')];
        const parts = this.resolve(fileArg);
        const old = append ? (this.content(fileArg) || '') : '';
        if (!this.makeFile(parts, old + text + '\n')) return [line('echo: cannot write to ' + fileArg, 'err')];
        return [];
      }
      return [line(text)];
    }

    cmdCd(arg) {
      const target = !arg || arg === '~' ? this.home : this.resolve(arg);
      const node = this.nodeAt(target);
      if (!node) return [line('cd: ' + arg + ': No such file or directory', 'err')];
      if (node.type !== 'dir') return [line('cd: ' + arg + ': Not a directory', 'err')];
      this.cwdParts = target;
      return [];
    }

    cmdLs(flags, positional) {
      const long = flags.some((f) => f.indexOf('l') !== -1);
      const all = flags.some((f) => f.indexOf('a') !== -1);
      const target = positional[0] || '.';
      const parts = this.resolve(target);
      const node = this.nodeAt(parts);
      if (!node) return [line('ls: cannot access ' + target + ': No such file or directory', 'err')];
      if (node.type === 'file') return [line(node.name)];
      let names = Object.keys(node.children);
      if (!all) names = names.filter((n) => !n.startsWith('.'));
      names.sort();
      if (!names.length) return [];
      if (long) {
        const out = [];
        out.push(line('total ' + names.length, 'muted'));
        for (const name of names) {
          const child = node.children[name];
          const dir = child.type === 'dir';
          const mode = child.mode || defaultMode(child);
          const size = dir ? Object.keys(child.children).length : child.content.length;
          const typeChar = dir ? 'd' : '-';
          const perms = modeToSymbols(mode);
          out.push(line(
            typeChar + perms + '  ' + this.user + ' ' + this.user + ' ' +
            String(size).padStart(4) + ' Jan  1  ' + name,
            dir ? 'dir' : 'out'
          ));
        }
        return out;
      }
      return [line(names.map((n) => (node.children[n].type === 'dir' ? n + '/' : n)).join('   '))];
    }

    cmdCat(positional) {
      if (!positional.length) return [line('cat: missing file operand', 'err')];
      const out = [];
      for (const f of positional) {
        const parts = this.resolve(f);
        const node = this.nodeAt(parts);
        if (!node) { out.push(line('cat: ' + f + ': No such file or directory', 'err')); continue; }
        if (node.type === 'dir') { out.push(line('cat: ' + f + ': Is a directory', 'err')); continue; }
        if (node.content) {
          node.content.replace(/\n$/, '').split('\n').forEach((l) => out.push(line(l)));
        }
      }
      return out;
    }

    cmdTouch(positional) {
      if (!positional.length) return [line('touch: missing file operand', 'err')];
      const out = [];
      for (const f of positional) {
        const parts = this.resolve(f);
        const existing = this.nodeAt(parts);
        if (existing && existing.type === 'dir') { out.push(line('touch: ' + f + ': Is a directory', 'err')); continue; }
        if (!existing && !this.makeFile(parts, '')) out.push(line('touch: cannot create ' + f, 'err'));
      }
      return out;
    }

    cmdMkdir(parentFlag, positional) {
      if (!positional.length) return [line('mkdir: missing operand', 'err')];
      const out = [];
      for (const d of positional) {
        const parts = this.resolve(d);
        const existing = this.nodeAt(parts);
        if (existing) {
          if (!parentFlag) out.push(line('mkdir: cannot create directory ' + d + ': File exists', 'err'));
          continue;
        }
        if (!this.makeDir(parts, parentFlag)) out.push(line('mkdir: cannot create directory ' + d, 'err'));
      }
      return out;
    }

    cmdRm(recursive, positional) {
      if (!positional.length) return [line('rm: missing operand', 'err')];
      const out = [];
      for (const f of positional) {
        const res = this.remove(this.resolve(f), recursive);
        if (!res.ok) out.push(line('rm: cannot remove ' + f + ': ' + res.reason, 'err'));
      }
      return out;
    }

    cmdCp(recursive, positional) {
      if (positional.length < 2) return [line('cp: missing destination file operand', 'err')];
      const src = positional[0], dst = positional[positional.length - 1];
      const res = this.copy(this.resolve(src), this.resolve(dst), recursive);
      return res.ok ? [] : [line('cp: ' + res.reason, 'err')];
    }

    cmdMv(positional) {
      if (positional.length < 2) return [line('mv: missing destination file operand', 'err')];
      const src = positional[0], dst = positional[positional.length - 1];
      const srcParts = this.resolve(src);
      const node = this.nodeAt(srcParts);
      if (!node) return [line('mv: cannot stat ' + src + ': No such file or directory', 'err')];
      const dstParts = this.resolve(dst);
      const dstNode = this.nodeAt(dstParts);
      let finalParts = dstParts;
      if (dstNode && dstNode.type === 'dir') finalParts = dstParts.concat([node.name]);
      const res = this.copy(srcParts, finalParts, true);
      if (!res.ok) return [line('mv: ' + res.reason, 'err')];
      this.remove(srcParts, true);
      return [];
    }

    cmdGrep(flags, positional) {
      const ignoreCase = flags.some((f) => f.indexOf('i') !== -1);
      const showNum = flags.some((f) => f.indexOf('n') !== -1);
      if (positional.length < 2) return [line('grep: usage: grep [options] PATTERN FILE...', 'err')];
      const pattern = positional[0];
      const files = positional.slice(1);
      const out = [];
      const needle = ignoreCase ? pattern.toLowerCase() : pattern;
      for (const f of files) {
        const node = this.nodeAt(this.resolve(f));
        if (!node || node.type !== 'file') { out.push(line('grep: ' + f + ': No such file', 'err')); continue; }
        const lines = node.content.split('\n');
        lines.forEach((l, i) => {
          const hay = ignoreCase ? l.toLowerCase() : l;
          if (hay.indexOf(needle) !== -1) {
            out.push(line(showNum ? (i + 1) + ':' + l : l, 'match'));
          }
        });
      }
      return out;
    }

    cmdHeadTail(which, flags, positional, args) {
      if (!positional.length) return [line(which + ': missing file operand', 'err')];
      let n = 10;
      const all = args || flags;
      for (let i = 0; i < all.length; i++) {
        if (all[i] === '-n' && i + 1 < all.length) { n = parseInt(all[i + 1], 10); break; }
        const m = /^n(\d+)$/.exec(all[i]);
        if (m) n = parseInt(m[1], 10);
      }
      const f = positional[positional.length - 1];
      const node = this.nodeAt(this.resolve(f));
      if (!node || node.type !== 'file') return [line(which + ': ' + f + ': No such file', 'err')];
      const lines = node.content.split('\n').filter((l, i, a) => !(i === a.length - 1 && l === ''));
      const chosen = which === 'head' ? lines.slice(0, n) : lines.slice(-n);
      return chosen.map((l) => line(l));
    }

    cmdWc(flags, positional) {
      if (!positional.length) return [line('wc: missing file operand', 'err')];
      const showL = flags.some((f) => f.indexOf('l') !== -1);
      const showW = flags.some((f) => f.indexOf('w') !== -1);
      const showC = flags.some((f) => f.indexOf('c') !== -1);
      const any = showL || showW || showC;
      const out = [];
      for (const f of positional) {
        const node = this.nodeAt(this.resolve(f));
        if (!node || node.type !== 'file') { out.push(line('wc: ' + f + ': No such file', 'err')); continue; }
        const content = node.content;
        const l = content ? content.split('\n').length - (content.endsWith('\n') ? 1 : 0) : 0;
        const w = content.trim() ? content.trim().split(/\s+/).length : 0;
        const c = content.length;
        const parts = [];
        if (!any || showL) parts.push(l);
        if (!any || showW) parts.push(w);
        if (!any || showC) parts.push(c);
        out.push(line(parts.map((x) => String(x).padStart(6)).join(' ') + '  ' + f));
      }
      return out;
    }

    cmdSort(flags, positional) {
      if (!positional.length) return [line('sort: missing file operand', 'err')];
      const reverse = flags.some((f) => f.indexOf('r') !== -1);
      const f = positional[positional.length - 1];
      const node = this.nodeAt(this.resolve(f));
      if (!node || node.type !== 'file') return [line('sort: ' + f + ': No such file', 'err')];
      let lines = node.content.split('\n').filter((l) => l.length);
      lines.sort();
      if (reverse) lines.reverse();
      return lines.map((l) => line(l));
    }

    cmdChmod(positional) {
      if (positional.length < 2) return [line('chmod: usage: chmod MODE FILE...', 'err')];
      const modeArg = positional[0];
      let numeric = /^[0-7]{3}$/.exec(modeArg);
      const out = [];
      for (const f of positional.slice(1)) {
        const parts = this.resolve(f);
        const node = this.nodeAt(parts);
        if (!node) { out.push(line('chmod: ' + f + ': No such file', 'err')); continue; }
        let mode = node.mode || defaultMode(node);
        if (numeric) {
          mode = modeArg;
        } else {
          // simple symbolic: +x, -x, +r, +w, a+x, u+x, etc.
          const m = /^([ugoa]*)([+-])([rwx]+)$/.exec(modeArg);
          if (!m) { out.push(line('chmod: invalid mode: ' + modeArg, 'err')); continue; }
          const digits = mode.split('').map((d) => parseInt(d, 8));
          let which = m[1] || 'a';
          const add = m[2] === '+';
          const perms = m[3];
          const idxs = [];
          if (which.indexOf('u') !== -1 || which.indexOf('a') !== -1) idxs.push(0);
          if (which.indexOf('g') !== -1 || which.indexOf('a') !== -1) idxs.push(1);
          if (which.indexOf('o') !== -1 || which.indexOf('a') !== -1) idxs.push(2);
          for (const p of perms) {
            const bit = p === 'r' ? 4 : p === 'w' ? 2 : 1;
            for (const i of idxs) digits[i] = add ? (digits[i] | bit) : (digits[i] & ~bit);
          }
          mode = digits.join('');
        }
        node.mode = mode;
      }
      return out;
    }

    cmdChown(positional) {
      if (positional.length < 2) return [line('chown: usage: chown USER:GROUP FILE...', 'err')];
      // Ownership is simulated only; record it for realism.
      const out = [];
      for (const f of positional.slice(1)) {
        if (!this.exists(f)) out.push(line('chown: ' + f + ': No such file', 'err'));
      }
      return out;
    }

    cmdSsh(positional) {
      if (!positional.length) return [line('usage: ssh user@host', 'err')];
      const dest = positional[0];
      return [
        line('Connecting to ' + dest + '...', 'muted'),
        line('Welcome to Ubuntu (simulated remote session)', 'info'),
        line("Type 'exit' to return to your local machine.", 'muted'),
      ];
    }

    cmdKeygen() {
      const sshDir = this.resolve('~/.ssh');
      if (!this.nodeAt(sshDir)) this.makeDir(sshDir, true);
      this.makeFile(this.resolve('~/.ssh/id_rsa'), '-----BEGIN PRIVATE KEY-----\n(simulated)\n-----END PRIVATE KEY-----\n');
      this.makeFile(this.resolve('~/.ssh/id_rsa.pub'), 'ssh-rsa AAAA... learner@linux-dojo\n');
      return [line('Generated public/private RSA key pair.', 'info'), line('Your identification has been saved in ~/.ssh/id_rsa', 'muted')];
    }

    cmdScript(file) {
      if (!file) return [line('bash: missing script file', 'err')];
      const node = this.nodeAt(this.resolve(file));
      if (!node || node.type !== 'file') return [line('bash: ' + file + ': No such file', 'err')];
      return [
        line('(simulation) Would run: bash ' + file, 'muted'),
        line(node.content.replace(/\n$/, '') || '(empty script)'),
      ];
    }

    cmdScp(positional) {
      if (positional.length < 2) return [line('usage: scp <source> <user@host:destination>', 'err')];
      return [
        line('Copying ' + positional[0] + ' -> ' + positional[1] + ' ...', 'muted'),
        line('100%  (simulated transfer complete)', 'info'),
      ];
    }

    cmdPs(flags) {
      const full = flags.some((f) => f.indexOf('f') !== -1);
      const procs = [
        ['PID', 'TTY', 'STAT', 'COMMAND'],
        ['1', '?', 'Ss', '/sbin/init'],
        ['142', 'pts/0', 'Ss', 'bash'],
        ['318', 'pts/0', 'R+', 'ps ' + (full ? '-ef' : 'aux')],
        ['204', '?', 'S', 'sshd: learner@pts/0'],
      ];
      return procs.map((p) => line(p.map((x) => x.padEnd(8)).join(' '), p[0] === 'PID' ? 'accent' : 'out'));
    }

    cmdKill(positional) {
      if (!positional.length) return [line('kill: usage: kill [-SIGNAL] PID', 'err')];
      return [line('Sent SIGTERM to process ' + positional[positional.length - 1] + ' (simulated).', 'info')];
    }
  }

  /* ---------- utilities ---------- */

  function tokenize(raw) {
    const out = [];
    let cur = '';
    let quote = null;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (quote) {
        if (ch === quote) quote = null;
        else cur += ch;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (/\s/.test(ch)) {
        if (cur) { out.push(cur); cur = ''; }
      } else {
        cur += ch;
      }
    }
    if (cur) out.push(cur);
    return out;
  }

  function modeToSymbols(mode) {
    const bits = String(mode).split('').map((d) => parseInt(d, 10));
    let s = '';
    for (const b of bits) {
      s += (b & 4 ? 'r' : '-') + (b & 2 ? 'w' : '-') + (b & 1 ? 'x' : '-');
    }
    return s;
  }

  const COMMAND_HELP = {
    help: 'help [command] — list commands, or explain one.',
    man: 'man <command> — show the manual for a command.',
    pwd: 'pwd — print the current working directory.',
    ls: 'ls [-l] [-a] [path] — list directory contents. -l = details, -a = include hidden.',
    cd: 'cd [path] — change directory. Use cd ~ to go home, cd .. to go up.',
    cat: 'cat <file>... — print file contents.',
    echo: 'echo [text] [> file | >> file] — print text; redirect to create/append a file.',
    touch: 'touch <file>... — create empty files.',
    mkdir: 'mkdir [-p] <dir>... — create directories. -p creates parents.',
    rm: 'rm [-r] <path>... — remove files. -r removes directories recursively.',
    cp: 'cp [-r] <src> <dest> — copy files. -r copies directories.',
    mv: 'mv <src> <dest> — move or rename files/directories.',
    grep: 'grep [-i] [-n] <pattern> <file>... — search text. -i ignore case, -n line numbers.',
    head: 'head [-n N] <file> — show the first N lines (default 10).',
    tail: 'tail [-n N] <file> — show the last N lines (default 10).',
    wc: 'wc [-l|-w|-c] <file> — count lines, words, characters.',
    sort: 'sort [-r] <file> — sort lines alphabetically. -r reverses.',
    chmod: 'chmod <mode> <file> — change permissions, e.g. 755 or u+x.',
    chown: 'chown USER:GROUP <file> — change ownership (simulated).',
    whoami: 'whoami — print your username.',
    date: 'date — print the current date and time.',
    history: 'history — show commands you have run.',
    ssh: 'ssh user@host — open a simulated remote shell.',
    'ssh-keygen': 'ssh-keygen — generate a simulated SSH key pair in ~/.ssh.',
    bash: 'bash <script.sh> — run a shell script (simulated).',
    ps: 'ps [-ef] — list running processes.',
    kill: 'kill [-SIGNAL] <PID> — send a signal to a process.',
    scp: 'scp <src> user@host:<dest> — copy files over SSH (simulated).',
    clear: 'clear — clear the terminal screen.',
  };

  NS.Shell = Shell;
  NS.buildFS = buildFS;
  NS.COMMAND_HELP = COMMAND_HELP;
})(window);
