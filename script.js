const scrollContainer = document.getElementById('timeline-scroll');
const dotsContainer = document.getElementById('timeline-dots');
const catButtons = document.querySelectorAll('.cat-btn');
let eventsData = [];
let currentEvents = [];
let isAnimating = false;
const CARD_WIDTH = 390;

async function loadTimeline() {
    try {
        const response = await fetch('events.json');
        eventsData = await response.json();
        setupCategories();
        switchCategory('MILESTONES');
    } catch (error) {
        console.error("Ошибка загрузки JSON:", error);
    }
}

function setupCategories() {
    catButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const catName = e.currentTarget.textContent.trim().toUpperCase();
            switchCategory(catName);
        });
    });
}

function switchCategory(categoryName) {
    // Всегда очищаем
    scrollContainer.innerHTML = '';
    dotsContainer.innerHTML = '';

    // Снимаем active со всех кнопок
    catButtons.forEach(btn => btn.classList.remove('active'));

    // Ставим active на нужную
    const activeBtn = Array.from(catButtons).find(btn =>
        btn.textContent.trim().toUpperCase() === categoryName
    );
    if (activeBtn) activeBtn.classList.add('active');

    if (categoryName !== 'MILESTONES') {
        scrollContainer.innerHTML = `<div class="in-dev">IN DEVELOPMENT</div>`;
        return;
    }

    currentEvents = eventsData.filter(e => e.categories.includes('milestones'));
    renderTimeline(currentEvents);
}

function renderTimeline(events) {
    let cardsHTML = '';
    let dotsHTML = '';

    events.forEach((event, index) => {
        cardsHTML += `
            <article class="timeline-card" data-index="${index}">
                <div class="card-media-wrapper">
                    <img src="${event.timeline_media.url}" alt="${event.title}" class="card-image">
                </div>
                <div class="card-info">
                    <h3 class="card-title">${event.title}</h3>
                    <time class="card-date">${event.date.display}</time>
                </div>
            </article>`;
        dotsHTML += `<span class="dot" data-index="${index}"></span>`;
    });

    scrollContainer.innerHTML = cardsHTML;
    dotsContainer.innerHTML = dotsHTML;

    const lastIndex = events.length - 1;
    scrollContainer.scrollLeft = lastIndex * CARD_WIDTH;

    // Клик по карточке
    document.querySelectorAll('.timeline-card').forEach(card => {
        card.addEventListener('click', () => {
            const idx = +card.dataset.index;
            scrollContainer.scrollTo({ left: idx * CARD_WIDTH, behavior: 'smooth' });
        });
    });

    // Клик по точкам
    document.querySelectorAll('.dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            const idx = +e.currentTarget.dataset.index;
            scrollContainer.scrollTo({ left: idx * CARD_WIDTH, behavior: 'smooth' });
        });
    });

    let scrollTimeout;
    scrollContainer.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);

        const raw = scrollContainer.scrollLeft / CARD_WIDTH;
        const activeIndex = Math.round(raw);
        const clamped = Math.max(0, Math.min(activeIndex, events.length - 1));

        document.querySelectorAll('.timeline-card').forEach((card, i) => {
            const dist = Math.abs(i - raw);
            const scale = 1.03 - Math.min(dist, 1.2) * 0.08;
            const opacity = 1 - Math.min(dist, 1.1) * 0.45;
            card.style.transform = `scale(${scale})`;
            card.style.opacity = opacity;
            card.classList.toggle('active-card', i === clamped);
        });

        document.querySelectorAll('.dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === clamped);
        });

        scrollTimeout = setTimeout(() => {
            if (isAnimating) return;
            applyColors(clamped, events);
            updateHero(clamped, events, true);
        }, 40);
    });

    applyColors(lastIndex, events);
    updateHero(lastIndex, events, false);
}

function applyColors(index, events) {
    if (!events[index]) return;

    const c = events[index].timeline_media.colors;

    // Устанавливаем переменные
    document.documentElement.style.setProperty('--bg-primary', c.bg_primary);
    document.documentElement.style.setProperty('--bg-secondary', c.bg_secondary);
    document.documentElement.style.setProperty('--text-main', c.text_main);
    document.documentElement.style.setProperty('--accent', c.accent_ball);

    // Принудительно красим категории
    document.querySelectorAll('.cat-btn').forEach(btn => {
        if (btn.classList.contains('active')) {
            btn.style.backgroundColor = c.bg_secondary;
            btn.style.color = c.accent_ball;
            btn.style.borderColor = c.bg_secondary;
        } else {
            btn.style.backgroundColor = 'transparent';
            btn.style.color = c.accent_ball;
            btn.style.borderColor = c.accent_ball;
        }
    });

    // Принудительно красим все основные текстовые элементы
    // (на случай если где-то остались старые inline-стили)
    const textElements = document.querySelectorAll(`
        .current-milestone h2,
        .subtitle,
        .hero-description,
        .hero-author,
        .more-btn,
        .btn,
        .card-title,
        .card-date,
        .nav-links a,
        .header h1.name
    `);

    textElements.forEach(el => {
        el.style.color = c.text_main;
    });
}

function updateHero(index, events, animate) {
    const event = events[index];
    const hero = document.querySelector('.current-milestone');
    if (!hero) return;

    const url = event.hero_media?.[0]?.url || event.timeline_media.url;
    const pos = event.hero_media?.[0]?.object_position || 'center 15%';

    const html = `
        <div class="media-container">
            <img src="${url}" alt="${event.title}" class="main-media" style="object-position: ${pos}">
        </div>
        <div class="content">
            <h2>${event.title}</h2>
            <p class="subtitle">${event.date.display}</p>

            <div class="quote-block">
                <p class="hero-description">${event.text_content.text}</p>
                <div class="quote-footer">
                    <p class="hero-author">${event.text_content.author}</p>
                    <button class="more-btn" data-index="${index}">MORE</button>
                </div>
            </div>

            <div class="action-buttons">
                ${event.action_buttons.map(b => `
                    <a href="${b.url}" target="_blank" class="btn-group">
                        <svg class="arrow" width="36" height="12" viewBox="0 0 36 12" fill="none">
                            <path d="M0 6H34M34 6L28 1.5M34 6L28 10.5" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span class="btn">${b.label}</span>
                    </a>
                `).join('')}
            </div>
        </div>
    `;

    if (animate) {
        isAnimating = true;
        hero.classList.add('fade-out');
        setTimeout(() => {
            hero.innerHTML = html;
            hero.classList.remove('fade-out');
            applyColors(index, events);
            bindMoreButton();
            isAnimating = false;
        }, 280);
    } else {
        hero.innerHTML = html;
        applyColors(index, events);
        bindMoreButton();
    }
}

function bindMoreButton() {
    const moreBtn = document.querySelector('.more-btn');
    if (!moreBtn) return;

    moreBtn.addEventListener('click', () => {
        const index = +moreBtn.dataset.index;
        openArticle(index);
    });
}

function openArticle(index) {
    const event = currentEvents[index];
    const panel = document.getElementById('article-panel');
    const left = document.getElementById('article-left');
    const right = document.getElementById('article-right');
    const moreBtn = document.querySelector('.more-btn');

    // Текст статьи
    let rightHTML = '';
    if (event.long_content && event.long_content.length) {
        event.long_content.forEach(block => {
            if (block.type === 'paragraph') {
                rightHTML += `<p>${block.text}</p>`;
            }
            if (block.type === 'quote') {
                rightHTML += `<p style="font-style: italic; opacity: 0.85;">“${block.text}” — ${block.author || ''}</p>`;
            }
        });
    } else {
        rightHTML = `<p>Article content coming soon.</p>`;
    }
    right.innerHTML = rightHTML;

    // Левая колонка
    left.innerHTML = `
        <div class="article-note">
            <span>Note</span>
            Additional visuals and context for this era will appear here.
        </div>
    `;

    // Скрываем MORE
    if (moreBtn) moreBtn.classList.add('hidden');

    // Открываем
    document.body.classList.add('article-open');
    panel.classList.add('open');

    document.getElementById('less-btn').onclick = closeArticle;
}

function closeArticle() {
    const panel = document.getElementById('article-panel');
    const moreBtn = document.querySelector('.more-btn');

    panel.classList.remove('open');
    document.body.classList.remove('article-open');

    // Возвращаем MORE
    setTimeout(() => {
        if (moreBtn) moreBtn.classList.remove('hidden');
    }, 400);
}

loadTimeline();
