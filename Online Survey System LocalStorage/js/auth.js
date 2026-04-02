/**
 * auth.js — Auth guard for admin pages
 * Replaces: AuthFilter.java
 * 
 * Include this script on every admin page.
 * If the user is not logged in, redirect to login.html.
 */

(function () {
  const session = (() => {
    try { return JSON.parse(localStorage.getItem('survey_admin_session')); }
    catch { return null; }
  })();

  const path = window.location.pathname;
  const isLoginPage = path.endsWith('login.html');

  if (!session && !isLoginPage) {
    window.location.replace('login.html');
  }
  if (session && isLoginPage) {
    window.location.replace('home.html');
  }
})();
