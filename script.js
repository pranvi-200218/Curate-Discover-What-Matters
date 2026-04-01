const YT_KEY = 'AIzaSyAwiL0rEq2qvpJEzNgv2rp6kD4-C-uQJac';
let allItems = [];
let bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
let activeFilter = 'all';

async function search() {
    const q = document.getElementById('query').value.trim();
    if (!q) return alert('Please enter a topic!');

    document.getElementById('status').textContent = 'Loading...';
    document.getElementById('results').innerHTML = '';
    allItems = [];

    const [ytResults, ghResults] = await Promise.all([
        fetchYouTube(q),
        fetchGitHub(q)
    ]);

    allItems = [...ytResults, ...ghResults];
    allItems = rankItems(allItems, q);

    document.getElementById('status').textContent = `Showing top ${allItems.length} results`;
    showCards();
}

async function fetchYouTube(q) {
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&type=video&maxResults=10&key=${YT_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
            alert('YouTube Error: ' + data.error.message);
            return [];
        }

        if (!data.items || data.items.length === 0) {
            alert('YouTube returned 0 items');
            return [];
        }

        return data.items.map(item => ({
            type: 'yt',
            id: item.id.videoId,
            title: item.snippet.title,
            desc: item.snippet.description,
            thumb: item.snippet.thumbnails.medium.url,
            channel: item.snippet.channelTitle,
            url: `https://youtube.com/watch?v=${item.id.videoId}`,
            date: item.snippet.publishedAt,
            score: 0
        }));
    } catch (err) {
        alert('YouTube fetch failed: ' + err.message);
        return [];
    }
}
async function fetchGitHub(q) {
    try {
        const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=10`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.message) {
            alert('GitHub Error: ' + data.message);
            return [];
        }

        console.log('GitHub OK, got', data.items.length, 'items');

        return data.items.map(repo => ({
            type: 'gh',
            id: String(repo.id),
            title: repo.full_name,
            desc: repo.description || 'No description',
            thumb: '',
            channel: repo.owner.login,
            url: repo.html_url,
            date: repo.updated_at,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            score: 0
        }));
    } catch (err) {
        alert('GitHub fetch failed: ' + err.message);
        return [];
    }
}

function rankItems(items, q) {
    const words = q.toLowerCase().split(' ');
    items.forEach(item => {
        let score = 0;
        words.forEach(w => {
            if (item.title.toLowerCase().includes(w)) score += 30;
            if (item.desc.toLowerCase().includes(w)) score += 10;
        });
        if (item.stars) score += Math.min(40, Math.log10(item.stars + 1) * 10);
        const days = (Date.now() - new Date(item.date)) / 86400000;
        if (days < 30) score += 15;
        else if (days < 365) score += 5;
        item.score = Math.round(score);
    });
    return items.sort((a, b) => b.score - a.score).slice(0, 10);
}

function showCards() {
    let items = allItems;
    if (activeFilter === 'yt') items = allItems.filter(i => i.type === 'yt');
    if (activeFilter === 'gh') items = allItems.filter(i => i.type === 'gh');
    if (activeFilter === 'bm') items = bookmarks;

    const container = document.getElementById('results');
    container.innerHTML = '';

    if (items.length === 0) {
        document.getElementById('status').textContent = 'No results found.';
        return;
    }

    items.forEach(item => {
                const isSaved = bookmarks.some(b => b.id === item.id);
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
      <span class="tag ${item.type}">${item.type === 'yt' ? 'YouTube' : 'GitHub'}</span>
      ${item.thumb ? `<img src="${item.thumb}" alt="">` : ''}
      <h3>${item.title}</h3>
      <p>${item.desc.slice(0, 100)}...</p>
      <div class="meta">${item.type === 'yt' ? '📺 ' + item.channel : '⭐ ' + (item.stars || 0) + ' stars'}</div>
      <div class="score">Score: ${item.score}</div>
      <div class="actions">
        <a href="${item.url}" target="_blank">${item.type === 'yt' ? '▶ Watch' : 'View Repo'}</a>
        <button class="bm-btn ${isSaved ? 'saved' : ''}" onclick="toggleBookmark('${item.id}')">
          ${isSaved ? '⭐' : '☆'}
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function setFilter(f) {
  activeFilter = f;
  document.querySelectorAll('.toggles button').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-' + f).classList.add('active');
  showCards();
}

function toggleBookmark(id) {
  const item = allItems.find(i => i.id === id) || bookmarks.find(i => i.id === id);
  const index = bookmarks.findIndex(b => b.id === id);
  if (index >= 0) bookmarks.splice(index, 1);
  else bookmarks.push(item);
  localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  showCards();
}

document.getElementById('query').addEventListener('keydown', e => {
  if (e.key === 'Enter') search();
});