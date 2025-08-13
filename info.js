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
        section.appendChild(h);
        if (sec.id === 'stats') {
            const table = document.createElement('table');
            table.className = 'stats-table';
            const stats = [
                { name: 'Strength', file: 'strength.png', desc: 'Increases physical power and physical damage-dealing potential.' },
                { name: 'Dexterity', file: 'dexterity.png', desc: 'Improves agility and reflexes. Useful for delicate tools as well.' },
                { name: 'Constitution', file: 'constitution.png', desc: 'Represents the amount of Health one has.' },
                { name: 'Endurance', file: 'endurance.png', desc: 'Stamina reserves and Lifespan/longevity.' },
                { name: 'Intelligence', file: 'intelligence.png', desc: 'Determines Intellect and reasoning. Also governs magical and mental abilities.' },
                { name: 'Charisma', file: 'charisma.png', desc: 'Influences persuasion and charm. Represents physical attractiveness and verbal influence.' },
                { name: 'Fortitude', file: 'fortitude.png', desc: 'Enhances resistance to damage. Affects resistance to the elements, toxins, crippling conditions, etc. Governs physical defense rating.' }
            ];
            stats.forEach(s => {
                const row = document.createElement('tr');
                const iconTd = document.createElement('td');
                const img = document.createElement('img');
                img.src = `resources/ui/${s.file}`;
                img.alt = s.name;
                iconTd.appendChild(img);
                const descTd = document.createElement('td');
                descTd.textContent = s.desc;
                row.appendChild(iconTd);
                row.appendChild(descTd);
                table.appendChild(row);
            });
            section.appendChild(table);
        } else {
            const p = document.createElement('p');
            p.textContent = sec.content;
            section.appendChild(p);
        }
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
            if (sec.id === 'stats') return;
            const p = sec.querySelector('p');
            const ta = document.createElement('textarea');
            ta.value = p.textContent;
            sec.replaceChild(ta, p);
        });
    } else {
        editBtn.textContent = 'Edit';
        const newSections = [];
        sections.forEach(sec => {
            if (sec.id === 'stats') {
                const id = sec.id;
                const title = sec.querySelector('h2').textContent;
                newSections.push({ id, title, content: '' });
                return;
            }
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

document.getElementById('map-btn').addEventListener('click', async () => {
    const character = localStorage.getItem('currentCharacter');
    if (!character) {
        alert('Please select a character first.');
        return;
    }
    await window.electron.prepareMapCharacter(character);
    window.location.href = `map.html?character=${encodeURIComponent(character)}`;
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
        const url = loadName === 'default'
                        ? `profile.html?character=${char.name}`
                        : `profile.html?character=${char.name}&loadout=${loadName}`;
        localStorage.setItem('currentCharacter', char.name);
        window.location.href = url;
    } catch (err) {
        console.error(err);
    }
}

loadInfo();