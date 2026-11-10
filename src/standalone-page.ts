import './style.css';
import './component-refresh.css';
import './reference-components.css';
import './chapter-compositions.css';
import './layout-refinement.css';
import './standalone-page.css';
import { mountComponentRefresh } from './component-refresh';
import { mountTeam } from './reference-components';

mountComponentRefresh();

const teamAnchor = document.getElementById('about-team');
if (teamAnchor) {
  mountTeam(teamAnchor);
  teamAnchor.remove();
}
