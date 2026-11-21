// Goal logic uses the state and helpers defined in game.js, which must load first.
// Setting Financial Goals, Goals section of the app
$('addPersonalGoal').onclick = () => {
  const name = $('personalGoalName').value.trim(), target = +$('personalGoalTarget').value;
  if (!name || !(target > 0)) return toast('Add a name and target');
  S.personalGoals.push({ name, target, saved: 0, completed: false, starred: false });
  $('personalGoalName').value = $('personalGoalTarget').value = '';
  save(); renderPersonalGoals();
};

function renderPersonalGoals() {
  $('personalGoals').innerHTML = S.personalGoals.map((g, i) => {
    const pct = Math.min(100, g.saved / g.target * 100);
    const remaining = Math.max(0, g.target - g.saved);
    return `<div class="goal ${g.completed ? 'goal-completed' : ''}">
      <button type="button" class="goal-star ${g.starred ? 'starred' : ''}" data-star-goal="${i}" aria-label="${g.starred ? 'Unstar' : 'Star'} ${esc(g.name)}" aria-pressed="${!!g.starred}">${g.starred ? '★' : '☆'}</button>
      <b class="goal-name">${esc(g.name)}</b>
      <div class="bar"><div style="wid
      th:${pct}%"></div></div>
      <small>$${g.saved} saved of $${g.target} · $${remaining} to go</small>
      <div class="goal-row"><input type="number" min="1" placeholder="Add savings" aria-label="Amount saved for ${esc(g.name)}" id="personalGoalAmount${i}"><button type="button" data-save-goal="${i}">Add</button></div>
      <label class="goal-complete"><input type="checkbox" data-complete-goal="${i}" ${g.completed ? 'checked' : ''}> Mark completed</label>
      <details class="goal-menu">
        <summary aria-label="More options for ${esc(g.name)}">⋯</summary>
        <button type="button" data-delete-goal="${i}">Delete goal</button>
      </details>
    </div>`;
  }).join('') || '<p class="muted">Add a goal to start tracking your progress.</p>';

  $('personalGoals').querySelectorAll('[data-save-goal]').forEach(button => {
    button.onclick = () => {
      const i = +button.dataset.saveGoal, amount = Math.floor(+$('personalGoalAmount' + i).value);
      if (!(amount > 0)) return toast('Enter an amount');
      const goal = S.personalGoals[i];
      const remaining = Math.max(0, goal.target - goal.saved);
      if (remaining === 0) return toast(`You've saved enough for "${goal.name}"!`);
      if (amount > remaining) return toast(`That would exceed your goal. You only need $${remaining} more.`);
      goal.saved += amount;
      save(); renderPersonalGoals();
      completeMission('goal');
      if (goal.saved === goal.target) toast(`You've saved enough for "${goal.name}"!`);
    };
  });

  $('personalGoals').querySelectorAll('[data-complete-goal]').forEach(checkbox => {
    checkbox.onchange = () => {
      S.personalGoals[+checkbox.dataset.completeGoal].completed = checkbox.checked;
      save(); renderPersonalGoals();
    };
  });

  $('personalGoals').querySelectorAll('[data-delete-goal]').forEach(button => {
    button.onclick = () => {
      S.personalGoals.splice(+button.dataset.deleteGoal, 1);
      save(); renderPersonalGoals();
    };
  });

  $('personalGoals').querySelectorAll('[data-star-goal]').forEach(button => {
    button.onclick = () => {
      const i = +button.dataset.starGoal, goal = S.personalGoals[i];
      S.personalGoals.splice(i, 1);
      goal.starred = !goal.starred;
      if (goal.starred) S.personalGoals.unshift(goal);
      else S.personalGoals.push(goal);
      save(); renderPersonalGoals();
    };
  });
}

renderPersonalGoals();
