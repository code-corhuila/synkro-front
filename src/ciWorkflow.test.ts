/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/ci.yml', 'utf8').replace(/\r\n/g, '\n');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };

// The text of each job under `jobs:`, keyed by its name. The workflow is plain
// YAML with jobs at two spaces of indent; no parser is needed to read it.
function jobs(): Record<string, string> {
  const afterJobs = workflow.slice(workflow.indexOf('\njobs:\n') + '\njobs:\n'.length);
  const found: Record<string, string> = {};
  let name: string | undefined;
  for (const line of afterJobs.split('\n')) {
    const header = line.match(/^ {2}([\w-]+):\s*$/);
    if (header) {
      name = header[1];
      found[name] = '';
    } else if (name) {
      found[name] += `${line}\n`;
    }
  }
  return found;
}

const runCommands = (job: string) => [...job.matchAll(/^\s+- run: (.+)$/gm)].map(([, command]) => command.trim());

describe('CI workflow', () => {
  it('keeps the common-files check and adds lint, build and test', () => {
    expect(Object.keys(jobs()).sort()).toEqual(['build', 'check-common-files', 'lint', 'test']);
  });

  it('runs on the same pushes and pull requests as before', () => {
    expect(workflow).toMatch(/push:\n\s+branches: \[develop, qa, main\]/);
    expect(workflow).toMatch(/pull_request:\n\s+branches: \[develop, qa, main\]/);
  });

  describe.each(['lint', 'build', 'test'])('the %s job', (name) => {
    const job = () => jobs()[name];

    it('checks out, sets up Node 22 with the npm cache, and installs with npm ci', () => {
      expect(job()).toContain('uses: actions/checkout@v4');
      expect(job()).toMatch(/uses: actions\/setup-node@v4\n\s+with:\n\s+node-version: 22\n\s+cache: npm/);
      expect(runCommands(job())).toContain('npm ci');
      expect(runCommands(job())).not.toContain('npm install');
    });
  });

  it('lints', () => {
    expect(runCommands(jobs().lint)).toContain('npm run lint');
  });

  it('builds, then checks the build for the development sign-in', () => {
    const commands = runCommands(jobs().build);

    expect(commands).toContain('npm run build');
    expect(commands.indexOf('npm run check:production-build')).toBeGreaterThan(commands.indexOf('npm run build'));
  });

  it('builds with the development sign-in off', () => {
    expect(jobs().build).not.toMatch(/VITE_DEV_SIGN_IN:\s*['"]?true/);
  });

  it('runs the tests with coverage, so the 70% floor is enforced', () => {
    expect(runCommands(jobs().test)).toContain('npm run coverage');
    expect(packageJson.scripts.coverage).toBe('vitest run --coverage');
  });

  it('pins every action to a major version', () => {
    const actions = [...workflow.matchAll(/uses: (\S+)/g)].map(([, action]) => action);

    expect(actions.length).toBeGreaterThan(0);
    expect(actions.filter((action) => !/@v\d+$/.test(action))).toEqual([]);
  });
});
