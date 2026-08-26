var functions = require("firebase-functions");
var admin = require("firebase-admin");
var cors = require("cors")({ origin: true });

admin.initializeApp();
var db = admin.firestore();

function verifyAuth(req) {
  var token = req.headers.authorization;
  if (!token || token.indexOf("Bearer ") !== 0) return Promise.reject(new Error("UNAUTHORIZED"));
  return admin.auth().verifyIdToken(token.split("Bearer ")[1]);
}

function checkLimit(uid) {
  return db.collection("users").doc(uid).get().then(function (userSnap) {
    if (userSnap.exists && userSnap.data().plan === "pro") return { ok: true, remaining: "unlimited" };

    var usageRef = db.collection("usage").doc(uid);
    return usageRef.get().then(function (usageSnap) {
      var usage = usageSnap.exists ? usageSnap.data() : { count: 0, reset: null };
      var now = new Date();
      var reset = usage.reset ? usage.reset.toDate() : null;

      if (!reset || reset.getMonth() !== now.getMonth() || reset.getFullYear() !== now.getFullYear()) {
        return usageRef.set({ count: 0, reset: admin.firestore.Timestamp.now() }, { merge: true }).then(function () {
          return { ok: true, remaining: 14 };
        });
      }

      var LIMIT = 15;
      var remaining = LIMIT - (usage.count || 0);
      return { ok: remaining > 0, remaining: Math.max(0, remaining) };
    });
  });
}

function bumpUsage(uid) {
  return db.collection("usage").doc(uid).set({
    count: admin.firestore.FieldValue.increment(1),
    lastUsed: admin.firestore.Timestamp.now()
  }, { merge: true });
}

exports.aiGenerate = functions.https.onRequest(function (req, res) {
  cors(req, res, function () {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    return verifyAuth(req).then(function (decoded) {
      return checkLimit(decoded.uid).then(function (limit) {
        if (!limit.ok) return res.status(429).json({ error: "AI limit reached. Upgrade to Pro." });

        var type = req.body.type;
        var context = req.body.context || {};
        var prompt = req.body.prompt || "";

        var prompts = {
          "generate-summary": {
            sys: "You are an expert resume writer. Write a concise 2-3 sentence professional summary. Do NOT invent fake qualifications, jobs, degrees, or companies. Only use information provided.",
            usr: "Create a professional summary based on:\n" + JSON.stringify(context, null, 2)
          },
          "improve-summary": {
            sys: "Improve this professional summary. Make it more impactful and ATS-friendly. Do not add fake information.",
            usr: "Current summary: " + (context.text || "") + "\nAdditional context: " + JSON.stringify(context.meta || {})
          },
          "rewrite-experience": {
            sys: "Rewrite work experience descriptions using strong action verbs and quantified achievements. Do not fabricate accomplishments. Return only the improved description text, nothing else.",
            usr: "Rewrite:\n" + JSON.stringify(context.experience || context, null, 2)
          },
          "generate-skills": {
            sys: "Suggest relevant professional skills based on the provided background. Only suggest skills logically related to the experience. Return as a JSON array of strings like [\"Skill1\", \"Skill2\"].",
            usr: "Background: " + JSON.stringify(context, null, 2)
          },
          "improve-text": {
            sys: "Improve the given text for a professional resume. Fix grammar, improve clarity, use action verbs. Do not add fake information. Return only the improved text.",
            usr: "Text to improve: " + (context.text || "") + "\nTone: " + (context.tone || "professional")
          },
          "analyze-resume": {
            sys: "You are a resume analyst. Score the resume 0-100 in categories: content, skills, experience, ats, formatting, completeness. Return JSON: {\"overall\":85, \"categories\":{\"content\":80,\"skills\":90,\"experience\":75,\"ats\":85,\"formatting\":90,\"completeness\":80}, \"recommendations\":[\"tip1\",\"tip2\"]}",
            usr: "Resume data:\n" + JSON.stringify(context, null, 2)
          },
          "ats-analysis": {
            sys: "You are an ATS expert. Compare the resume against the job description. Return JSON: {\"matchPercent\":78, \"matchingKeywords\":[\"keyword1\"], \"missingKeywords\":[\"keyword2\"], \"suggestions\":[\"suggestion1\"]}",
            usr: "Resume:\n" + JSON.stringify(context.resume || context, null, 2) + "\n\nJob Description:\n" + (context.jobDescription || prompt)
          },
          "career-advice": {
            sys: "You are a career advisor. Provide actionable, specific advice. Do not guarantee employment.",
            usr: prompt || "Advise based on: " + JSON.stringify(context)
          },
          "ai-chat": {
            sys: "You are ResumeAI assistant. Help users improve their resumes and career prospects. Be concise and actionable. Do not fabricate information.",
            usr: prompt
          }
        };

        var p = prompts[type];
        if (!p) return res.status(400).json({ error: "Invalid type" });

        var apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: "AI not configured. Set OPENAI_API_KEY in Cloud Functions secrets." });

        var https = require("https");
        var postData = JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: p.sys },
            { role: "user", content: p.usr }
          ],
          max_tokens: 2000,
          temperature: 0.7
        });

        var options = {
          hostname: "api.openai.com",
          path: "/v1/chat/completions",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + apiKey,
            "Content-Length": Buffer.byteLength(postData)
          }
        };

        return new Promise(function (resolve, reject) {
          var apiReq = https.request(options, function (apiRes) {
            var body = "";
            apiRes.on("data", function (chunk) { body += chunk; });
            apiRes.on("end", function () {
              try {
                var json = JSON.parse(body);
                if (json.error) {
                  res.status(500).json({ error: json.error.message || "AI error" });
                  return resolve();
                }
                var result = json.choices[0].message.content;
                return bumpUsage(decoded.uid).then(function () {
                  return checkLimit(decoded.uid);
                }).then(function (newLimit) {
                  res.json({ result: result, remaining: newLimit.remaining });
                  resolve();
                });
              } catch (e) {
                res.status(500).json({ error: "Failed to parse AI response" });
                resolve();
              }
            });
          });

          apiReq.on("error", function (e) {
            res.status(500).json({ error: "AI request failed" });
            resolve();
          });

          apiReq.write(postData);
          apiReq.end();
        });
      });
    }).catch(function (err) {
      console.error("aiGenerate error:", err);
      if (err.message === "UNAUTHORIZED") return res.status(401).json({ error: "Unauthorized" });
      return res.status(500).json({ error: "AI generation failed" });
    });
  });
});

exports.scoreResume = functions.https.onRequest(function (req, res) {
  cors(req, res, function () {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    return verifyAuth(req).then(function () {
      var resume = req.body.resume || {};
      var cats = { content: 0, skills: 0, experience: 0, ats: 0, formatting: 80, completeness: 0 };

      var pi = resume.personalInformation || {};
      if (pi.fullName) cats.content += 15;
      if (pi.email) cats.content += 10;
      if (pi.phone) cats.content += 10;
      if (pi.location) cats.content += 10;
      if (pi.linkedin) cats.content += 10;
      if (resume.summary && resume.summary.length > 50) cats.content += 25;
      if (resume.summary && resume.summary.length > 150) cats.content += 20;
      cats.content = Math.min(100, cats.content);

      var ec = (resume.experience || []).length;
      cats.experience = Math.min(100, ec * 20 + ((resume.experience || []).some(function (e) { return e.description && e.description.length > 80; }) ? 20 : 0));

      cats.skills = Math.min(100, (resume.skills || []).length * 12);

      if (resume.summary) cats.completeness += 15;
      if ((resume.experience || []).length) cats.completeness += 20;
      if ((resume.skills || []).length) cats.completeness += 15;
      if ((resume.education || []).length) cats.completeness += 15;
      if ((resume.projects || []).length) cats.completeness += 10;
      if ((resume.certifications || []).length) cats.completeness += 10;
      if ((resume.languages || []).length) cats.completeness += 5;
      cats.completeness = Math.min(100, cats.completeness);

      cats.ats = 50;
      if (pi.email) cats.ats += 10;
      if (resume.summary) cats.ats += 10;
      if ((resume.skills || []).length >= 5) cats.ats += 15;
      if ((resume.experience || []).length >= 2) cats.ats += 15;
      cats.ats = Math.min(100, cats.ats);

      var overall = Math.round(
        cats.content * 0.2 + cats.skills * 0.15 + cats.experience * 0.2 +
        cats.ats * 0.15 + cats.formatting * 0.1 + cats.completeness * 0.2
      );

      var recs = [];
      if (!resume.summary || resume.summary.length < 50) recs.push("Add a professional summary (2-3 sentences)");
      if ((resume.experience || []).length < 2) recs.push("Add at least 2 work experience entries");
      if ((resume.skills || []).length < 5) recs.push("Add at least 5 relevant skills");
      if (!pi.linkedin) recs.push("Add your LinkedIn profile URL");
      if (!(resume.education || []).length) recs.push("Add your education background");
      if (!(resume.projects || []).length) recs.push("Consider adding relevant projects");

      return res.json({ overall: overall, categories: cats, recommendations: recs });
    }).catch(function (err) {
      console.error("scoreResume error:", err);
      return res.status(500).json({ error: "Scoring failed" });
    });
  });
});

exports.getUsage = functions.https.onRequest(function (req, res) {
  cors(req, res, function () {
    return verifyAuth(req).then(function (decoded) {
      return Promise.all([
        db.collection("users").doc(decoded.uid).get(),
        db.collection("usage").doc(decoded.uid).get()
      ]).then(function (results) {
        var userSnap = results[0];
        var usageSnap = results[1];
        var plan = (userSnap.exists && userSnap.data().plan) || "free";
        var count = (usageSnap.exists && usageSnap.data().count) || 0;
        var limit = plan === "pro" ? "unlimited" : 15;
        var remaining = plan === "pro" ? "unlimited" : Math.max(0, 15 - count);

        return res.json({ plan: plan, used: count, limit: limit, remaining: remaining });
      });
    }).catch(function (err) {
      console.error("getUsage error:", err);
      return res.status(500).json({ error: "Failed to get usage" });
    });
  });
});

exports.deleteAccount = functions.https.onRequest(function (req, res) {
  cors(req, res, function () {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    return verifyAuth(req).then(function (decoded) {
      var uid = decoded.uid;
      var batch = db.batch();

      return db.collection("resumes").where("ownerId", "==", uid).get().then(function (resumes) {
        resumes.docs.forEach(function (d) { batch.delete(d.ref); });

        return db.collection("publicResumes").where("ownerId", "==", uid).get();
      }).then(function (pub) {
        pub.docs.forEach(function (d) { batch.delete(d.ref); });

        batch.delete(db.collection("usage").doc(uid));
        batch.delete(db.collection("users").doc(uid));

        return batch.commit();
      }).then(function () {
        return admin.auth().deleteUser(uid);
      }).then(function () {
        return res.json({ success: true });
      });
    }).catch(function (err) {
      console.error("deleteAccount error:", err);
      return res.status(500).json({ error: "Failed to delete account" });
    });
  });
});
