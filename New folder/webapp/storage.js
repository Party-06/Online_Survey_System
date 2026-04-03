// ============================================================
// storage.js  —  Replaces Oracle DB + all DAO/Database classes
// Data is shared between admin.html and index.html via localStorage
// ============================================================

const KEYS = {
  USERS:     'survey_users',
  TOPICS:    'survey_topics',
  QUESTIONS: 'survey_questions',
  ANSWERS:   'survey_answers',
};

function initStorage() {
  if (!localStorage.getItem(KEYS.USERS)) {
    localStorage.setItem(KEYS.USERS, JSON.stringify([
      { uname: 'abc', password: 'abc' },
      { uname: 'def', password: 'd'   },
    ]));
  }
  if (!localStorage.getItem(KEYS.TOPICS)) {
    const now = new Date().toLocaleDateString('en-GB');
    localStorage.setItem(KEYS.TOPICS, JSON.stringify([
      { id: '1001', title: 'Programming Languages', addedon: now, uname: 'abc' },
      { id: '1002', title: 'Web Frameworks',        addedon: now, uname: 'abc' },
    ]));
  }
  if (!localStorage.getItem(KEYS.QUESTIONS)) {
    localStorage.setItem(KEYS.QUESTIONS, JSON.stringify([
      { id:'2000', text:"What is your fav. dynamic Language?",       opt1:'Javascript', opt2:'Ruby',        opt3:'Python', topicid:'1001' },
      { id:'2001', text:"What is your primary tool for writing code?",opt1:'IDE',        opt2:'Text Editor', opt3:'Both',   topicid:'1001' },
      { id:'2002', text:"Which MVC framework do you use?",           opt1:'JSF',        opt2:'Struts',      opt3:'Spring', topicid:'1002' },
      { id:'2003', text:"Which Javascript library do you use?",      opt1:'JQuery',     opt2:'GWT',         opt3:'Others', topicid:'1002' },
    ]));
  }
  if (!localStorage.getItem(KEYS.ANSWERS)) {
    localStorage.setItem(KEYS.ANSWERS, JSON.stringify([]));
  }
}

// ---- UserDAO (replaces UserDAO.java) ----
const UserDAO = {
  login(uname, password) {
    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    return users.some(u => u.uname === uname && u.password === password);
  },
};

// ---- TopicDAO (replaces TopicDAO.java – admin parts) ----
const TopicDAO = {
  getAll() {
    return JSON.parse(localStorage.getItem(KEYS.TOPICS) || '[]')
      .sort((a, b) => a.title.localeCompare(b.title));
  },
  add(title, uname) {
    const topics = JSON.parse(localStorage.getItem(KEYS.TOPICS) || '[]');
    topics.push({ id: String(Date.now()), title, addedon: new Date().toLocaleDateString('en-GB'), uname });
    localStorage.setItem(KEYS.TOPICS, JSON.stringify(topics));
    return true;
  },
  delete(topicid) {
    let topics = JSON.parse(localStorage.getItem(KEYS.TOPICS) || '[]');
    localStorage.setItem(KEYS.TOPICS, JSON.stringify(topics.filter(t => t.id !== topicid)));
    // cascade-delete questions
    let qs = JSON.parse(localStorage.getItem(KEYS.QUESTIONS) || '[]');
    localStorage.setItem(KEYS.QUESTIONS, JSON.stringify(qs.filter(q => q.topicid !== topicid)));
    return true;
  },
};

// ---- QuestionDAO ----
const QuestionDAO = {
  getByTopic(topicid) {
    return JSON.parse(localStorage.getItem(KEYS.QUESTIONS) || '[]')
      .filter(q => q.topicid === topicid);
  },
  add(text, opt1, opt2, opt3, topicid) {
    const qs = JSON.parse(localStorage.getItem(KEYS.QUESTIONS) || '[]');
    qs.push({ id: String(Date.now()), text, opt1, opt2, opt3, topicid });
    localStorage.setItem(KEYS.QUESTIONS, JSON.stringify(qs));
    return true;
  },
  delete(questionid) {
    let qs = JSON.parse(localStorage.getItem(KEYS.QUESTIONS) || '[]');
    localStorage.setItem(KEYS.QUESTIONS, JSON.stringify(qs.filter(q => q.id !== questionid)));
    return true;
  },
};

// ---- AnswerDAO (replaces storeSurveyResults + getSurveyResults) ----
const AnswerDAO = {
  getAll() { return JSON.parse(localStorage.getItem(KEYS.ANSWERS) || '[]'); },
  getCount(topicid) { return this.getAll().filter(a => a.topicid === topicid).length; },

  // Replaces TopicDAO.storeSurveyResults()
  store(topicid, answeredQuestions) {
    const answers = this.getAll();
    answers.push({
      surveyid: String(Date.now()),
      topicid,
      takenon: new Date().toLocaleDateString('en-GB'),
      details: answeredQuestions.map(q => ({ questionid: q.id, answer: q.answer })),
    });
    localStorage.setItem(KEYS.ANSWERS, JSON.stringify(answers));
    return true;
  },

  // Replaces TopicDAO.getSurveyResults()
  getSurveyResults(topicid) {
    const topicAnswers = this.getAll().filter(a => a.topicid === topicid);
    const count = topicAnswers.length;
    if (count === 0) return [];
    return QuestionDAO.getByTopic(topicid).map(q => {
      let c1 = 0, c2 = 0, c3 = 0;
      topicAnswers.forEach(s => {
        const d = (s.details || []).find(x => x.questionid === q.id);
        if (d) { if (d.answer==='1') c1++; else if (d.answer==='2') c2++; else if (d.answer==='3') c3++; }
      });
      return {
        question: q.text, option1: q.opt1, option2: q.opt2, option3: q.opt3,
        opt1pct: Math.round(c1/count*100),
        opt2pct: Math.round(c2/count*100),
        opt3pct: Math.round(c3/count*100),
        totalResponses: count,
      };
    });
  },
};

// Helper
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
