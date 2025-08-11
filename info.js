let infoData = { sections: [] };
let editMode = false;

async function loadInfo() {
    try {
        const data = await window.electron.getInfo();
        infoData = data || { sections: [] };
    } catch (err) {
        infoData = { sections: [] };
        console.error(err);
    }
    renderInfo();
}

function renderInfo() {
    const content = document.getElementById('info-content');
    const buttons = document.getElementById('info-buttons');
    content.innerHTML = '';
    buttons.innerHTML = '';
    infoData.sections.forEach(sec => {
        const section = document.createElement('div');
        section.className = 'info-section';
        section.id = sec.id;
        const h = document.createElement('h2');
        h.textContent = sec.title;
        const p = document.createElement('p');
        p.textContent = sec.content;
        section.appendChild(h);
        section.appendChild(p);
        content.appendChild(section);
        const btn = document.createElement('button');
        btn.textContent = sec.title;
        btn.addEventListener('click', () => {
            document.getElementById(sec.id).scrollIntoView({ behavior: 'smooth' });
        });
        buttons.appendChild(btn);
    });
}

async function toggleEdit() {
    editMode = !editMode;
    const editBtn = document.getElementById('edit-info-btn');
    const sections = document.querySelectorAll('.info-section');
    if (editMode) {
        editBtn.textContent = 'Save';
        sections.forEach(sec => {
            const p = sec.querySelector('p');
            const ta = document.createElement('textarea');
            ta.value = p.textContent;
            sec.replaceChild(ta, p);
        });
    } else {
        editBtn.textContent = 'Edit';
        const newSections = [];
        sections.forEach(sec => {
            const ta = sec.querySelector('textarea');
            const p = document.createElement('p');
            p.textContent = ta.value;
            sec.replaceChild(p, ta);
            const id = sec.id;
            const title = sec.querySelector('h2').textContent;
            newSections.push({ id, title, content: ta.value });
        });
        infoData.sections = newSections;
        try {
            await window.electron.saveInfo(infoData);
        } catch (err) {
            console.error(err);
        }
    }
}

document.getElementById('home-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
});

document.getElementById('info-btn').addEventListener('click', () => {
    window.location.href = 'info.html';
});

document.getElementById('random-btn').addEventListener('click', goRandom);

document.getElementById('edit-info-btn').addEventListener('click', toggleEdit);

async function goRandom() {
    try {
        const chars = await window.electron.getCharacters();
        if (!chars.length) return;
        const char = chars[Math.floor(Math.random() * chars.length)];
        let loads = await window.electron.getLoadouts(char.name);
        let names = loads.map(l => l.name);
        names.push('default');
        const loadName = names[Math.floor(Math.random() * names.length)];
        window.location.href = `profile.html?character=${char.name}&loadout=${loadName}`;
    } catch (err) {
        console.error(err);
    }
}

loadInfo();