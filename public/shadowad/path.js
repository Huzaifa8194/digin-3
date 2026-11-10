const stages = [
  ['01 / EXPLOIT', 'An ordinary account has a working path to privileged access.'],
  ['02 / PROVE', 'The report records timestamped evidence for each step in the chain.'],
  ['03 / FIX', 'The fix targets the weak permission after checking who still uses it.'],
  ['04 / RETEST', 'The same attack is replayed. The route is closed in this example.'],
];

const trace = document.querySelector('.trace');
const label = document.querySelector('#trace-stage');
const result = document.querySelector('#trace-result');

for (const step of document.querySelectorAll('[data-stage]')) {
  step.addEventListener('toggle', () => {
    if (!step.open) return;

    const stage = step.dataset.stage;
    const [heading, description] = stages[Number(stage)];
    trace.dataset.state = stage;
    label.textContent = heading;
    result.textContent = description;
  });
}
