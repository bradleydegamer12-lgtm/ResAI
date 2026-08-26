window.ResumeAI = window.ResumeAI || {};

(function () {
  var firebaseConfig = {
    apiKey:            "AIzaSyBbSsNYSTyK87ufHvgKxJXi-OIEC_adwKg",
    authDomain:        "g11-d7bb6.firebaseapp.com",
    projectId:         "g11-d7bb6",
    storageBucket:     "g11-d7bb6.firebasestorage.app",
    messagingSenderId: "432147405359",
    appId:             "1:432147405359:web:fe49862c93a004a2e8c4da"
  };

  firebase.initializeApp(firebaseConfig);

  window.ResumeAI.auth      = firebase.auth();
  window.ResumeAI.db        = firebase.firestore();
  window.ResumeAI.functions = firebase.functions();

  window.ResumeAI.db.enablePersistence({ synchronizeTabs: true }).catch(function () {});
})();
