window.ResumeAI = window.ResumeAI || {};

(function () {
  var firebaseConfig = {
    apiKey:            "YOUR_API_KEY",
    authDomain:        "YOUR_PROJECT.firebaseapp.com",
    projectId:         "YOUR_PROJECT_ID",
    storageBucket:     "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId:             "YOUR_APP_ID"
  };

  firebase.initializeApp(firebaseConfig);

  window.ResumeAI.auth      = firebase.auth();
  window.ResumeAI.db        = firebase.firestore();
  window.ResumeAI.functions = firebase.functions();

  window.ResumeAI.db.enablePersistence({ synchronizeTabs: true }).catch(function () {});
})();
