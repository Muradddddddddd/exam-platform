/* ==================== FIREBASE FUNCTIONS ==================== */

// Получить все предметы
function getSubjects(callback) {
  const ref = firebase.database().ref('subjects');
  ref.once('value').then(snapshot => {
    const subjects = snapshot.val() || [];
    callback(subjects);
  }).catch(error => {
    console.error('Error getting subjects:', error);
    callback([]);
  });
}

// Сохранить предметы
function saveSubjects(subjects, callback) {
  firebase.database().ref('subjects').set(subjects)
    .then(() => {
      if (callback) callback();
    })
    .catch(error => {
      console.error('Error saving subjects:', error);
    });
}

// Получить все экзаменационные работы
function getWorks(callback) {
  const ref = firebase.database().ref('examWorks');
  ref.once('value').then(snapshot => {
    const works = snapshot.val() || [];
    callback(works);
  }).catch(error => {
    console.error('Error getting works:', error);
    callback([]);
  });
}

// Сохранить экзаменационные работы
function saveWorks(works, callback) {
  firebase.database().ref('examWorks').set(works)
    .then(() => {
      if (callback) callback();
    })
    .catch(error => {
      console.error('Error saving works:', error);
    });
}

// Реальное время - слушаем изменения в данных
function listenForSubjectsChanges(callback) {
  firebase.database().ref('subjects').on('value', (snapshot) => {
    callback(snapshot.val() || []);
  });
}

function listenForWorksChanges(callback) {
  firebase.database().ref('examWorks').on('value', (snapshot) => {
    callback(snapshot.val() || []);
  });
}

/* ==================== ADMIN FUNCTIONS ==================== */

function renderSubjectsAdmin() {
  const container = document.getElementById('subjectsContainer');
  const adminSelect = document.getElementById('adminSubjectSelect');
  if (!container || !adminSelect) return;
  
  getSubjects((subjects) => {
    container.innerHTML = '';
    adminSelect.innerHTML = '';

    if (subjects.length === 0) {
      container.innerHTML = '<p>Пока нет предметов. Добавьте предмет выше.</p>';
      adminSelect.innerHTML = '<option value="">--нет предметов--</option>';
      return;
    }

    subjects.forEach((subject, sIndex) => {
      // select option
      const opt = document.createElement('option');
      opt.value = sIndex;
      opt.textContent = subject.name;
      adminSelect.appendChild(opt);

      // card with questions
      const card = document.createElement('div');
      card.classList.add('work-card');
      const qListHtml = subject.questions && subject.questions.length
        ? subject.questions.map((q, qIndex) => `<li>${escapeHtml(q)} <button data-sub="${sIndex}" data-q="${qIndex}" class="del-question">Удалить</button></li>`).join('')
        : '<li><em>Вопросы не добавлены</em></li>';

      card.innerHTML = `
        <h4>${escapeHtml(subject.name)} <button data-sub="${sIndex}" class="del-subject">Удалить предмет</button></h4>
        <ul>${qListHtml}</ul>
      `;
      container.appendChild(card);
    });

    // attach listeners
    container.querySelectorAll('.del-subject').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.target.dataset.sub);
        if (!confirm('Удалить предмет и все его вопросы?')) return;
        
        getSubjects((subs) => {
          subs.splice(idx, 1);
          saveSubjects(subs, () => {
            renderSubjectsAdmin();
          });
        });
      });
    });

    container.querySelectorAll('.del-question').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sidx = Number(e.target.dataset.sub);
        const qidx = Number(e.target.dataset.q);
        if (!confirm('Удалить вопрос?')) return;
        
        getSubjects((subs) => {
          subs[sidx].questions.splice(qidx, 1);
          saveSubjects(subs, () => {
            renderSubjectsAdmin();
          });
        });
      });
    });
  });
}

// Subject Form
const subjectForm = document.getElementById('subjectForm');
if (subjectForm) {
  subjectForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameEl = document.getElementById('newSubjectName');
    const name = nameEl.value.trim();
    if (!name) return alert('Введите название предмета');
    
    getSubjects((subjects) => {
      if (subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) {
        return alert('Такой предмет уже существует');
      }
      subjects.push({ name, questions: [] });
      saveSubjects(subjects, () => {
        nameEl.value = '';
        renderSubjectsAdmin();
      });
    });
  });
}

// Question to Subject Form
const questionToSubjectForm = document.getElementById('questionToSubjectForm');
if (questionToSubjectForm) {
  questionToSubjectForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const sel = document.getElementById('adminSubjectSelect');
    const qText = document.getElementById('adminNewQuestion').value.trim();
    if (sel.value === '') return alert('Выберите предмет');
    if (!qText) return alert('Введите текст вопроса');
    
    const idx = Number(sel.value);
    getSubjects((subjects) => {
      if (!subjects[idx].questions) {
        subjects[idx].questions = [];
      }
      subjects[idx].questions.push(qText);
      saveSubjects(subjects, () => {
        document.getElementById('adminNewQuestion').value = '';
        renderSubjectsAdmin();
      });
    });
  });
}

/* ==================== ADMIN STUDENTS TABLE ==================== */

function renderStudentsAdminTable() {
  const tbody = document.getElementById('studentsTableBody');
  if (!tbody) return;

  getWorks((works) => {
    const filterSelect = document.getElementById("adminInstituteFilter");
    const selectedInstitute = filterSelect ? filterSelect.value : "";

    tbody.innerHTML = '';

    const filteredWorks = selectedInstitute
      ? works.filter(w => w.institute === selectedInstitute)
      : works;

    filteredWorks.forEach((w, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="student-checkbox" data-index="${index}"></td>
        <td>${escapeHtml(w.fio || '')}</td>
        <td>${escapeHtml(w.group || '')}</td>
        <td>${escapeHtml(w.institute || '')}</td>
        <td>${escapeHtml(w.discipline || '')}</td>
        <td>${w.grade !== null && w.grade !== undefined ? escapeHtml(String(w.grade)) : (w.submitted ? 'Кафедра' : 'В работе')}</td>
      `;
      tbody.appendChild(tr);
    });

    // Select All handler
    const selectAll = document.getElementById('selectAllStudents');
    if (selectAll) {
      selectAll.replaceWith(selectAll.cloneNode(true));
      const newSelectAll = document.getElementById('selectAllStudents');
      if (newSelectAll) {
        newSelectAll.checked = false;
        newSelectAll.addEventListener('change', () => {
          document.querySelectorAll('.student-checkbox').forEach(cb => cb.checked = newSelectAll.checked);
        });
      }
    }
  });
}

function deleteSelectedStudents() {
  const checkboxes = document.querySelectorAll('.student-checkbox:checked');
  if (checkboxes.length === 0) return alert('Выберите студентов для удаления');

  if (!confirm(`Удалить ${checkboxes.length} выбранных студентов?`)) return;

  getWorks((works) => {
    const indexes = Array.from(checkboxes)
      .map(cb => Number(cb.dataset.index))
      .sort((a, b) => b - a);

    indexes.forEach(i => works.splice(i, 1));
    
    saveWorks(works, () => {
      renderStudentsAdminTable();
    });
  });
}

// Delete button handler
const deleteBtn = document.getElementById('deleteSelectedStudents');
if (deleteBtn) {
  deleteBtn.replaceWith(deleteBtn.cloneNode(true));
  const newDeleteBtn = document.getElementById('deleteSelectedStudents');
  if (newDeleteBtn) newDeleteBtn.addEventListener('click', deleteSelectedStudents);
}

/* ==================== STUDENT FUNCTIONS ==================== */

if (document.getElementById('studentForm')) {
  document.addEventListener('DOMContentLoaded', () => {
    populateSubjectSelectForStudent();
  });

  const studentFormEl = document.getElementById('studentForm');
  studentFormEl.addEventListener('submit', (e) => {
    e.preventDefault();
  
    const fio = document.getElementById('fio').value.trim();
    const group = document.getElementById('group').value.trim();
    const institute = document.getElementById('institute').value;
    const subjectIndex = document.getElementById('subjectSelect').value;
  
    if (!fio || !group || !institute || subjectIndex === '') {
      return alert('Заполните все поля');
    }
  
    getSubjects((subjects) => {
      const subj = subjects[Number(subjectIndex)];
      if (!subj || !subj.questions || subj.questions.length < 2) {
        return alert('Для выбранного предмета должно быть как минимум 2 вопроса (попросите админа добавить вопросы).');
      }
  
      // выбрать 2 случайных уникальных вопроса
      const qIndices = getRandomIndices(subj.questions.length, 2);
      const selectedQuestions = qIndices.map(i => subj.questions[i]);
  
      // сохраняем текущий экзамен
      const tempExam = {
        id: Date.now() + '-' + Math.floor(Math.random()*10000),
        fio,
        group,
        institute,
        discipline: subj.name,
        questions: selectedQuestions,
        answers: ['', ''],
        startedAt: Date.now(),
        submitted: false,
        grade: null,
        comment: ''
      };
  
      sessionStorage.setItem('currentExam', JSON.stringify(tempExam));
  
      // показываем блок экзамена
      document.getElementById('studentEntrySection').classList.add('hidden');
      document.getElementById('examSection').classList.remove('hidden');
  
      renderExamQuestions(tempExam);
      startTimerForStudent(3600);
      enableAntiCheatForStudent();
    });
  });
  
  // отправка ответов
  document.getElementById('submitAnswersBtn').addEventListener('click', () => {
    const cur = JSON.parse(sessionStorage.getItem('currentExam'));
    if (!cur) return alert('Экзамен не найден (обновите страницу и начните снова)');
    
    // собрать ответы
    const answers = [];
    for (let i = 0; i < cur.questions.length; i++) {
      const val = document.getElementById(`answer-${i}`).value.trim();
      answers.push(val);
    }
    cur.answers = answers;
    cur.submitted = true;
    cur.submittedAt = Date.now();
    
    // сохранить в Firebase
    getWorks((works) => {
      works.push(cur);
      saveWorks(works, () => {
        sessionStorage.removeItem('currentExam');
        finishExamForStudent('Ответы отправлены. Спасибо!');
      });
    });
  });
}

function populateSubjectSelectForStudent() {
  const sel = document.getElementById('subjectSelect');
  if (!sel) return;
  
  getSubjects((subjects) => {
    sel.innerHTML = '';
    if (subjects.length === 0) {
      sel.innerHTML = '<option value="">--нет предметов--</option>';
      return;
    }
    subjects.forEach((s, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = s.name;
      sel.appendChild(opt);
    });
  });
}

function renderExamQuestions(examObj) {
  const container = document.getElementById('questionsContainer');
  container.innerHTML = '';
  examObj.questions.forEach((q, idx) => {
    const div = document.createElement('div');
    div.classList.add('work-card');
    div.innerHTML = `
      <p><b>Вопрос ${idx+1}:</b> ${escapeHtml(q)}</p>
      <textarea id="answer-${idx}" rows="6" placeholder="Ваш ответ..."></textarea>
    `;
    container.appendChild(div);
  });
}

/* ==================== STUDENT TIMER ==================== */

let studentTimerInterval;
let studentTimeLeft;

function startTimerForStudent(seconds) {
  studentTimeLeft = seconds;
  updateTimerDisplay();
  studentTimerInterval = setInterval(() => {
    studentTimeLeft--;
    updateTimerDisplay();
    if (studentTimeLeft <= 0) {
      clearInterval(studentTimerInterval);
      autoSubmitOnTimeEnd();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById('timer');
  if (!el) return;
  const mins = Math.floor(studentTimeLeft / 60);
  const secs = studentTimeLeft % 60;
  el.textContent = `${mins}:${String(secs).padStart(2,'0')}`;
}

function finishExamForStudent(message) {
  clearInterval(studentTimerInterval);
  document.getElementById('examMessage').textContent = message;
  document.getElementById('examMessage').classList.remove('hidden');
  const ta = document.querySelectorAll('#questionsContainer textarea');
  ta.forEach(t => t.disabled = true);
  document.getElementById('submitAnswersBtn').disabled = true;
}

function autoSubmitOnTimeEnd() {
  const cur = JSON.parse(sessionStorage.getItem('currentExam'));
  if (!cur) {
    finishExamForStudent('Время вышло. Экзамен завершён.');
    return;
  }
  
  const answers = [];
  for (let i = 0; i < cur.questions.length; i++) {
    const val = document.getElementById(`answer-${i}`) ? document.getElementById(`answer-${i}`).value.trim() : '';
    answers.push(val);
  }
  cur.answers = answers;
  cur.submitted = true;
  cur.submittedAt = Date.now();
  
  getWorks((works) => {
    works.push(cur);
    saveWorks(works, () => {
      sessionStorage.removeItem('currentExam');
      finishExamForStudent('Время вышло. Ответы автоматически отправлены.');
    });
  });
}

function enableAntiCheatForStudent() {
  document.addEventListener('visibilitychange', () => {
    const cur = JSON.parse(sessionStorage.getItem('currentExam'));
    if (!cur) return;
    if (document.hidden) {
      cur.answers = cur.questions.map(() => '--- Нарушение (вкладка скрыта) ---');
      cur.submitted = true;
      cur.submittedAt = Date.now();
      cur.grade = 0;
      cur.comment = 'Авто: нарушение (вкладка скрыта)';
      
      getWorks((works) => {
        works.push(cur);
        saveWorks(works, () => {
          sessionStorage.removeItem('currentExam');
          finishExamForStudent('Вы нарушили правила! Экзамен завершён и помечен как нарушенный.');
        });
      });
    }
  });
}

/* ==================== REVIEWER FUNCTIONS ==================== */

function renderWorksForReviewer() {
  const container = document.getElementById("worksContainer");
  if (!container) return;

  getWorks((works) => {
    const filterSelect = document.getElementById("reviewerInstituteFilter");
    const selectedInstitute = filterSelect ? filterSelect.value : "";

    container.innerHTML = "";

    const filteredWorks = selectedInstitute
      ? works.filter(w => w.institute === selectedInstitute)
      : works;

    if (!filteredWorks || filteredWorks.length === 0) {
      container.innerHTML = "<p>❌ Нет сданных экзаменов для выбранного института.</p>";
      renderReportTable();
      return;
    }

    filteredWorks.forEach((work, index) => {
      const fioHidden = "<i>(ФИО скрыто)</i>";
      const questions = Array.isArray(work.questions) ? work.questions : [];
      const qaHTML = questions.map((q, i) => {
        const answer = work.answers && work.answers[i] ? escapeHtml(work.answers[i]) : "<em>Ответ не дан</em>";
        return `
          <div class="qa-block">
            <p><b>Вопрос ${i + 1}:</b> ${escapeHtml(q)}</p>
            <p><b>Ответ:</b><br>${answer}</p>
          </div>
        `;
      }).join("<hr>");

      const card = document.createElement("div");
      card.classList.add("work-card");
      card.innerHTML = `
        <p><b>Институт:</b> ${escapeHtml(work.institute || "")}</p>
        <p><b>Группа:</b> ${escapeHtml(work.group || "")}</p>
        <p><b>Дисциплина:</b> ${escapeHtml(work.discipline || "")}</p>
        <p><b>Студент:</b> ${fioHidden}</p>
        <hr>
        ${qaHTML}
        <hr>
        <label>Оценка: 
          <input type="number" id="grade-${index}" min="0" max="10" value="${work.grade ?? ""}" style="width: 80px;">
        </label><br><br>
        <label>Комментарий:<br>
          <textarea id="comment-${index}" rows="3">${work.comment ?? ""}</textarea>
        </label><br><br>
        <button class="start-btn" onclick="saveGrade(${index})">💾 Сохранить оценку</button>
      `;
      container.appendChild(card);
    });

    renderReportTable();
  });
}

function saveGrade(index) {
  getWorks((works) => {
    if (!works[index]) return alert("❌ Работа не найдена!");

    const gradeInput = document.getElementById(`grade-${index}`);
    const commentInput = document.getElementById(`comment-${index}`);

    works[index].grade = gradeInput.value || null;
    works[index].comment = commentInput.value || "";

    saveWorks(works, () => {
      alert("✅ Оценка сохранена!");
      renderReportTable();
    });
  });
}

function renderReportTable() {
  const tbody = document.querySelector("#reportTable tbody");
  if (!tbody) return;

  getWorks((works) => {
    tbody.innerHTML = "";

    works.forEach((work) => {
      if (work.grade !== null && work.grade !== undefined && work.grade !== "") {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${escapeHtml(work.institute || "")}</td>
          <td>${escapeHtml(work.group || "")}</td>
          <td>${escapeHtml(work.discipline || "")}</td>
          <td>${escapeHtml(String(work.grade))}</td>
          <td>${escapeHtml(work.comment || "")}</td>
        `;
        tbody.appendChild(row);
      }
    });
  });
}

/* ==================== INITIALIZATION ==================== */

document.addEventListener('DOMContentLoaded', () => {
  // Admin
  if (document.getElementById('subjectsContainer')) {
    renderSubjectsAdmin();
    renderStudentsAdminTable();
    
    const adminFilter = document.getElementById("adminInstituteFilter");
    if (adminFilter) {
      adminFilter.addEventListener("change", renderStudentsAdminTable);
    }

    // Real-time updates for admin
    listenForSubjectsChanges(() => {
      renderSubjectsAdmin();
    });
    
    listenForWorksChanges(() => {
      renderStudentsAdminTable();
    });
  }

  // Student
  if (document.getElementById('studentForm')) {
    populateSubjectSelectForStudent();
  
    const current = JSON.parse(sessionStorage.getItem('currentExam'));
    if (current) {
      document.getElementById('studentEntrySection').classList.add('hidden');
      document.getElementById('examSection').classList.remove('hidden');
  
      renderExamQuestions(current);
  
      const elapsed = Math.floor((Date.now() - current.startedAt) / 1000);
      const remaining = Math.max(0, 3600 - elapsed);
      startTimerForStudent(remaining);
  
      enableAntiCheatForStudent();
    }

    // Real-time updates for subjects
    listenForSubjectsChanges(() => {
      populateSubjectSelectForStudent();
    });
  }
  
  // Reviewer
  if (document.getElementById('worksContainer')) {
    renderWorksForReviewer();
    
    const reviewerFilter = document.getElementById("reviewerInstituteFilter");
    if (reviewerFilter) {
      reviewerFilter.addEventListener("change", () => {
        renderWorksForReviewer();
      });
    }

    // Real-time updates for reviewer
    listenForWorksChanges(() => {
      renderWorksForReviewer();
    });
  }
});

/* ==================== UTILITIES ==================== */

function getRandomIndices(max, count) {
  const res = new Set();
  while (res.size < count) {
    res.add(Math.floor(Math.random() * max));
  }
  return Array.from(res);
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function downloadAdminReport() {
  getWorks((works) => {
    if (!works || works.length === 0) {
      return alert('Нет данных для отчета');
    }

    const headers = ['ФИО', 'Группа', 'Институт', 'Дисциплина', 'Статус', 'Оценка'];
    
    const data = works.map(work => {
      const status = work.submitted
        ? (work.grade !== null && work.grade !== undefined && work.grade !== '' ? work.grade : 'Сдано')
        : 'В работе';
      
      return [
        work.fio ?? '',
        work.group ?? '',
        work.institute ?? '',
        work.discipline ?? '',
        status,
        work.grade ?? ''
      ];
    });

    data.unshift(headers);

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Отчёт");
    XLSX.writeFile(wb, "admin_exam_report.xlsx");
  });
}