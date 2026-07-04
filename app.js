document.addEventListener('DOMContentLoaded', () => {
  // --- Navigation Logic ---
  const navLinks = document.querySelectorAll('.nav-btn, nav a');
  const sections = document.querySelectorAll('main section');

  function navigateTo(targetId) {
    document.querySelectorAll('nav a').forEach(a => {
      if(a.dataset.target === targetId) a.classList.add('active');
      else a.classList.remove('active');
    });

    sections.forEach(sec => {
      if(sec.id === targetId) sec.classList.add('active');
      else sec.classList.remove('active');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.target;
      if(target) navigateTo(target);
    });
  });

  // --- Metronome Logic ---
  let bpm = 120;
  let isPlaying = false;
  let timerID;
  let nextNoteTime = 0.0;
  
  // Advanced State
  let currentBeat = 0;
  let currentSubdivision = 0;
  let measureCount = 0;
  
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const bpmValue = document.getElementById('bpm-value');
  const bpmSlider = document.getElementById('bpm-slider');
  const btnMinus10 = document.getElementById('bpm-minus-10');
  const btnMinus = document.getElementById('bpm-minus');
  const btnPlus = document.getElementById('bpm-plus');
  const btnPlus10 = document.getElementById('bpm-plus-10');
  const playBtn = document.getElementById('play-btn');
  
  // New UI Elements
  const tapBtn = document.getElementById('tap-tempo-btn');
  const timeSigSelect = document.getElementById('time-sig');
  const subDivSelect = document.getElementById('subdivision');
  const visualPulse = document.getElementById('visual-pulse');
  const trainerToggle = document.getElementById('trainer-toggle');
  const trainerTarget = document.getElementById('trainer-target');
  const trainerMeasures = document.getElementById('trainer-measures');

  let tapTimes = [];

  function updateBPMDisplay() {
    bpmValue.textContent = bpm;
    bpmSlider.value = bpm;
  }

  bpmSlider.addEventListener('input', (e) => {
    bpm = parseInt(e.target.value);
    updateBPMDisplay();
  });

  btnMinus10.addEventListener('click', () => { bpm = Math.max(40, bpm - 10); updateBPMDisplay(); });
  btnMinus.addEventListener('click', () => { if(bpm > 40) bpm--; updateBPMDisplay(); });
  btnPlus.addEventListener('click', () => { if(bpm < 240) bpm++; updateBPMDisplay(); });
  btnPlus10.addEventListener('click', () => { bpm = Math.min(240, bpm + 10); updateBPMDisplay(); });

  // Tap Tempo Logic
  tapBtn.addEventListener('click', () => {
    const now = performance.now();
    tapTimes.push(now);
    if (tapTimes.length > 5) tapTimes.shift();
    
    if (tapTimes.length >= 2) {
      let sum = 0;
      for (let i = 1; i < tapTimes.length; i++) {
        sum += (tapTimes[i] - tapTimes[i-1]);
      }
      const avgMs = sum / (tapTimes.length - 1);
      const calculatedBpm = Math.round(60000 / avgMs);
      if (calculatedBpm >= 40 && calculatedBpm <= 240) {
        bpm = calculatedBpm;
        updateBPMDisplay();
      } else {
        tapTimes = [now]; // Reset if too slow
      }
    }
  });

  function scheduleNote() {
    while (nextNoteTime < audioContext.currentTime + 0.1) {
      const timeSig = parseInt(timeSigSelect.value);
      const subDivs = parseInt(subDivSelect.value); // 1=quarter, 2=eighth, 3=triplet, 4=sixteenth
      
      const osc = audioContext.createOscillator();
      const envelope = audioContext.createGain();
      
      if (currentSubdivision === 0) {
        if (currentBeat === 0) {
          osc.frequency.value = 1200; // Downbeat
        } else {
          osc.frequency.value = 800; // Normal beat
        }
        
        // Trigger Visual Pulse on Main Beats
        const timeToPlay = Math.max(0, nextNoteTime - audioContext.currentTime);
        setTimeout(() => {
          visualPulse.classList.remove('pulse-anim');
          void visualPulse.offsetWidth; // trigger reflow
          visualPulse.classList.add('pulse-anim');
        }, timeToPlay * 1000);

      } else {
        osc.frequency.value = 400; // Subdivisions
      }
      
      envelope.gain.setValueAtTime(1, nextNoteTime);
      envelope.gain.exponentialRampToValueAtTime(0.001, nextNoteTime + 0.05);
      
      osc.connect(envelope);
      envelope.connect(audioContext.destination);
      
      osc.start(nextNoteTime);
      osc.stop(nextNoteTime + 0.05);
      
      // Calculate next time
      const secondsPerBeat = 60.0 / bpm;
      nextNoteTime += (secondsPerBeat / subDivs);
      
      // Advance counters
      currentSubdivision++;
      if (currentSubdivision >= subDivs) {
        currentSubdivision = 0;
        currentBeat++;
        
        if (currentBeat >= timeSig) {
          currentBeat = 0;
          measureCount++;
          
          // Speed Trainer Logic
          if (trainerToggle.checked) {
            const targetBpm = parseInt(trainerTarget.value);
            const measuresToWait = parseInt(trainerMeasures.value);
            
            if (measureCount >= measuresToWait) {
              measureCount = 0;
              if (bpm < targetBpm) {
                bpm = Math.min(bpm + 2, targetBpm);
                updateBPMDisplay();
              }
            }
          }
        }
      }
    }
    timerID = setTimeout(scheduleNote, 25.0);
  }

  playBtn.addEventListener('click', () => {
    if(!isPlaying) {
      if (audioContext.state === 'suspended') audioContext.resume();
      isPlaying = true;
      currentBeat = 0;
      currentSubdivision = 0;
      measureCount = 0;
      nextNoteTime = audioContext.currentTime + 0.05;
      scheduleNote();
      playBtn.classList.add('playing');
      playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    } else {
      isPlaying = false;
      clearTimeout(timerID);
      playBtn.classList.remove('playing');
      playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    }
  });

  // --- Charts Logic ---
  const scaleData = {
    "bb-major-1": [
      { n: "Low Bb", e: "0", t: "1st" }, { n: "C", e: "4", t: "6th" },
      { n: "D", e: "1-2", t: "4th" }, { n: "Eb", e: "1", t: "3rd" },
      { n: "F", e: "0", t: "1st" }, { n: "G", e: "1-2", t: "4th" },
      { n: "A", e: "2", t: "2nd" }, { n: "Bb", e: "0", t: "1st" }
    ],
    "bb-major-2": [
      { n: "Low Bb", e: "0", t: "1st" }, { n: "C", e: "4", t: "6th" },
      { n: "D", e: "1-2", t: "4th" }, { n: "Eb", e: "1", t: "3rd" },
      { n: "F", e: "0", t: "1st" }, { n: "G", e: "1-2", t: "4th" },
      { n: "A", e: "2", t: "2nd" }, { n: "Bb", e: "0", t: "1st" },
      { n: "High C", e: "1", t: "3rd" }, { n: "High D", e: "1-2", t: "1st" },
      { n: "High Eb", e: "2", t: "3rd" }, { n: "High F", e: "0", t: "1st" },
      { n: "High G", e: "1-2", t: "2nd" }, { n: "High A", e: "2", t: "2nd" },
      { n: "Top Bb", e: "0", t: "1st" }
    ],
    "f-major-1": [
      { n: "Low F", e: "0", t: "1st" }, { n: "G", e: "1-2", t: "4th" },
      { n: "A", e: "2", t: "2nd" }, { n: "Bb", e: "0", t: "1st" },
      { n: "C", e: "1", t: "3rd" }, { n: "D", e: "1-2", t: "1st" },
      { n: "E", e: "2", t: "2nd" }, { n: "High F", e: "0", t: "1st" }
    ],
    "eb-major-1": [
      { n: "Low Eb", e: "1", t: "3rd" }, { n: "F", e: "0", t: "1st" },
      { n: "G", e: "1-2", t: "4th" }, { n: "Ab", e: "1", t: "3rd" },
      { n: "Bb", e: "0", t: "1st" }, { n: "C", e: "1", t: "3rd" },
      { n: "D", e: "1-2", t: "1st" }, { n: "High Eb", e: "2", t: "3rd" }
    ],
    "bb-blues": [
      { n: "Bb", e: "0", t: "1st" }, { n: "Db", e: "1-2-3", t: "5th" },
      { n: "Eb", e: "1", t: "3rd" }, { n: "E (Nat)", e: "2", t: "2nd" },
      { n: "F", e: "0", t: "1st" }, { n: "Ab", e: "1", t: "3rd" },
      { n: "High Bb", e: "0", t: "1st" }
    ],
    "bb-pentatonic": [
      { n: "Bb", e: "0", t: "1st" }, { n: "Db", e: "1-2-3", t: "5th" },
      { n: "Eb", e: "1", t: "3rd" }, { n: "F", e: "0", t: "1st" },
      { n: "Ab", e: "1", t: "3rd" }, { n: "High Bb", e: "0", t: "1st" }
    ]
  };

  const scaleSelector = document.getElementById('scale-selector');

  function renderCharts(scaleKey) {
    const data = scaleData[scaleKey];
    const combinedTbody = document.getElementById('combined-tbody');
    
    combinedTbody.innerHTML = '';

    data.forEach(note => {
      combinedTbody.innerHTML += `<tr>
        <td><strong>${note.n}</strong></td>
        <td>${note.e}</td>
        <td><span class="slide-pos">${note.t}</span></td>
      </tr>`;
    });
  }

  scaleSelector.addEventListener('change', (e) => renderCharts(e.target.value));
  renderCharts('bb-major-1'); // init

  // --- Sight Reading Logic ---
  const libraryData = [
    { id: 'sr1', title: 'Basic Quarter Notes', diff: 'beginner', img: 'sheet-music.jpg', label: 'Beginner' },
    { id: 'sr4', title: 'Easy Swing (Jazz)', diff: 'beginner', img: 'sheet-music-beginner-jazz-1.jpg', label: 'Beginner Jazz' },
    { id: 'sr5', title: '12-Bar Blues Bassline', diff: 'beginner', img: 'sheet-music-beginner-jazz-2.jpg', label: 'Beginner Jazz' },
    { id: 'sr2', title: 'Melodic Etude (F Minor)', diff: 'intermediate', img: 'sheet-music-intermediate.jpg', label: 'Intermediate' },
    { id: 'sr3', title: 'Night in Tunisia', diff: 'advanced', img: 'sheet-music-advanced.jpg', label: 'Advanced Jazz' }
  ];

  const libraryGrid = document.getElementById('library-grid');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const smDisplay = document.getElementById('sheet-music-display');
  const smImg = document.getElementById('music-image');
  const closeBtn = document.getElementById('close-music-btn');

  function renderLibrary(filter = 'all') {
    libraryGrid.innerHTML = '';
    libraryData.forEach(item => {
      if (filter === 'all' || item.diff === filter) {
        const div = document.createElement('div');
        div.className = 'library-item';
        div.innerHTML = `
          <img src="${item.img}" alt="${item.title}">
          <h4>${item.title}</h4>
          <span>${item.label}</span>
        `;
        div.addEventListener('click', () => {
          smImg.src = item.img;
          smDisplay.style.display = 'flex';
          smDisplay.scrollIntoView({ behavior: 'smooth' });
        });
        libraryGrid.appendChild(div);
      }
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderLibrary(btn.dataset.filter);
    });
  });

  closeBtn.addEventListener('click', () => {
    smDisplay.style.display = 'none';
  });

  renderLibrary();

  // Upload Logic
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('file-input');

  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault(); uploadArea.classList.remove('dragover');
    if(e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => {
    if(e.target.files.length) handleFile(e.target.files[0]);
  });

  function handleFile(file) {
    if(file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        smImg.src = e.target.result;
        smDisplay.style.display = 'flex';
        smDisplay.scrollIntoView({ behavior: 'smooth' });
      };
      reader.readAsDataURL(file);
    }
  }

  // --- Lessons / Practice Plan Logic ---
  const modules = [
    {
      id: 1, title: "Module 1: Trombone Basics & Air Support",
      desc: "Let's get started with the fundamentals of your new instrument and keeping your air steady.",
      tasks: [
        { id: "m1-t1", time: "10 mins", title: "Breathing & Long Tones", desc: "Start with deep breaths. Play low Bb for 8 slow beats. Keep it steady." },
        { id: "m1-t2", time: "10 mins", title: "Lip Slurs (Bb to F)", desc: "Slur from Bb to F in 1st position (or 0 valves). Focus on smooth transitions." },
        { id: "m1-t3", time: "15 mins", title: "Bb Major Scale (1 Octave)", desc: "Use the metronome at 80 BPM. Play up and down the Concert Bb scale." },
        { id: "m1-t4", time: "20 mins", title: "Beginner Sight-Reading", desc: "Pick a beginner piece from the library and read through it slowly." }
      ]
    },
    {
      id: 2, title: "Module 2: Jazz Rhythms & Blues",
      desc: "Time to get that swing feel going and learn your first blues scale.",
      tasks: [
        { id: "m2-t1", time: "10 mins", title: "Dynamic Long Tones", desc: "Play a note, start quiet, swell to loud, and fade to quiet over 8 beats." },
        { id: "m2-t2", time: "15 mins", title: "The Bb Blues Scale", desc: "Select the Bb Blues scale in the charts. Memorize these notes. They are the secret to jazz!" },
        { id: "m2-t3", time: "15 mins", title: "Intermediate Sight-Reading", desc: "Try reading a piece with syncopated rhythms (eighth notes that are off-beat)." },
        { id: "m2-t4", time: "20 mins", title: "Jazz Band Prep", desc: "Work on your actual jazz band sheet music. Focus on the articulation (accents and staccatos)." }
      ]
    },
    {
      id: 3, title: "Module 3: Mastery & Improvisation",
      desc: "You are a brass virtuoso now! Time to experiment.",
      tasks: [
        { id: "m3-t1", time: "15 mins", title: "Extended Range", desc: "Push your highest note just a half step higher today." },
        { id: "m3-t2", time: "15 mins", title: "Bb Minor Pentatonic", desc: "Practice the pentatonic scale. Try mixing up the order of the notes." },
        { id: "m3-t3", time: "30 mins", title: "Improv over a Backing Track", desc: "Play the Pentatonic or Blues scale over a jazz backing track and make up your own melodies!" }
      ]
    }
  ];

  let currentModuleIdx = parseInt(localStorage.getItem('brass_module_idx')) || 0;
  let completedTasks = JSON.parse(localStorage.getItem('brass_completed_tasks')) || [];

  const modTitle = document.getElementById('current-module-title');
  const modDesc = document.getElementById('current-module-desc');
  const taskList = document.getElementById('task-list');
  const progressFill = document.getElementById('module-progress');
  const modStatus = document.getElementById('module-status');
  const completeModBtn = document.getElementById('complete-module-btn');

  function renderModule() {
    if (currentModuleIdx >= modules.length) {
      modTitle.textContent = "🏆 All Modules Completed! 🏆";
      modDesc.textContent = "You are a true Brass Master. Keep practicing your jazz pieces and improvising!";
      taskList.innerHTML = '';
      progressFill.style.width = '100%';
      modStatus.textContent = "Curriculum Finished!";
      completeModBtn.style.display = 'none';
      return;
    }

    const mod = modules[currentModuleIdx];
    modTitle.textContent = mod.title;
    modDesc.textContent = mod.desc;
    taskList.innerHTML = '';

    let localCompletedCount = 0;

    mod.tasks.forEach(t => {
      const isChecked = completedTasks.includes(t.id);
      if (isChecked) localCompletedCount++;

      const div = document.createElement('div');
      div.className = `timeline-item ${isChecked ? 'completed' : ''}`;
      div.innerHTML = `
        <div class="timeline-content">
          <div class="task-checkbox-wrap">
            <input type="checkbox" class="task-checkbox" data-id="${t.id}" ${isChecked ? 'checked' : ''}>
          </div>
          <div class="task-text">
            <div class="time-badge">${t.time}</div>
            <h4>${t.title}</h4>
            <p>${t.desc}</p>
          </div>
        </div>
      `;
      taskList.appendChild(div);
    });

    const percent = Math.round((localCompletedCount / mod.tasks.length) * 100);
    progressFill.style.width = `${percent}%`;
    modStatus.textContent = `${localCompletedCount} / ${mod.tasks.length} Tasks Completed`;

    if (localCompletedCount === mod.tasks.length) {
      completeModBtn.style.display = 'inline-block';
    } else {
      completeModBtn.style.display = 'none';
    }

    // Add listeners to checkboxes
    document.querySelectorAll('.task-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const tId = e.target.dataset.id;
        if (e.target.checked) {
          if (!completedTasks.includes(tId)) completedTasks.push(tId);
        } else {
          completedTasks = completedTasks.filter(id => id !== tId);
        }
        localStorage.setItem('brass_completed_tasks', JSON.stringify(completedTasks));
        renderModule();
      });
    });
  }

  completeModBtn.addEventListener('click', () => {
    currentModuleIdx++;
    localStorage.setItem('brass_module_idx', currentModuleIdx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderModule();
  });

  renderModule();

  // Spacebar mapping to Tap Tempo
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && document.getElementById('metronome').classList.contains('active')) {
      e.preventDefault();
      if (!isPlaying) {
        tapBtn.click();
      } else {
        playBtn.click();
      }
    }
  });
});
