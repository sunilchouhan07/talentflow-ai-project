const STORAGE_KEY='talentflow_ai_data_v1';
const SESSION_KEY='talentflow_ai_session';

const demoData={
 candidates:[
  {id:1,name:'Aarav Mehta',email:'aarav@example.com',role:'Frontend Developer',experience:'3 years',score:94,stage:'Interview',applied:'2026-09-25',source:'LinkedIn'},
  {id:2,name:'Priya Shah',email:'priya@example.com',role:'Python Developer',experience:'2 years',score:91,stage:'Screening',applied:'2026-09-24',source:'Referral'},
  {id:3,name:'Rohan Patil',email:'rohan@example.com',role:'DevOps Engineer',experience:'4 years',score:88,stage:'Shortlisted',applied:'2026-09-23',source:'Indeed'},
  {id:4,name:'Sneha Kulkarni',email:'sneha@example.com',role:'Data Analyst',experience:'2 years',score:86,stage:'Applied',applied:'2026-09-22',source:'Website'},
  {id:5,name:'Vikram Joshi',email:'vikram@example.com',role:'Backend Developer',experience:'5 years',score:82,stage:'Offer',applied:'2026-09-20',source:'LinkedIn'}
 ],
 jobs:[
  {id:1,title:'Frontend Developer',department:'Engineering',location:'Mumbai / Hybrid',type:'Full-time',applicants:18},
  {id:2,title:'Python Developer',department:'Engineering',location:'Remote',type:'Full-time',applicants:12},
  {id:3,title:'Data Analyst',department:'Analytics',location:'Pune / Hybrid',type:'Full-time',applicants:9}
 ],
 interviews:[
  {id:1,candidate:'Aarav Mehta',role:'Frontend Developer',date:'2026-09-28',time:'10:30 AM',interviewer:'Neha Sharma',status:'Scheduled',link:'https://meet.google.com/'},
  {id:2,candidate:'Rohan Patil',role:'DevOps Engineer',date:'2026-09-29',time:'2:00 PM',interviewer:'Rahul Verma',status:'Pending',link:'https://meet.google.com/'},
  {id:3,candidate:'Priya Shah',role:'Python Developer',date:'2026-09-30',time:'11:00 AM',interviewer:'Anita Rao',status:'Scheduled',link:'https://meet.google.com/'}
 ],
 settings:{ai:true,notifications:true,compact:false}
};

let data = {
  candidates: [],
  jobs: [],
  interviews: [],
  applications: [],
  settings: {
    ai: true,
    notifications: true,
    compact: false,
  },
};

let currentUser = JSON.parse(
  localStorage.getItem(SESSION_KEY) || "null"
);

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function loadData(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||structuredClone(demoData)}catch{return structuredClone(demoData)}}
function saveData(){localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}
function showToast(message){const el=document.createElement('div');el.className='toast';el.textContent=message;$('toastContainer').appendChild(el);setTimeout(()=>el.remove(),2800)}

async function loadBackendData() {
  try {
    const [candidateResult, jobResult, applicationResult, interviewResult] =
      await Promise.all([
        window.TalentFlowAPI.getCandidates(),
        window.TalentFlowAPI.getJobs(),
        window.TalentFlowAPI.getApplications(),
        window.TalentFlowAPI.getInterviews(),
      ]);

    const applications = applicationResult.applications || [];

    data.applications = applications;

   
    data.candidates = (candidateResult.candidates || []).map((c) => {
      const candidateApplications = applications.filter(
        a => Number(a.candidate_id) === Number(c.id)
      );

      const statusMap = {
        new: "New",
        applied: "Applied",
        screening: "Screening",
        shortlisted: "Shortlisted",
        interview: "Interview",
        offered: "Offer",
        offer: "Offer",
        hired: "Hired",
        rejected: "Rejected",
      };

      // Derive a display status from the candidate's applications.
      // Candidates without applications remain New.
      const applicationStages = candidateApplications.map(
        a => String(a.stage || "applied").toLowerCase()
      );

      let displayStage = "New";

      if (applicationStages.length > 0) {
        // Prefer the furthest progressed application.
        const stagePriority = {
          applied: 1,
          screening: 2,
          rejected: 3,
          interview: 4,
          offer: 5,
          hired: 6,
        };

        const highestStage = [...applicationStages].sort(
          (a, b) => (stagePriority[b] || 0) - (stagePriority[a] || 0)
        )[0];

        const applicationStatusMap = {
          applied: "Applied",
          screening: "Screening",
          interview: "Interview",
          offer: "Offer",
          hired: "Hired",
          rejected: "Rejected",
        };

        displayStage = applicationStatusMap[highestStage] || "Applied";
      } else {
        // Preserve an existing candidate status only when it is
        // meaningful and there are no applications.
        displayStage =
          statusMap[String(c.status || "new").toLowerCase()] || "New";
      }

     
      return {
        id: Number(c.id),
        name: c.full_name,
        email: c.email,
        phone: c.phone || "",
        skills: Array.isArray(c.skills) ? c.skills : [],
        resumeUrl: c.resume_url || null,
        role: c.applied_role || c.role || "Not specified",
        experience:
          c.experience_years == null
            ? "Not specified"
            : `${c.experience_years} years`,
        score: Number(c.match_score ?? 0),
        stage: displayStage,
        applied: c.created_at?.slice(0, 10) || "",
        createdAt: c.created_at || null,
        source: c.source || "Website",
      };

    });


    data.jobs = (jobResult.jobs || []).map((j) => ({
  id: Number(j.id),
  title: j.title,
  status: j.status || "open",
  department: j.department || "General",
  location: j.location || "Not specified",
  type: j.employment_type || "Full-time",
  description: j.description || "",
  requirements: j.requirements || "",
  applicants: applications.filter(
    (a) => Number(a.job_id) === Number(j.id)
  ).length,
}));

    
    data.interviews = (interviewResult.interviews || []).map((i) => ({
    id: Number(i.id),
    applicationId: Number(i.application_id),
    candidate: i.candidate_name || "Candidate",
    role: i.job_title || "Not specified",

    date: i.scheduled_at
        ? new Date(i.scheduled_at).toLocaleDateString("en-CA", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        })
        : "",

    time: i.scheduled_at
        ? new Date(i.scheduled_at).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata"
        })
        : "",

    interviewer: i.interviewer_name || "Not assigned",
    status: i.status || "scheduled",
    type: i.interview_type || "technical",
    feedback: i.feedback || "",
    link: i.meeting_link || "",
    }));


    renderAll();
    console.log("Recruitment data loaded from PostgreSQL.");
    showToast("Recruitment data loaded successfully");
  } catch (error) {
    console.error("Failed to load backend data:", error);
    showToast("Could not load data. Check the backend API.");
  }
}

function initials(name){return String(name||'Admin').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()}
function fmtDate(v){if(!v)return '—';return new Date(v+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
function to24HourTime(value) {
    if (!value) return "";

    const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

    if (!match) return "";

    let hours = Number(match[1]);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function stageClass(stage){return stage.toLowerCase().replace(/\s/g,'-')}


function initAuth() {
  // A frontend session without a backend JWT is not authenticated.
  if (!localStorage.getItem("talentflow_token")) {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("talentflow_user");
    currentUser = null;
  }

  if (currentUser) {
    $("authScreen").classList.add("hidden");
    $("app").classList.remove("hidden");
    updateUserUI();
    renderAll();
  } else {
    $("authScreen").classList.remove("hidden");
    $("app").classList.add("hidden");
  }

  $("showRegister").onclick = () => {
    $("loginPanel").classList.add("hidden");
    $("registerPanel").classList.remove("hidden");
  };

  $("showLogin").onclick = () => {
    $("registerPanel").classList.add("hidden");
    $("loginPanel").classList.remove("hidden");
  };

  document.querySelectorAll(".password-toggle").forEach((btn) => {
    btn.onclick = () => {
      const input = $(btn.dataset.target);
      input.type = input.type === "password" ? "text" : "password";
      btn.textContent = input.type === "password" ? "Show" : "Hide";
    };
  });

  $("loginForm").onsubmit = async (e) => {
    e.preventDefault();

    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;
    const button = $("loginForm").querySelector('[type="submit"]');

    if (button) button.disabled = true;

    try {
      const result = await window.TalentFlowAPI.login(email, password);
      const user = result.user;

      currentUser = {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));

      $("authScreen").classList.add("hidden");
      $("app").classList.remove("hidden");

      updateUserUI();
      renderAll();
      showToast("Welcome to TalentFlow AI");
    } catch (error) {
      showToast(error.message || "Login failed");
    } finally {
      if (button) button.disabled = false;
    }
  };

  $("registerForm").onsubmit = async (e) => {
    e.preventDefault();

    const firstName = $("registerFirstName").value.trim();
    const lastName = $("registerLastName").value.trim();
    const email = $("registerEmail").value.trim();
    const password = $("registerPassword").value;
    const confirmPassword = $("registerConfirmPassword").value;
    const button = $("registerForm").querySelector('[type="submit"]');

    if (!firstName || !lastName || !email || !password) {
      showToast("Please complete all required fields");
      return;
    }

    if (password.length < 8) {
      showToast("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Passwords do not match");
      return;
    }

    if (button) button.disabled = true;

    try {
      await window.TalentFlowAPI.register(
        `${firstName} ${lastName}`,
        email,
        password
      );

      $("registerForm").reset();
      $("showLogin").click();
      $("loginEmail").value = email;

      showToast("Account created. Please log in.");
    } catch (error) {
      showToast(error.message || "Registration failed");
    } finally {
      if (button) button.disabled = false;
    }
  };

  $("forgotPassword").onclick = () =>
    showToast("Password reset is not available yet.");
}


function updateUserUI() {
  if (!currentUser) return;

  const name = currentUser.name || currentUser.full_name || "User";
  const email = currentUser.email || "";

  $("sidebarUserName").textContent = name;
  $("sidebarUserEmail").textContent = email;
  $("sidebarAvatar").textContent = initials(name);
  $("welcomeName").textContent = name.split(" ")[0];
}


function initNavigation(){
 document.querySelectorAll('.nav-item[data-page]').forEach(btn=>btn.onclick=()=>navigate(btn.dataset.page));
 document.querySelectorAll('[data-page-link]').forEach(btn=>btn.onclick=()=>navigate(btn.dataset.pageLink));
 $('mobileMenu').onclick=()=>{$('sidebar').classList.toggle('open');$('sidebarOverlay').classList.toggle('open')};
 $('sidebarOverlay').onclick=()=>{$('sidebar').classList.remove('open');$('sidebarOverlay').classList.remove('open')};
$("logoutButton").onclick = () => {
  window.TalentFlowAPI.logout();
  localStorage.removeItem(SESSION_KEY);
  currentUser = null;
  location.reload();
};
}
function navigate(page){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));const target=$('page-'+page);if(target)target.classList.add('active');document.querySelectorAll('.nav-item[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));const titles={dashboard:'Recruitment Dashboard',candidates:'Candidates',applications: "Applications",jobs:'Job Openings',interviews:'Scheduled Interviews',pipeline:'Candidate Pipeline',analytics:'Recruitment Analytics',settings:'Settings'};$('pageTitle').textContent=titles[page]||'TalentFlow AI';$('sidebar').classList.remove('open');$('sidebarOverlay').classList.remove('open');renderAll()}


function renderStats() {
  const candidates = data.candidates || [];
  const applications = data.applications || [];

  $("totalCandidates").textContent = candidates.length;

  const shortlistedCandidateIds = new Set(
    applications
      .filter(a =>
        ["screening", "interview", "offer"].includes(
          String(a.stage || "").toLowerCase()
        )
      )
      .map(a => String(a.candidate_id))
  );

  const hiredCandidateIds = new Set(
    applications
      .filter(a =>
        String(a.stage || "").toLowerCase() === "hired"
      )
      .map(a => String(a.candidate_id))
  );

  $("shortlistedCandidates").textContent =
    shortlistedCandidateIds.size;

  $("totalInterviews").textContent = data.interviews.length;

  $("totalHired").textContent = hiredCandidateIds.size;

  $("interviewNavCount").textContent = data.interviews.length;
}


function renderDashboard() {
  // 1. Dashboard statistics
  const candidates = data.candidates || [];
  const applications = data.applications || [];
  const interviews = data.interviews || [];

  $("totalCandidates").textContent = candidates.length;

  const shortlistedCandidateIds = new Set(
    applications
      .filter(a =>
        ["screening", "interview", "offer"].includes(
          String(a.stage || "").toLowerCase()
        )
      )
      .map(a => String(a.candidate_id))
  );

  $("shortlistedCandidates").textContent =
    shortlistedCandidateIds.size;

  $("totalInterviews").textContent = interviews.length;

  const hiredCandidateIds = new Set(
    applications
      .filter(a =>
        String(a.stage || "").toLowerCase() === "hired"
      )
      .map(a => String(a.candidate_id))
  );

  $("totalHired").textContent = hiredCandidateIds.size;

  // 2. Upcoming interviews
  const list = interviews.slice(0, 4);

  $("dashboardInterviews").innerHTML = list.length
    ? list.map(i => `
        <div class="interview-card">
          <div>
            <h4>${esc(i.candidate)}</h4>
            <p>${esc(i.role)}</p>
            <p>${fmtDate(i.date)} · ${esc(i.time)} · ${esc(i.interviewer)}</p>
          </div>
          <span class="tag">${esc(i.status)}</span>
        </div>
      `).join("")
    : '<p class="ai-main-text">No interviews scheduled.</p>';

  // 3. Recent candidates
  $("recentCandidateBody").innerHTML = candidates
    .slice(0, 5)
    .map(c => `
      <tr>
        <td>
          <strong>${esc(c.name)}</strong><br>
          <small>${esc(c.email)}</small>
        </td>
        <td>${esc(c.role)}</td>
        <td><strong>${c.score}%</strong></td>
        <td><span class="tag">${esc(c.stage)}</span></td>
        <td>${fmtDate(c.applied)}</td>
        <td>
          <button class="link-button" data-candidate="${c.id}">
            View
          </button>
          <button
            type="button"
            data-delete-candidate="${c.id}"
            class="danger-button"
          >
            Delete
          </button>
        </td>
      </tr>
    `)
    .join("");

  bindCandidateButtons();
}



function renderCandidates() {
  const q = ($("candidateSearch").value || "").toLowerCase();
  const status = $("candidateStatusFilter").value;
  const role = $("candidateRoleFilter").value;
  const sort = $("candidateSort").value;

  let arr = data.candidates.filter(c =>
    (!q || `${c.name} ${c.email} ${c.role}`.toLowerCase().includes(q)) &&
    (status === "all" || c.stage === status) &&
    (role === "all" || c.role === role)
  );

  if (sort === "score") arr.sort((a, b) => b.score - a.score);
  if (sort === "name") arr.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "recent") arr.sort((a, b) => b.applied.localeCompare(a.applied));

  $("candidateResultCount").textContent =
    `${arr.length} candidate${arr.length !== 1 ? "s" : ""}`;

  $("candidateTableBody").innerHTML = arr.map(c => `
    <tr>
      <td>
        <strong>${esc(c.name)}</strong><br>
        <small>${esc(c.email)}</small>
      </td>
      <td>${esc(c.role)}</td>
      <td>${esc(c.experience)}</td>
      <td><strong>${c.score}%</strong></td>
      <td><span class="tag">${esc(c.stage)}</span></td>
      <td>${fmtDate(c.applied)}</td>
      <td>
        <button class="link-button" data-candidate="${c.id}">
          View
        </button>
        <button
          class="danger-button"
          type="button"
          data-delete-candidate="${c.id}"
        >
          Delete
        </button>
      </td>
    </tr>
  `).join("");

  bindCandidateButtons();
}




function renderJobs() {
  $("jobsGrid").innerHTML = data.jobs.map(j => `
    <div class="job-card">
      <span class="section-kicker">${esc(j.department)}</span>
      <h3>${esc(j.title)}</h3>
      <p>${esc(j.location)} · ${esc(j.type)}</p>

      <p>${j.applicants} applicants open</p>

      <div class="job-actions">
        <button
          class="link-button"
          type="button"
          data-edit-job="${j.id}"
        >
          Edit Job
        </button>

        <button
          class="danger-button"
          type="button"
          data-delete-job="${j.id}"
        >
          Delete Job
        </button>
      </div>
    </div>
  `).join("");

  bindJobButtons();
}




function renderApplications() {
    const tbody = $("applicationTableBody");

    if (!data.applications.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">No applications found.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = data.applications.map(application => `
        <tr>
            <td>
                <strong>${esc(application.candidate_name)}</strong>
            </td>
            <td>${esc(application.job_title)}</td>
            <td>${fmtDate(application.applied_at?.slice(0, 10))}</td>
            <td>
                <select id="applicationStage-${application.id}">
                    ${["applied", "screening", "interview", "offer", "hired", "rejected"]
                        .map(stage => `
                            <option value="${stage}"
                                ${application.stage === stage ? "selected" : ""}>
                                ${stage.charAt(0).toUpperCase() + stage.slice(1)}
                            </option>
                        `).join("")}
                </select>
            </td>
            <td>
                <button
                    class="link-button"
                    type="button"
                    data-save-application="${application.id}">
                    Save Stage
                </button>
                <button
                    class="link-button"
                    type="button"
                    data-screen-application="${application.id}">
                    Screen Resume
                </button>
                <button
                    class="link-button"
                    type="button"
                    data-view-evaluation="${application.id}">
                    View Evaluation
                </button>
            </td>
        </tr>
    `).join("");

    document.querySelectorAll("[data-save-application]").forEach(button => {
        button.onclick = () =>
            updateApplicationStage(Number(button.dataset.saveApplication));
    });

    document.querySelectorAll("[data-screen-application]").forEach(button => {
        button.onclick = () =>
            screenApplication(Number(button.dataset.screenApplication));
    });

    document.querySelectorAll("[data-view-evaluation]").forEach(button => {
        button.onclick = () =>
            viewEvaluationHistory(Number(button.dataset.viewEvaluation));
    });
}


async function updateApplicationStage(id) {
    const select = $(`applicationStage-${id}`);
    const button = document.querySelector(
        `[data-save-application="${id}"]`
    );

    button.disabled = true;
    button.textContent = "Saving...";

    try {
        await window.TalentFlowAPI.updateApplicationStage(
            id,
            select.value
        );

        await loadBackendData();
        showToast("Application stage saved to PostgreSQL!");
    } catch (error) {
        console.error("Failed to update application stage:", error);
        showToast(`Could not update stage: ${error.message}`);
        button.disabled = false;
        button.textContent = "Save Stage";
    }
}


function renderEvaluation(evaluation) {
    const matched = Array.isArray(evaluation.matched_skills)
        ? evaluation.matched_skills
        : [];

    const missing = Array.isArray(evaluation.missing_skills)
        ? evaluation.missing_skills
        : [];

    const evidence = Array.isArray(evaluation.evidence)
        ? evaluation.evidence
        : [];

    const limitations = Array.isArray(evaluation.limitations)
        ? evaluation.limitations
        : [];

    const safeList = (items) => items.length
        ? `<ul>${items.map(item => `<li>${esc(item)}</li>`).join("")}</ul>`
        : "<p>None reported.</p>";

    openModal(
        "AI RESUME SCREENING",
        `Evaluation #${evaluation.id}`,
        `
            <div class="modal-form">
              <div class="evaluation-score">                    <h3>Match Score</h3>
                    <p><strong>${Number(evaluation.match_score).toFixed(0)}/100</strong></p>
                    <p>${esc(evaluation.summary || "No summary available.")}</p>
                    <p><small>Advisory assessment only. Review the evidence before making hiring decisions.</small></p>
                </div>

                <div>
                    <h3>Matched Skills</h3>
                    ${safeList(matched)}
                </div>

                <div>
                    <h3>Missing or Unconfirmed Skills</h3>
                    ${safeList(missing)}
                </div>

                <div>
                    <h3>Evidence</h3>

                    ${evidence.length ? `
                        <div class="evaluation-evidence-list">
                            ${evidence.map(item => {
                                const assessment = String(
                                    item.assessment || "not_evidenced"
                                ).toLowerCase();

                                const label = {
                                    match: "Match",
                                    partial_match: "Partial match",
                                    not_evidenced: "Not evidenced"
                                }[assessment] || assessment.replace(/_/g, " ");

                                return `
                                    <div class="evaluation-evidence-card">
                                        <div class="evaluation-evidence-heading">
                                            <strong>${esc(item.requirement || "Requirement")}</strong>
                                            <span class="evaluation-evidence-status status-${esc(assessment)}">
                                                ${esc(label)}
                                            </span>
                                        </div>

                                        <p>${esc(
                                            item.resume_evidence ||
                                            "No supporting resume evidence provided."
                                        )}</p>
                                    </div>
                                `;
                            }).join("")}
                        </div>
                    ` : "<p>No evidence items returned.</p>"}
                </div>


                <div>
                    <h3>Limitations</h3>
                    ${safeList(limitations)}
                </div>

                <p><small>Model: ${esc(evaluation.model_name || "Unknown")} · Created: ${esc(evaluation.created_at || "Unknown")}</small></p>
            </div>
        `
    );
}

async function screenApplication(applicationId) {
    const button = document.querySelector(
        `[data-screen-application="${applicationId}"]`
    );

    if (!button) return;

    button.disabled = true;
    button.textContent = "Screening...";

    try {
        const result =
            await window.TalentFlowAPI.screenApplication(applicationId);

        if (!result.evaluation) {
            throw new Error("The server did not return a saved evaluation.");
        }

        renderEvaluation(result.evaluation);
        showToast("AI assessment saved successfully.");
    } catch (error) {
        console.error("AI screening failed:", error);
        showToast(`Could not screen resume: ${error.message}`);
    } finally {
        button.disabled = false;
        button.textContent = "Screen Resume";
    }
}

async function viewEvaluationHistory(applicationId) {
    try {
        const result =
            await window.TalentFlowAPI.getEvaluationHistory(applicationId);

        if (!result.evaluations || result.evaluations.length === 0) {
            showToast("No saved evaluations for this application.");
            return;
        }

        renderEvaluation(result.evaluations[0]);
    } catch (error) {
        console.error("Evaluation history failed:", error);
        showToast(`Could not load evaluation: ${error.message}`);
    }
}



async function editJob(id) {
  const job = data.jobs.find(j => j.id === id);

  if (!job) {
    showToast("Job not found");
    return;
  }

  openModal(
    "RECRUITMENT",
    "Edit Job",
    `
      <form class="modal-form" id="editJobForm">
        <div>
          <label for="editJobTitle">Job Title</label>
          <input id="editJobTitle" value="${esc(job.title)}" required>
        </div>

        <div>
          <label for="editJobDept">Department</label>
          <input id="editJobDept" value="${esc(job.department)}" required>
        </div>

        <div>
          <label for="editJobLocation">Location</label>
          <input id="editJobLocation" value="${esc(job.location)}" required>
        </div>

        <div>
          <label for="editJobRequirements">Required Skills / Requirements</label>
          <textarea
            id="editJobRequirements"
            rows="4"
            placeholder="e.g. Linux, AWS, Docker, Networking"
          >${esc(job.requirements || "")}</textarea>
        </div>

        <div>
          <label for="editJobType">Employment Type</label>
          <select id="editJobType">
            ${[
              ["full-time", "Full-time"],
              ["part-time", "Part-time"],
              ["contract", "Contract"],
              ["internship", "Internship"],
            ].map(([value, label]) =>
              `<option value="${value}" ${
                job.type.toLowerCase() === value ? "selected" : ""
              }>${label}</option>`
            ).join("")}
          </select>
        </div>

        <div>
          <label for="editJobStatus">Status</label>
          <select id="editJobStatus">
            ${["open", "draft", "closed"].map(status =>
              `<option value="${status}" ${
                (job.status || "open") === status ? "selected" : ""
              }>${status}</option>`
            ).join("")}
          </select>
        </div>

        <button class="primary-button" id="saveJobButton" type="submit">
          Save Changes
        </button>
      </form>
    `
  );

  $("editJobForm").onsubmit = async (e) => {
    e.preventDefault();

    const button = $("saveJobButton");
    button.disabled = true;
    button.textContent = "Saving...";

    const payload = {
      title: $("editJobTitle").value.trim(),
      department: $("editJobDept").value.trim(),
      location: $("editJobLocation").value.trim(),
      requirements: $("editJobRequirements").value.trim(),
      employment_type: $("editJobType").value,
      status: $("editJobStatus").value,
    };

    try {
      await window.TalentFlowAPI.updateJob(id, payload);
      await loadBackendData();
      closeModal();
      showToast("Job updated successfully!");
    } catch (error) {
      console.error("Failed to update job:", error);
      showToast(`Could not update job: ${error.message}`);
      button.disabled = false;
      button.textContent = "Save Changes";
    }
  };
}


function bindJobButtons() {
  document.querySelectorAll("[data-edit-job]").forEach((button) => {
    button.onclick = () => {
      editJob(Number(button.dataset.editJob));
    };
  });

  document.querySelectorAll("[data-delete-job]").forEach((button) => {
    button.onclick = async () => {
      const id = Number(button.dataset.deleteJob);
      const job = data.jobs.find((item) => item.id === id);

      if (!job) {
        showToast("Job not found.");
        return;
      }

      if (!window.confirm(`Delete "${job.title}"?`)) {
        return;
      }

      button.disabled = true;
      button.textContent = "Deleting...";

      try {
        await window.TalentFlowAPI.deleteJob(id);
        await loadBackendData();
        showToast("Job deleted successfully!");
      } catch (error) {
        console.error("Failed to delete job:", error);
        showToast(`Could not delete job: ${error.message}`);
        button.disabled = false;
        button.textContent = "Delete Job";
      }
    };
  });
}


function renderInterviews() {
    const now = new Date();
    const today = now.toLocaleDateString("en-CA");

    const todayCount = data.interviews.filter(
        interview => interview.date === today
    ).length;

    const pendingCount = data.interviews.filter(
        interview => interview.status.toLowerCase() === "scheduled"
    ).length;

    $("todayInterviews").textContent = todayCount;
    $("weekInterviews").textContent = data.interviews.length;
    $("pendingInterviews").textContent = pendingCount;

    const list = $("interviewList");

    if (!data.interviews.length) {
        list.innerHTML = `
            <p class="ai-main-text">No interviews scheduled.</p>
        `;
        return;
    }

    list.innerHTML = data.interviews.map(interview => `
        <div class="interview-card">
            <div>
                <h4>${esc(interview.candidate)}</h4>
                <p>${esc(interview.role)} · ${esc(interview.interviewer)}</p>
                <p>
                    ${fmtDate(interview.date)} · ${esc(interview.time)}
                </p>
                <p>Type: ${esc(interview.type || "technical")}</p>
            </div>

            <div>
                <span class="tag">${esc(interview.status)}</span>
                <br>
                <button
                    class="link-button"
                    type="button"
                    data-interview="${interview.id}">
                    Open
                </button>
            </div>
        </div>
    `).join("");

    document.querySelectorAll("[data-interview]").forEach(button => {
        button.onclick = () =>
            openInterview(Number(button.dataset.interview));
    });
}


function renderPipeline() {
  const stages = [
    { value: "applied", label: "Applied" },
    { value: "screening", label: "Screening" },
    { value: "interview", label: "Interview" },
    { value: "offer", label: "Offer" },
    { value: "hired", label: "Hired" },
    { value: "rejected", label: "Rejected" },
  ];

  const applications = data.applications || [];
  const jobsById = new Map(
    data.jobs.map(job => [Number(job.id), job])
  );

  $("pipelineBoard").innerHTML = stages.map(stage => {
    const items = applications.filter(
      application =>
        String(application.stage || "applied").toLowerCase() ===
        stage.value
    );

    return `
      <div class="pipeline-column">
        <h4>
          ${stage.label}
          <span class="pipeline-count">(${items.length})</span>
        </h4>

        ${
          items.length
            ? items.map(application => {
                const job = jobsById.get(Number(application.job_id));
                const candidateName =
                  application.candidate_name || "Candidate";
                const jobTitle =
                  application.job_title || job?.title || "Job not found";

                return `
                  <div class="pipeline-card">
                    <strong>${esc(candidateName)}</strong>
                    <span>${esc(jobTitle)}</span>
                    <span>Application #${Number(application.id)}</span>
                  </div>
                `;
              }).join("")
            : '<span class="pipeline-count">No applications</span>'
        }
      </div>
    `;
  }).join("");
}


function renderAnalytics() {
  const stages = [
    { value: "applied", label: "Applied" },
    { value: "screening", label: "Screening" },
    { value: "interview", label: "Interview" },
    { value: "offer", label: "Offer" },
    { value: "hired", label: "Hired" },
    { value: "rejected", label: "Rejected" },
  ];

  const applications = data.applications || [];
  const totalApplications = applications.length;

  $("funnelChart").innerHTML = stages.map(stage => {
    const count = applications.filter(
      application =>
        String(application.stage || "applied").toLowerCase() ===
        stage.value
    ).length;

    const percentage = totalApplications
      ? Math.round((count / totalApplications) * 100)
      : 0;

    return `
      <div class="chart-row">
        <span class="chart-label">${stage.label}</span>
        <div class="chart-bar">
          <div class="chart-fill" style="width:${percentage}%"></div>
        </div>
        <span class="chart-value">${count}</span>
      </div>
    `;
  }).join("");

  const sources = {};
  data.candidates.forEach(candidate => {
    const source = candidate.source || "Unknown";
    sources[source] = (sources[source] || 0) + 1;
  });

  const totalCandidates = data.candidates.length;

  $("sourceChart").innerHTML = Object.entries(sources)
    .map(([source, count]) => {
      const percentage = totalCandidates
        ? Math.round((count / totalCandidates) * 100)
        : 0;

      return `
        <div class="chart-row">
          <span class="chart-label">${esc(source)}</span>
          <div class="chart-bar">
            <div class="chart-fill" style="width:${percentage}%"></div>
          </div>
          <span class="chart-value">${count}</span>
        </div>
      `;
    })
    .join("") || '<p class="ai-main-text">No source data yet.</p>';
}

function renderSettings(){$('settingAI').checked=data.settings.ai;$('settingNotifications').checked=data.settings.notifications;$('settingCompact').checked=data.settings.compact;document.body.classList.toggle('compact-tables',data.settings.compact)}
function renderAll(){renderStats();renderDashboard();populateRoleFilter();renderCandidates();renderJobs();renderApplications();renderInterviews();renderPipeline();renderAnalytics();renderSettings()}
function populateRoleFilter(){const select=$('candidateRoleFilter'),value=select.value,roles=[...new Set(data.candidates.map(c=>c.role))];select.innerHTML='<option value="all">All positions</option>'+roles.map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join('');select.value=roles.includes(value)?value:'all'}

function bindCandidateButtons() {
  // Existing View button behavior
  document.querySelectorAll('[data-candidate]').forEach((button) => {
    button.onclick = () => openCandidate(+button.dataset.candidate);
  });

  // Delete candidate behavior
  document.querySelectorAll('[data-delete-candidate]').forEach((button) => {
    button.onclick = async () => {
      const id = Number(button.dataset.deleteCandidate);

      if (!Number.isSafeInteger(id) || id <= 0) {
        showToast("Invalid candidate ID");
        return;
      }

      const confirmed = window.confirm(
        "Permanently delete this candidate, their applications, interviews, and uploaded resume? This action cannot be undone."
      );

      if (!confirmed) return;

      button.disabled = true;

      try {
        await window.TalentFlowAPI.deleteCandidate(id);
        showToast("Candidate deleted successfully");

        // Refresh the existing candidate list
        await loadBackendData();
      } catch (error) {
        console.error("Delete candidate failed:", error);
        showToast(`Could not delete candidate: ${error.message}`);
      } finally {
        button.disabled = false;
      }
    };
  });
}




async function openCandidate(id) {
  const c = data.candidates.find(x => String(x.id) === String(id));
  if (!c) return;

  const experienceValue = Number.parseFloat(c.experience);
  const experience = Number.isFinite(experienceValue)
    ? experienceValue
    : "";

  openModal(
    "CANDIDATE",
    "Candidate Profile",
    `
      <div>
        <h3>${esc(c.name)}</h3>
        <p class="ai-main-text">
          ${esc(c.email)} · ${esc(c.experience)}
        </p>

        <div class="job-meta">
          <span class="tag">${esc(c.role)}</span>
          <span class="tag">AI Match ${c.score}%</span>
          <span class="tag">${esc(c.stage || "New")}</span>
        </div>

        <hr style="border:0;border-top:1px solid var(--line);margin:18px 0">

        <h4>Edit Candidate Profile</h4>

        <form class="modal-form" id="editCandidateForm">
          <div>
            <label for="editCandidateName">Full name</label>
            <input
              id="editCandidateName"
              value="${esc(c.name)}"
              required
            >
          </div>

          <div>
            <label for="editCandidateEmail">Email</label>
            <input
              id="editCandidateEmail"
              type="email"
              value="${esc(c.email)}"
              required
            >
          </div>

          <div>
            <label for="editCandidatePhone">Phone</label>
            <input
              id="editCandidatePhone"
              type="tel"
              value="${esc(c.phone || "")}"
            >
          </div>

          <div>
            <label for="editCandidateRole">Applied role</label>
            <input
              id="editCandidateRole"
              value="${esc(c.role === "Not specified" ? "" : c.role)}"
              required
            >
          </div>

          <div>
            <label for="editCandidateExperience">Experience (years)</label>
            <input
              id="editCandidateExperience"
              type="number"
              min="0"
              max="999.9"
              step="0.1"
              value="${experience}"
              required
            >
          </div>

          <div>
            <label for="editCandidateSkills">Skills (comma-separated)</label>
            <input
              id="editCandidateSkills"
              value="${esc((c.skills || []).join(", "))}"
              placeholder="AWS, Linux, Python"
            >
          </div>

          <button
            class="primary-button"
            id="saveCandidateProfile"
            type="submit"
          >
            Save Profile
          </button>
        </form>

        ${
          c.resumeUrl
            ? `
              <div style="margin-top: 16px;">
                <button
                  class="primary-button"
                  type="button"
                  id="downloadCandidateResume"
                >
                  Download Resume
                </button>
              </div>
            `
            : `
              <p class="ai-main-text">
                No resume uploaded for this candidate.
              </p>
            `
        }
      </div>
    `
  );

  // Download candidate resume
  const downloadButton = $("downloadCandidateResume");

  if (downloadButton) {
    downloadButton.onclick = async () => {
      const downloadTab = window.open("about:blank", "_blank");

      downloadButton.disabled = true;
      downloadButton.textContent = "Preparing download...";

      try {
        const result =
          await window.TalentFlowAPI.getCandidateResume(id);

        if (!result.downloadUrl) {
          throw new Error("Download URL was not returned");
        }

        if (downloadTab) {
          downloadTab.location.href = result.downloadUrl;
        } else {
          window.location.href = result.downloadUrl;
        }
      } catch (error) {
        if (downloadTab) downloadTab.close();

        console.error("Resume download failed:", error);
        showToast(`Could not download resume: ${error.message}`);
      } finally {
        downloadButton.disabled = false;
        downloadButton.textContent = "Download Resume";
      }
    };
  }

  // Save candidate profile
  $("editCandidateForm").onsubmit = async (e) => {
    e.preventDefault();

    const button = $("saveCandidateProfile");
    button.disabled = true;
    button.textContent = "Saving...";

    try {
      const payload = {
        full_name: $("editCandidateName").value.trim(),
        email: $("editCandidateEmail").value.trim(),
        phone: $("editCandidatePhone").value.trim() || null,
        applied_role: $("editCandidateRole").value.trim(),
        experience_years: Number(
          $("editCandidateExperience").value
        ),
        skills: $("editCandidateSkills").value
          .split(",")
          .map(skill => skill.trim())
          .filter(Boolean),
      };

      await window.TalentFlowAPI.updateCandidate(c.id, payload);
      await loadBackendData();

      closeModal();
      showToast("Candidate profile updated in PostgreSQL!");
    } catch (error) {
      console.error("Failed to update candidate profile:", error);
      showToast(`Could not save profile: ${error.message}`);

      button.disabled = false;
      button.textContent = "Save Profile";
    }
  };
}


function openInterview(id) {
    const interview = data.interviews.find(item => item.id === id);
    if (!interview) return;

    openModal(
        "INTERVIEW",
        "Interview Details",
        `
            <form class="modal-form" id="editInterviewForm">
                <div>
                    <h3>${esc(interview.candidate)}</h3>
                    <p class="ai-main-text">${esc(interview.role)}</p>
                </div>

                <div>
                    <label for="editInterviewDate">Date</label>
                    <input
                        type="date"
                        id="editInterviewDate"
                        value="${esc(interview.date)}"
                        required
                    >
                </div>

                <div>
                    <label for="editInterviewTime">Time</label>
                    <input
                        type="time"
                        id="editInterviewTime"
                        value="${esc(to24HourTime(interview.time))}"
                        required
                    >
                </div>

                <div>
                    <label for="editInterviewType">Interview Type</label>
                    <select id="editInterviewType">
                        ${["technical", "behavioral", "hr", "other"].map(type =>
                            `<option value="${type}"
                                ${interview.type === type ? "selected" : ""}>
                                ${type.charAt(0).toUpperCase() + type.slice(1)}
                            </option>`
                        ).join("")}
                    </select>
                </div>

                <div>
                    <label for="editInterviewer">Interviewer</label>
                    <input
                        id="editInterviewer"
                        value="${esc(interview.interviewer === "Not assigned" ? "" : interview.interviewer)}"
                        required
                    >
                </div>

                <div>
                    <label for="editInterviewStatus">Status</label>
                    <select id="editInterviewStatus">
                        ${["scheduled", "completed", "cancelled", "rescheduled"].map(status =>
                            `<option value="${status}"
                                ${interview.status.toLowerCase() === status ? "selected" : ""}>
                                ${status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>`
                        ).join("")}
                    </select>
                </div>

                <div>
                    <label for="editInterviewFeedback">Feedback</label>
                    <textarea id="editInterviewFeedback" rows="4">${esc(interview.feedback || "")}</textarea>
                </div>

                <button class="primary-button" id="saveInterviewChanges" type="submit">
                    Save Changes
                </button>
            </form>
        `
    );

    $("editInterviewForm").onsubmit = async (event) => {
        event.preventDefault();

        const button = $("saveInterviewChanges");
        button.disabled = true;
        button.textContent = "Saving...";

        try {
            const scheduledAt =
                `${$("editInterviewDate").value}T${$("editInterviewTime").value}:00`;

            await window.TalentFlowAPI.updateInterview(id, {
                scheduled_at: scheduledAt,
                interview_type: $("editInterviewType").value,
                interviewer_name: $("editInterviewer").value.trim(),
                status: $("editInterviewStatus").value,
                feedback: $("editInterviewFeedback").value.trim()
            });

            closeModal();
            await loadBackendData();
            showToast("Interview updated in PostgreSQL!");
        } catch (error) {
            console.error("Failed to update interview:", error);
            showToast(`Could not update interview: ${error.message}`);
            button.disabled = false;
            button.textContent = "Save Changes";
        }
    };
}

function openModal(kicker,title,body){$('modalKicker').textContent=kicker;$('modalTitle').textContent=title;$('modalBody').innerHTML=body;$('modalOverlay').classList.add('open')}
function closeModal(){$('modalOverlay').classList.remove('open')}


function addCandidate() {
  openModal(
    "TALENT POOL",
    "Add Candidate",
    `<form class="modal-form" id="candidateForm">
      <div>
        <label for="newName">Name</label>
        <input id="newName" required maxlength="150">
      </div>

      <div>
        <label for="newSkills">Skills</label>
        <input
          id="newSkills"
          type="text"
          placeholder="AWS, Linux, Python, Docker, Terraform"
        >
        <small>Enter skills separated by commas.</small>
      </div>

      <div>
        <label for="newEmail">Email</label>
        <input type="email" id="newEmail" required>
      </div>

      
      <div>
        <label for="newPhone">Phone</label>
        <input
          id="newPhone"
          type="tel"
          placeholder="Enter phone number"
          maxlength="30"
        >
      </div>


      <div>
        <label for="newRole">Position</label>
        <input id="newRole" required maxlength="150">
      </div>

      <div>
        <label for="newExperience">Experience (years)</label>
        <input
          id="newExperience"
          type="number"
          min="0"
          max="999.9"
          step="0.1"
          required
        >
      </div>

      <div>
        <label for="newResume">Resume (PDF, DOC, DOCX)</label>
        <input
          id="newResume"
          type="file"
          accept=".pdf,.doc,.docx"
        >
        <small>Optional. Maximum size: 5 MB.</small>
      </div>

      <button class="primary-button" type="submit">
        Add Candidate
      </button>
    </form>`
  );

  $("candidateForm").onsubmit = async (e) => {
    e.preventDefault();

    const button = e.currentTarget.querySelector(
      'button[type="submit"]'
    );
    const resume = $("newResume").files[0];

    if (resume) {
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      const allowedExtensions = /\.(pdf|doc|docx)$/i;

      if (
        resume.size > 5 * 1024 * 1024 ||
        !allowedExtensions.test(resume.name) ||
        !allowedTypes.includes(resume.type)
      ) {
        showToast("Choose a PDF, DOC, or DOCX file under 5 MB.");
        return;
      }
    }

    button.disabled = true;
    button.textContent = "Saving...";

    try {
      await window.TalentFlowAPI.createCandidate({
        full_name: $("newName").value.trim(),
        email: $("newEmail").value.trim(),
        applied_role: $("newRole").value.trim(),
        experience_years: Number($("newExperience").value),
        status: "new",
        source: "Website",
        skills: $("newSkills").value
          .split(",")
          .map(skill => skill.trim())
          .filter(Boolean),
        resume,
      });

      await loadBackendData();
      closeModal();
      showToast("Candidate saved successfully!");
    } catch (error) {
      console.error("Failed to create candidate:", error);
      showToast(`Could not save candidate: ${error.message}`);
      button.disabled = false;
      button.textContent = "Add Candidate";
    }
  };
}


function addApplication() {
    const availableJobs = data.jobs.filter(
        job => job.status === "open"
    );

    if (!data.candidates.length) {
        showToast("Add a candidate before creating an application.");
        return;
    }

    if (!availableJobs.length) {
        showToast("Create an open job before creating an application.");
        return;
    }

    openModal(
        "RECRUITMENT",
        "Create Application",
        `
            <form class="modal-form" id="applicationForm">
                <div>
                    <label for="applicationCandidate">Candidate</label>
                    <select id="applicationCandidate" required>
                        ${data.candidates.map(candidate => `
                            <option value="${candidate.id}">
                                ${esc(candidate.name)} — ${esc(candidate.email)}
                            </option>
                        `).join("")}
                    </select>
                </div>

                <div>
                    <label for="applicationJob">Open Job</label>
                    <select id="applicationJob" required>
                        ${availableJobs.map(job => `
                            <option value="${job.id}">
                                ${esc(job.title)}
                            </option>
                        `).join("")}
                    </select>
                </div>

                <button class="primary-button" type="submit">
                    Create Application
                </button>
            </form>
        `
    );

    $("applicationForm").onsubmit = async (event) => {
        event.preventDefault();

        const button = event.currentTarget.querySelector(
            'button[type="submit"]'
        );

        button.disabled = true;
        button.textContent = "Saving...";

        try {
            await window.TalentFlowAPI.createApplication({
                candidate_id: Number($("applicationCandidate").value),
                job_id: Number($("applicationJob").value)
            });

            closeModal();
            await loadBackendData();
            showToast("Application created successfully!");
        } catch (error) {
            console.error("Failed to create application:", error);
            showToast(`Could not create application: ${error.message}`);
            button.disabled = false;
            button.textContent = "Create Application";
        }
    };
}



function addJob() {
  openModal(
    "RECRUITMENT",
    "Create Job",
    `
      <form class="modal-form" id="jobForm">
        <div>
          <label for="jobTitle">Job Title</label>
          <input id="jobTitle" required>
        </div>

        <div>
          <label for="jobDept">Department</label>
          <input id="jobDept" required>
        </div>

        <div>
          <label for="jobLocation">Location</label>
          <input id="jobLocation" required>
        </div>

        <div>
          <label for="jobRequirements">Required Skills / Requirements</label>
          <textarea
            id="jobRequirements"
            rows="4"
            placeholder="e.g. Linux, AWS, Docker, Networking"
          ></textarea>
        </div>

        <div>
          <label for="jobType">Employment Type</label>
          <select id="jobType">
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
        </div>

        <button class="primary-button" type="submit">
          Create Job
        </button>
      </form>
    `
  );

  $("jobForm").onsubmit = async (e) => {
    e.preventDefault();

    const button = e.currentTarget.querySelector(
      'button[type="submit"]'
    );

    button.disabled = true;
    button.textContent = "Saving...";

    const job = {
      title: $("jobTitle").value.trim(),
      department: $("jobDept").value.trim(),
      location: $("jobLocation").value.trim(),
      requirements: $("jobRequirements").value.trim(),
      employment_type: $("jobType").value,
    };

    try {
      await window.TalentFlowAPI.createJob(job);
      await loadBackendData();
      closeModal();
      showToast("Job opening created successfully");
    } catch (error) {
      console.error("Create job failed:", error);
      showToast(error.message || "Failed to create job");
      button.disabled = false;
      button.textContent = "Create Job";
    }
  };
}


function scheduleInterview() {
    if (!data.applications.length) {
        showToast("Create an application before scheduling an interview.");
        return;
    }

    const applicationOptions = data.applications.map(application => `
        <option value="${application.id}">
            ${esc(application.candidate_name)} — ${esc(application.job_title)}
        </option>
    `).join("");

    openModal(
        "INTERVIEW MANAGEMENT",
        "Schedule Interview",
        `
            <form class="modal-form" id="interviewForm">
                <div>
                    <label for="intApplication">Application</label>
                    <select id="intApplication" required>
                        ${applicationOptions}
                    </select>
                </div>

                <div>
                    <label for="intDate">Date</label>
                    <input type="date" id="intDate" required>
                </div>

                <div>
                    <label for="intTime">Time</label>
                    <input type="time" id="intTime" required>
                </div>

                <div>
                    <label for="intType">Interview Type</label>
                    <select id="intType" required>
                        <option value="technical">Technical</option>
                        <option value="behavioral">Behavioral</option>
                        <option value="hr">HR</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <div>
                    <label for="intInterviewer">Interviewer Name</label>
                    <input id="intInterviewer" required>
                </div>

                <button class="primary-button" type="submit">
                    Schedule Interview
                </button>
            </form>
        `
    );

    $("interviewForm").onsubmit = async (event) => {
        event.preventDefault();

        const button = event.currentTarget.querySelector(
            'button[type="submit"]'
        );

        button.disabled = true;
        button.textContent = "Saving...";

        const scheduledAt =
            `${$("intDate").value}T${$("intTime").value}:00`;

        try {
            await window.TalentFlowAPI.createInterview({
                application_id: Number($("intApplication").value),
                scheduled_at: scheduledAt,
                interview_type: $("intType").value,
                interviewer_name: $("intInterviewer").value.trim()
            });

            await loadBackendData();
            closeModal();
            showToast("Interview saved to PostgreSQL!");
        } catch (error) {
            console.error("Failed to schedule interview:", error);
            showToast(`Could not schedule interview: ${error.message}`);

            button.disabled = false;
            button.textContent = "Schedule Interview";
        }
    };
}

function initActions(){
    document.querySelectorAll('[data-action="add-application"]')
        .forEach(button => button.onclick = addApplication);
    document.querySelectorAll('[data-action="add-candidate"]')
        .forEach(b=>b.onclick=addCandidate);
    document.querySelectorAll('[data-action="add-job"]')
        .forEach(b=>b.onclick=addJob);
    document.querySelectorAll('[data-action="schedule-interview"]')
        .forEach(b=>b.onclick=scheduleInterview);
    $('modalClose').onclick=closeModal;$('modalOverlay').onclick=e=>{if(e.target===$('modalOverlay'))closeModal();};$('themeToggle').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('talentflow_theme',document.body.classList.contains('dark')?'dark':'light')};if(localStorage.getItem('talentflow_theme')==='dark')document.body.classList.add('dark');$('notificationButton').onclick=()=>{$('notificationPanel').classList.toggle('hidden');$('notificationDot').style.display='none'};$('clearNotifications').onclick=()=>{$('notificationList').innerHTML='<p style="padding:15px;color:var(--muted);font-size:12px">No new notifications.</p>'};
$("generateInsight").onclick = async () => {
  const button = $("generateInsight");
  const content = $("aiInsightContent");

  button.disabled = true;
  button.textContent = "Generating...";
  content.textContent = "Analyzing recruitment data...";

  try {
    
const result = await window.TalentFlowAPI.getAIInsights();

    
content.replaceChildren();

const insight = result.insight || "";
const lines = insight.split("\n");
let list = null;

lines.forEach(line => {
  const text = line.trim();

  
if (!text || /^[-*_]{3,}$/.test(text)) return;

const cleanedText = text
  .replace(/\*\*(.*?)\*\*/g, "$1")
  .replace(/__(.*?)__/g, "$1")
  .replace(/^#{1,3}\s*/, "");


  if (!text) return;

  // Render Markdown headings
  if (/^#{1,3}\s|\*\*.*\*\*$/.test(text)) {
    const heading = document.createElement("h4");
    heading.textContent = cleanedText
      .replace(/^#{1,3}\s*/, "")
      .replace(/^\*\*|\*\*$/g, "");
    content.appendChild(heading);
    list = null;
    return;
  }

  // Render bullet points
  if (/^[-*]\s/.test(text)) {
    if (!list) {
      list = document.createElement("ul");
      content.appendChild(list);
    }

    const item = document.createElement("li");
    item.textContent = cleanedText.replace(/^[-*]\s+/, "");
    list.appendChild(item);
    return;
  }

  // Render normal paragraphs
  list = null;
  const paragraph = document.createElement("p");
  paragraph.className = "ai-main-text";
  paragraph.textContent = text;
  content.appendChild(paragraph);
});


    showToast("AI insight generated");
  } catch (error) {
    console.error("AI insight error:", error);
    content.textContent =
      error.message || "Unable to generate insight.";

    showToast("Failed to generate AI insight");
  } finally {
    button.disabled = false;
    button.textContent = "Generate AI Insight";
  }
};

}



async function boot() {
  initAuth();
  initNavigation();
  initActions();

  if (!currentUser) {
    $("app").classList.add("hidden");
    $("authScreen").classList.remove("hidden");
    return;
  }

  $("authScreen").classList.add("hidden");
  $("app").classList.remove("hidden");

  updateUserUI();
  await loadBackendData();
}

boot();