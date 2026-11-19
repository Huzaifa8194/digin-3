// Which screen of the shadowAD console each fleet crystal opens on, and what its numbered regions explain.
// Hovering a region (or its number, or its legend line) spotlights it and shows the text below.
import type { Tour } from './app';

export const TOURS: Tour[] = [
  // 01 Control plane → Control plane
  { screen: 'home', pins: [
    { at: 'picker', title: 'Pick the agents', text: 'Choose one agent or several. They work together on the same engagement.' },
    { at: 'target', title: 'Define the scope', text: 'The subnet, domain or host you own. Only declared targets are touched; everything else is refused.' },
    { at: 'roe', title: 'Rules of engagement', text: 'Set the ROE up front: non-destructive, rate limits, no persistence, review mode. Every agent obeys them.' },
    { at: 'goals', title: 'The goals', text: 'What the engagement should achieve, in plain words. The agents plan their work from it.' },
    { at: 'run', title: 'Run in the background', text: 'Press run and follow it in the War room. Try it.' },
  ] },
  // 02 War room → War room
  { screen: 'live', pins: [
    { at: 'tools', title: 'The tools behind the run', text: 'Shown so you know what drives the simulation. Not a fixed list: an agent can install more at runtime, but only after you approve it.' },
    { at: 'tabs', title: 'Short or in depth', text: 'Activity shows the short version of each command. Terminal shows the full detail. Both are a live feed you watch, not type into.' },
    { at: 'subagents', title: 'Agents in parallel', text: 'An agent splits the work into subagents that run side by side. Any number of them; you only see what is running now.' },
    { at: 'reply', title: 'Steer the run', text: 'Change direction, add parameters or answer the agent after it has started. Risky steps wait here for you.' },
    { at: 'outputs', title: 'Graph and report', text: 'At the end, ask for an architecture graph of what it found, or open the evidenced report.' },
  ] },
  // 03 Agents inventory review → Agents
  { screen: 'agents', pins: [
    { at: 'areas', title: '52 specialists', text: 'Browsable by work area. The right one self-selects from the words in your brief.' },
    { at: 'card-ad', title: 'Open any agent', text: 'Each card opens the agent\'s full definition: what it does, its capabilities and when it is dispatched.' },
    { at: 'mode', title: 'EXEC or ADVISORY', text: 'Every agent declares whether it can run commands or only recommends.' },
  ] },
  // 04 Simulated exploitation graph → Attack graph
  { screen: 'explorer', pins: [
    { at: 'operator', title: 'The operator', text: 'The person driving the simulation. Every path starts from their workstation, their scope and their authorization.' },
    { at: 'perimeter', title: 'Perimeter and subnet', text: 'To the right of the operator: the firewall, the domain subnet or whichever asset is being analysed.' },
    { at: 'paths', title: 'Assets on an attack path', text: 'Inside the network, shadowAD follows each path it finds and draws the assets that connect to it. Click one.' },
    { at: 'idle', title: 'Grey means quiet', text: 'Only assets an agent can work on light up. The rest stay grey: not worth attention yet.' },
    { at: 'sidecard', title: 'The side card', text: 'For the selected asset: its properties, the finding it is exposed to, the evidence, and what live agents are doing on it right now.' },
  ] },
  // 05 Detection engineering → Dashboard
  { screen: 'dashboard', pins: [
    { at: 'tiles', title: 'Seconds, not slides', text: 'Is anything running, and did it find anything serious? Answered at a glance.' },
    { at: 'severity', title: 'Open findings by severity', text: 'Where your defenders should spend the next hour.' },
    { at: 'paths', title: 'Top paths', text: 'What a run proved, ready to turn into detections and hardening steps.' },
    { at: 'runs', title: 'Every run, accounted for', text: 'Status and findings for each run against each target.' },
  ] },
  // 06 Reporting & compliance → a report
  { screen: 'report', pins: [
    { at: 'rtiles', title: 'The headline numbers', text: 'Findings, severity, agents and cost for the whole run.' },
    { at: 'rules', title: 'Scope and rules up front', text: 'Review mode, non-destructive, no persistence, stated on the first page.' },
    { at: 'fmap', title: 'A findings map', text: 'Produced by the agent, grouped by host and coloured by severity.' },
    { at: 'artifacts', title: 'Fully audited', text: 'Prompt, command log, evidence and report, saved to disk for every run.' },
  ] },
];
