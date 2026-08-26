window.ResumeAI = window.ResumeAI || {};

(function () {
  var firebaseConfig = {
    apiKey:            "AIzaSyBxL35GsFPk64bG7qTmcASfHJ5I4EcEKjo",
    authDomain:        "resai-c9945.firebaseapp.com",
    projectId:         "resai-c9945",
    storageBucket:     "resai-c9945.firebasestorage.app",
    messagingSenderId: "778651902306",
    appId:             "1:778651902306:web:389e1646b5581abceccc3b"
  };

  firebase.initializeApp(firebaseConfig);

  window.ResumeAI.auth      = firebase.auth();
  window.ResumeAI.db        = firebase.firestore();
  window.ResumeAI.functions = firebase.functions();

  window.ResumeAI.db.enablePersistence({ synchronizeTabs: true }).catch(function () {});
})();
