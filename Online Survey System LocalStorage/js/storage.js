/**
 * storage.js — LocalStorage DAO
 * Replaces: Database.java, TopicDAO.java, UserDAO.java (Oracle JDBC)
 * 
 * Schema:
 *   survey_topics    : [{id, title, addedon, uname}]
 *   survey_questions : [{id, text, opt1, opt2, opt3, topicid}]
 *   survey_answers   : [{surveyId, topicId, date, answers:[{questionId, answer}]}]
 *   survey_users     : [{uname, password}]
 *   survey_admin_session : {uname} | null
 */

const DB = {
  KEYS: {
    TOPICS: 'survey_topics',
    QUESTIONS: 'survey_questions',
    ANSWERS: 'survey_answers',
    USERS: 'survey_users',
    SESSION: 'survey_admin_session',
  },

  // ── helpers ──────────────────────────────────────────────
  _get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },
  _set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  _uuid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  // ── seed ─────────────────────────────────────────────────
  seed() {
    // Only seed if completely empty
    if (localStorage.getItem(this.KEYS.USERS) !== null) return;

    this._set(this.KEYS.USERS, [{ uname: 'admin', password: 'admin' }]);

    const t1 = this._uuid(), t2 = this._uuid(), t3 = this._uuid();
    const now = new Date().toLocaleDateString('vi-VN');

    this._set(this.KEYS.TOPICS, [
      { id: t1, title: 'Technology Trends 2025', addedon: now, uname: 'admin' },
      { id: t2, title: 'Work-Life Balance',      addedon: now, uname: 'admin' },
      { id: t3, title: 'Online Education',       addedon: now, uname: 'admin' },
    ]);

    const q = (topicid, text, opt1, opt2, opt3) => ({
      id: this._uuid(), topicid, text, opt1, opt2, opt3
    });

    this._set(this.KEYS.QUESTIONS, [
      q(t1, 'Which technology will dominate in 2025?', 'Artificial Intelligence', 'Quantum Computing', 'Augmented Reality'),
      q(t1, 'How often do you update your tech skills?', 'Weekly', 'Monthly', 'Rarely'),
      q(t1, 'Preferred programming language?', 'Python', 'JavaScript', 'Java'),

      q(t2, 'How many hours do you work per day?', 'Less than 8 hours', '8–10 hours', 'More than 10 hours'),
      q(t2, 'Do you work from home?', 'Always', 'Sometimes', 'Never'),
      q(t2, 'How satisfied are you with work-life balance?', 'Very Satisfied', 'Neutral', 'Unsatisfied'),

      q(t3, 'Have you taken an online course?', 'Yes, many', 'Yes, one or two', 'No'),
      q(t3, 'Preferred online learning platform?', 'Udemy / Coursera', 'YouTube', 'Company training'),
      q(t3, 'Is online education as effective as in-person?', 'Yes, equally effective', 'Partially', 'No, not at all'),
    ]);

    this._set(this.KEYS.ANSWERS, []);
  },

  // ── USER / AUTH ──────────────────────────────────────────
  login(uname, password) {
    const users = this._get(this.KEYS.USERS);
    return users.some(u => u.uname === uname && u.password === password);
  },

  setSession(uname) {
    localStorage.setItem(this.KEYS.SESSION, JSON.stringify({ uname }));
  },

  getSession() {
    try { return JSON.parse(localStorage.getItem(this.KEYS.SESSION)); }
    catch { return null; }
  },

  logout() {
    localStorage.removeItem(this.KEYS.SESSION);
  },

  // ── TOPICS ───────────────────────────────────────────────
  getTopics() {
    return this._get(this.KEYS.TOPICS)
      .sort((a, b) => a.title.localeCompare(b.title));
  },

  addTopic(title, uname) {
    const topics = this._get(this.KEYS.TOPICS);
    const now = new Date().toLocaleDateString('vi-VN');
    topics.push({ id: this._uuid(), title, addedon: now, uname });
    this._set(this.KEYS.TOPICS, topics);
    return true;
  },

  deleteTopic(topicid) {
    // Delete topic + all its questions + all answers for those questions
    let topics = this._get(this.KEYS.TOPICS);
    topics = topics.filter(t => t.id !== topicid);
    this._set(this.KEYS.TOPICS, topics);

    let questions = this._get(this.KEYS.QUESTIONS);
    questions = questions.filter(q => q.topicid !== topicid);
    this._set(this.KEYS.QUESTIONS, questions);

    let answers = this._get(this.KEYS.ANSWERS);
    answers = answers.filter(a => a.topicId !== topicid);
    this._set(this.KEYS.ANSWERS, answers);

    return true;
  },

  // ── QUESTIONS ────────────────────────────────────────────
  getQuestions(topicid) {
    return this._get(this.KEYS.QUESTIONS)
      .filter(q => q.topicid === topicid);
  },

  addQuestion(topicid, text, opt1, opt2, opt3) {
    const questions = this._get(this.KEYS.QUESTIONS);
    questions.push({ id: this._uuid(), topicid, text, opt1, opt2, opt3 });
    this._set(this.KEYS.QUESTIONS, questions);
    return true;
  },

  deleteQuestion(questionid) {
    let questions = this._get(this.KEYS.QUESTIONS);
    questions = questions.filter(q => q.id !== questionid);
    this._set(this.KEYS.QUESTIONS, questions);
    return true;
  },

  // ── SURVEY RESULTS ───────────────────────────────────────
  storeSurveyResults(topicId, answers) {
    // answers = [{questionId, answer}]  (answer = 1|2|3)
    const all = this._get(this.KEYS.ANSWERS);
    all.push({
      surveyId: this._uuid(),
      topicId,
      date: new Date().toISOString(),
      answers,
    });
    this._set(this.KEYS.ANSWERS, all);
    return true;
  },

  getSurveyCount(topicId) {
    return this._get(this.KEYS.ANSWERS)
      .filter(a => a.topicId === topicId).length;
  },

  /**
   * Returns [{question, option1, option2, option3,
   *           opt1count(%), opt2count(%), opt3count(%)}]
   */
  getSurveyResults(topicId) {
    const questions = this.getQuestions(topicId);
    const allAnswers = this._get(this.KEYS.ANSWERS).filter(a => a.topicId === topicId);
    const totalSurveys = allAnswers.length;

    if (totalSurveys === 0) return questions.map(q => ({
      question: q.text, option1: q.opt1, option2: q.opt2, option3: q.opt3,
      opt1count: 0, opt2count: 0, opt3count: 0, total: 0,
    }));

    return questions.map(q => {
      let c1 = 0, c2 = 0, c3 = 0;
      for (const survey of allAnswers) {
        const a = survey.answers.find(x => x.questionId === q.id);
        if (!a) continue;
        if (String(a.answer) === '1') c1++;
        else if (String(a.answer) === '2') c2++;
        else if (String(a.answer) === '3') c3++;
      }
      return {
        question: q.text,
        option1: q.opt1, option2: q.opt2, option3: q.opt3,
        opt1count: Math.round(c1 / totalSurveys * 100),
        opt2count: Math.round(c2 / totalSurveys * 100),
        opt3count: Math.round(c3 / totalSurveys * 100),
        total: totalSurveys,
        raw: { c1, c2, c3 },
      };
    });
  },
};

// Auto-seed on first load
DB.seed();
