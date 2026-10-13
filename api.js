
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

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    console.error("API network request failed:", error);

    throw new Error(
      "Unable to connect to the server. Please check your connection and try again."
    );
  }

  // Handle empty responses, including HTTP 204.
  if (response.status === 204) {
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

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
  getCandidates: () => apiRequest("/candidates"),

  createCandidate: (candidate) =>
    apiRequest("/candidates", {
      method: "POST",
      body: JSON.stringify(candidate),
    }),

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
