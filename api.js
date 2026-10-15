
const API_BASE_URL = (() => {
  const hostname = window.location.hostname;

  // Local development
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:5000/api";
  }

  // Production: CloudFront routes /api/* requests to the ALB
  return `${window.location.origin}/api`;
})();

async function apiRequest(path, options = {}) {
  let response;

  // Never manually set Content-Type for FormData.
  // The browser must add the multipart boundary automatically.
  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;


  const headers = { ...options.headers };

  // Attach JWT to authenticated API requests.
  const token = localStorage.getItem("talentflow_token");

  if (token && !Object.keys(headers).some(
    key => key.toLowerCase() === "authorization"
  )) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.body !== undefined && !isFormData) {
    if (!Object.keys(headers).some(
      (key) => key.toLowerCase() === "content-type"
    )) {
      headers["Content-Type"] = "application/json";
    }
  }

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error("API network request failed:", error);

    throw new Error(
      "Unable to connect to the server. Please check your connection and try again."
    );
  }

  if (response.status === 204) {
    return null;
  }

  let result;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    const message =
      result && typeof result.error === "string"
        ? result.error
        : `Request failed: ${response.status}`;

    throw new Error(message);
  }

  if (result === null) {
    throw new Error("The server returned an invalid response.");
  }

  return result;
}

window.TalentFlowAPI = {
  // Candidates
  

register: (full_name, email, password) =>
  apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ full_name, email, password }),
  }),

login: async (email, password) => {
  const result = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem("talentflow_token", result.token);
  localStorage.setItem("talentflow_user", JSON.stringify(result.user));

  return result;
},

logout: () => {
  localStorage.removeItem("talentflow_token");
  localStorage.removeItem("talentflow_user");
},

getAIInsights: () =>
  apiRequest("/ai/insights", {
    method: "POST",
    body: JSON.stringify({}),
  }),


  // Candidates
  getCandidates: () => apiRequest("/candidates"),

  getCandidateResume: (id) =>
    apiRequest(`/candidates/${id}/resume`),


  createCandidate: (candidate) => {
    const { resume, ...candidateData } = candidate;

    // Existing JSON flow when no resume is selected
    if (!resume) {
      return apiRequest("/candidates", {
        method: "POST",
        body: JSON.stringify(candidateData),
      });
    }

    // Multipart flow when a resume is selected
    const formData = new FormData();

    Object.entries(candidateData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(
          key,
          Array.isArray(value) ? JSON.stringify(value) : String(value)
        );
      }
    });

    formData.append("resume", resume);

    return apiRequest("/candidates", {
      method: "POST",
      body: formData,
    });
  },

  updateCandidate: (id, candidate) =>
    apiRequest(`/candidates/${id}`, {
      method: "PUT",
      body: JSON.stringify(candidate),
    }),

  updateCandidateStatus: (id, stage) =>
    apiRequest(`/candidates/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ stage }),
    }),

    deleteCandidate: (id) =>
    apiRequest(`/candidates/${id}`, {
      method: "DELETE",
    }),

  // Jobs
  getJobs: () => apiRequest("/jobs"),

  createJob: (job) =>
    apiRequest("/jobs", {
      method: "POST",
      body: JSON.stringify(job),
    }),

  updateJob: (id, job) =>
    apiRequest(`/jobs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(job),
    }),

  
  deleteJob: (id) =>
    apiRequest(`/jobs/${id}`, {
      method: "DELETE",
    }),


  // Applications
  getApplications: () => apiRequest("/applications"),

  createApplication: (application) =>
    apiRequest("/applications", {
      method: "POST",
      body: JSON.stringify(application),
    }),

  updateApplicationStage: (id, stage) =>
    apiRequest(`/applications/${id}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stage }),
    }),

  // Interviews
  getInterviews: () => apiRequest("/interviews"),

  createInterview: (interview) =>
    apiRequest("/interviews", {
      method: "POST",
      body: JSON.stringify(interview),
    }),

  updateInterview: (id, updates) =>
    apiRequest(`/interviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),
};
