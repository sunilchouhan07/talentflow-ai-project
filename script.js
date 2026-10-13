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
      const statusMap = {
        new: "Applied",
        applied: "Applied",
        screening: "Screening",
        shortlisted: "Shortlisted",
        interview: "Interview",
        offered: "Offer",
        offer: "Offer",
        hired: "Hired",
        rejected: "Rejected",
      };

      return {
        id: Number(c.id),
        name: c.full_name,
        email: c.email,
        role: c.applied_role || c.role || "Not specified",
        experience:
          c.experience_years == null
            ? "Not specified"
            : `${c.experience_years} years`,
        score: Number(c.match_score ?? 0),
        stage: statusMap[String(c.status || "new").toLowerCase()] || "Applied",
        applied: c.created_at?.slice(0, 10) || "",
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

function initAuth(){
 if(currentUser){$('authScreen').classList.add('hidden');$('app').classList.remove('hidden');updateUserUI();renderAll();}
 $('showRegister').onclick=()=>{$('loginPanel').classList.add('hidden');$('registerPanel').classList.remove('hidden')};
 $('showLogin').onclick=()=>{$('registerPanel').classList.add('hidden');$('loginPanel').classList.remove('hidden')};
 document.querySelectorAll('.password-toggle').forEach(btn=>btn.onclick=()=>{const input=$(btn.dataset.target);input.type=input.type==='password'?'text':'password';btn.textContent=input.type==='password'?'Show':'Hide'});
 $('loginForm').onsubmit=e=>{e.preventDefault();const email=$('loginEmail').value.trim(),pass=$('loginPassword').value;if(email==='admin@talentflowai.com'&&pass==='Admin@123'){currentUser={name:'Admin',email};localStorage.setItem(SESSION_KEY,JSON.stringify(currentUser));$('authScreen').classList.add('hidden');$('app').classList.remove('hidden');updateUserUI();renderAll();showToast('Welcome to TalentFlow AI')}else showToast('Create account')};
 $('registerForm').onsubmit=e=>{e.preventDefault();if($('registerPassword').value!==$('registerConfirmPassword').value)return showToast('Passwords do not match');currentUser={name:$('registerFirstName').value+' '+$('registerLastName').value,email:$('registerEmail').value};localStorage.setItem(SESSION_KEY,JSON.stringify(currentUser));$('authScreen').classList.add('hidden');$('app').classList.remove('hidden');updateUserUI();renderAll();showToast('Account created successfully')};
 $('forgotPassword').onclick=()=>showToast('Password reset instructions would be sent to your email.');
}
function updateUserUI(){const u=currentUser||{name:'Admin',email:'admin@talentflowai.com'};$('sidebarUserName').textContent=u.name;$('sidebarUserEmail').textContent=u.email;$('sidebarAvatar').textContent=initials(u.name);$('welcomeName').textContent=u.name.split(' ')[0]}

function initNavigation(){
 document.querySelectorAll('.nav-item[data-page]').forEach(btn=>btn.onclick=()=>navigate(btn.dataset.page));
 document.querySelectorAll('[data-page-link]').forEach(btn=>btn.onclick=()=>navigate(btn.dataset.pageLink));
 $('mobileMenu').onclick=()=>{$('sidebar').classList.toggle('open');$('sidebarOverlay').classList.toggle('open')};
 $('sidebarOverlay').onclick=()=>{$('sidebar').classList.remove('open');$('sidebarOverlay').classList.remove('open')};
 $('logoutButton').onclick=()=>{localStorage.removeItem(SESSION_KEY);location.reload()};
}
function navigate(page){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));const target=$('page-'+page);if(target)target.classList.add('active');document.querySelectorAll('.nav-item[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));const titles={dashboard:'Recruitment Dashboard',candidates:'Candidates',applications: "Applications",jobs:'Job Openings',interviews:'Scheduled Interviews',pipeline:'Candidate Pipeline',analytics:'Recruitment Analytics',settings:'Settings'};$('pageTitle').textContent=titles[page]||'TalentFlow AI';$('sidebar').classList.remove('open');$('sidebarOverlay').classList.remove('open');renderAll()}

function renderStats(){const c=data.candidates;$('totalCandidates').textContent=c.length;$('shortlistedCandidates').textContent=c.filter(x=>['Shortlisted','Interview','Offer'].includes(x.stage)).length;$('totalInterviews').textContent=data.interviews.length;$('totalHired').textContent=c.filter(x=>x.stage==='Hired').length;$('interviewNavCount').textContent=data.interviews.length}

function renderDashboard() {
  // 1. Dashboard statistics
  $("totalCandidates").textContent = data.candidates.length;

  $("shortlistedCandidates").textContent =
    data.candidates.filter(c =>
      String(c.stage || "").toLowerCase() === "shortlisted"
    ).length;

  $("totalInterviews").textContent = data.interviews.length;

  $("totalHired").textContent =
    data.candidates.filter(c =>
      String(c.stage || "").toLowerCase() === "hired"
    ).length;

  // 2. Upcoming interviews
  const list = data.interviews.slice(0, 4);

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
  $("recentCandidateBody").innerHTML = data.candidates
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
        </td>
      </tr>
    `)
    .join("");

  bindCandidateButtons();
}

function renderCandidates(){
 const q=($('candidateSearch').value||'').toLowerCase(),status=$('candidateStatusFilter').value,role=$('candidateRoleFilter').value,sort=$('candidateSort').value;
 let arr=data.candidates.filter(c=>(!q||`${c.name} ${c.email} ${c.role}`.toLowerCase().includes(q))&&(status==='all'||c.stage===status)&&(role==='all'||c.role===role));
 if(sort==='score')arr.sort((a,b)=>b.score-a.score);if(sort==='name')arr.sort((a,b)=>a.name.localeCompare(b.name));if(sort==='recent')arr.sort((a,b)=>b.applied.localeCompare(a.applied));
 $('candidateResultCount').textContent=`${arr.length} candidate${arr.length!==1?'s':''}`;$('candidateTableBody').innerHTML=arr.map(c=>`<tr><td><strong>${esc(c.name)}</strong><br><small>${esc(c.email)}</small></td><td>${esc(c.role)}</td><td>${esc(c.experience)}</td><td><strong>${c.score}%</strong></td><td><span class="tag">${esc(c.stage)}</span></td><td>${fmtDate(c.applied)}</td><td><button class="link-button" data-candidate="${c.id}">View</button></td></tr>`).join('');bindCandidateButtons();
}


function renderJobs() {
  $("jobsGrid").innerHTML = data.jobs.map(j => `
    <div class="job-card">
      <span class="section-kicker">${esc(j.department)}</span>
      <h3>${esc(j.title)}</h3>
      <p>${esc(j.location)} · ${esc(j.type)}</p>

      <div class="job-meta">
        <span class="tag">${j.applicants} applicants</span>
        <span class="tag">${esc(j.status || "open")}</span>
      </div>

      <button
        class="link-button"
        type="button"
        data-edit-job="${j.id}"
      >
        Edit Job
      </button>
    </div>
  `).join("");

  document.querySelectorAll("[data-edit-job]").forEach(button => {
    button.onclick = () => editJob(Number(button.dataset.editJob));
  });
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
            </td>
        </tr>
    `).join("");

    document.querySelectorAll("[data-save-application]").forEach(button => {
        button.onclick = () =>
            updateApplicationStage(Number(button.dataset.saveApplication));
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

function renderPipeline(){const stages=['Applied','Screening','Shortlisted','Interview','Offer','Hired'];$('pipelineBoard').innerHTML=stages.map(s=>`<div class="pipeline-column"><h4>${s} <span class="pipeline-count">(${data.candidates.filter(c=>c.stage===s).length})</span></h4>${data.candidates.filter(c=>c.stage===s).map(c=>`<div class="pipeline-card"><strong>${esc(c.name)}</strong><span>${esc(c.role)}</span><span>AI Match ${c.score}%</span></div>`).join('')||'<span class="pipeline-count">No candidates</span>'}</div>`).join('')}
function renderAnalytics(){const stages=['Applied','Screening','Shortlisted','Interview','Offer','Hired'];$('funnelChart').innerHTML=stages.map(s=>{const n=data.candidates.filter(c=>c.stage===s).length;const pct=data.candidates.length?Math.round(n/data.candidates.length*100):0;return `<div class="chart-row"><span class="chart-label">${s}</span><div class="chart-bar"><div class="chart-fill" style="width:${pct}%"></div></div><span class="chart-value">${n}</span></div>`}).join('');const sources={};data.candidates.forEach(c=>sources[c.source]=(sources[c.source]||0)+1);$('sourceChart').innerHTML=Object.entries(sources).map(([s,n])=>{const pct=Math.round(n/data.candidates.length*100);return `<div class="chart-row"><span class="chart-label">${esc(s)}</span><div class="chart-bar"><div class="chart-fill" style="width:${pct}%"></div></div><span class="chart-value">${n}</span></div>`}).join('')||'<p class="ai-main-text">No source data yet.</p>'}
function renderSettings(){$('settingAI').checked=data.settings.ai;$('settingNotifications').checked=data.settings.notifications;$('settingCompact').checked=data.settings.compact;document.body.classList.toggle('compact-tables',data.settings.compact)}
function renderAll(){renderStats();renderDashboard();populateRoleFilter();renderCandidates();renderJobs();renderApplications();renderInterviews();renderPipeline();renderAnalytics();renderSettings()}
function populateRoleFilter(){const select=$('candidateRoleFilter'),value=select.value,roles=[...new Set(data.candidates.map(c=>c.role))];select.innerHTML='<option value="all">All positions</option>'+roles.map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join('');select.value=roles.includes(value)?value:'all'}
function bindCandidateButtons(){document.querySelectorAll('[data-candidate]').forEach(b=>b.onclick=()=>openCandidate(+b.dataset.candidate))}



async function openCandidate(id) {
  const c = data.candidates.find(x => x.id === id);
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
        <p class="ai-main-text">${esc(c.email)} · ${esc(c.experience)}</p>

        <div class="job-meta">
          <span class="tag">${esc(c.role)}</span>
          <span class="tag">AI Match ${c.score}%</span>
          <span class="tag">${esc(c.stage)}</span>
        </div>

        <hr style="border:0;border-top:1px solid var(--line);margin:18px 0">

        <h4>Edit Candidate Profile</h4>

        <form class="modal-form" id="editCandidateForm">
          <div>
            <label for="editCandidateName">Full name</label>
            <input id="editCandidateName" value="${esc(c.name)}" required>
          </div>

          <div>
            <label for="editCandidateEmail">Email</label>
            <input id="editCandidateEmail" type="email"
              value="${esc(c.email)}" required>
          </div>

          <div>
            <label for="editCandidatePhone">Phone</label>
            <input id="editCandidatePhone" type="tel"
              value="${esc(c.phone || "")}">
          </div>

          <div>
            <label for="editCandidateRole">Applied role</label>
            <input id="editCandidateRole" value="${esc(c.role === "Not specified" ? "" : c.role)}" required>
          </div>

          <div>
            <label for="editCandidateExperience">Experience (years)</label>
            <input id="editCandidateExperience" type="number"
              min="0" max="999.9" step="0.1"
              value="${experience}" required>
          </div>

          <div>
            <label for="editCandidateSkills">Skills (comma-separated)</label>
            <input id="editCandidateSkills"
              value="${esc((c.skills || []).join(", "))}"
              placeholder="AWS, Linux, Python">
          </div>

          <button class="primary-button" id="saveCandidateProfile" type="submit">
            Save Profile
          </button>
        </form>

        <hr style="border:0;border-top:1px solid var(--line);margin:20px 0">

        <label for="candidateStageEdit">Update hiring stage</label>
        <select id="candidateStageEdit" class="form-control">
          ${["Applied", "Screening", "Shortlisted", "Interview", "Offer", "Hired", "Rejected"]
            .map(stage => `<option ${stage === c.stage ? "selected" : ""}>${stage}</option>`)
            .join("")}
        </select>

        <button class="primary-button" id="saveCandidateStage"
          type="button" style="margin-top:14px">
          Save Stage
        </button>
      </div>
    `
  );

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
        experience_years: Number($("editCandidateExperience").value),
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

  // Save hiring stage (existing backend functionality)
  $("saveCandidateStage").onclick = async () => {
    const button = $("saveCandidateStage");
    const selectedStage = $("candidateStageEdit").value;

    button.disabled = true;
    button.textContent = "Saving...";

    try {
      await window.TalentFlowAPI.updateCandidateStatus(c.id, selectedStage);
      await loadBackendData();

      closeModal();
      showToast("Candidate stage saved to PostgreSQL!");
    } catch (error) {
      console.error("Failed to update candidate stage:", error);
      showToast(`Could not update stage: ${error.message}`);
      button.disabled = false;
      button.textContent = "Save Stage";
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
        <label>Name</label>
        <input id="newName" required>
      </div>
      <div>
        <label>Email</label>
        <input type="email" id="newEmail" required>
      </div>
      <div>
        <label>Position</label>
        <input id="newRole" required>
      </div>
      <div>
        <label>Experience (years)</label>
        <input id="newExperience" type="number" min="0" step="0.5" required>
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

    button.disabled = true;
    button.textContent = "Saving...";

    try {
      const experience = Number($("newExperience").value);

      await window.TalentFlowAPI.createCandidate({
        full_name: $("newName").value.trim(),
        email: $("newEmail").value.trim(),
        applied_role: $("newRole").value.trim(),
        experience_years: experience,
        status: "new",
        source: "Website",
      });

      await loadBackendData();

      closeModal();
      showToast("Candidate saved to PostgreSQL!");
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
    const response = await fetch(
      "http://localhost:5000/api/ai/insights",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "AI request failed"
      );
    }

    
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