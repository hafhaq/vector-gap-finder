import './styles/manual.css';

const tabLayman = document.getElementById('tab-layman') as HTMLButtonElement;
const tabScientist = document.getElementById('tab-scientist') as HTMLButtonElement;
const viewLayman = document.getElementById('view-layman') as HTMLElement;
const viewScientist = document.getElementById('view-scientist') as HTMLElement;
const tocList = document.getElementById('toc-list') as HTMLUListElement;

function setAudience(mode: 'layman' | 'scientist', updateHash = true): void {
  const isSci = mode === 'scientist';

  tabLayman.classList.toggle('active', !isSci);
  tabLayman.setAttribute('aria-selected', String(!isSci));
  viewLayman.hidden = isSci;

  tabScientist.classList.toggle('active', isSci);
  tabScientist.setAttribute('aria-selected', String(isSci));
  viewScientist.hidden = !isSci;

  // Rebuild Table of Contents dynamically for the active audience view
  const activeView = isSci ? viewScientist : viewLayman;
  const sections = Array.from(activeView.querySelectorAll<HTMLElement>('section[data-toc]'));
  tocList.innerHTML = sections
    .map((sec) => `<li><a href="#${sec.id}">${sec.dataset.toc}</a></li>`)
    .join('');

  if (updateHash) {
    history.replaceState(null, '', isSci ? '#scientist' : '#layman');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

tabLayman.addEventListener('click', () => setAudience('layman'));
tabScientist.addEventListener('click', () => setAudience('scientist'));

// Honor direct deep-links (#scientist or #s-* section anchors)
const initialHash = window.location.hash.toLowerCase();
if (initialHash === '#scientist' || initialHash.startsWith('#s-')) {
  setAudience('scientist', false);
} else {
  setAudience('layman', false);
}
