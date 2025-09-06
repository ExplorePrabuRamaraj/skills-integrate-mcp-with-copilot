
document.addEventListener("DOMContentLoaded", () => {
  // --- Top menu navigation logic ---
  const menuLinks = document.querySelectorAll('.top-menu .menu-link');
  const sections = [
    'dashboard-container',
    'activities-container',
    'signup-container',
    'student-profile-container',
    'attendance-mark-container',
    'attendance-history-container',
    'notification-send-container',
    'notification-history-container'
  ];

  function showSection(sectionId) {
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = (id === sectionId) ? 'block' : 'none';
      }
    });
    menuLinks.forEach(link => {
      if (link.getAttribute('href') === '#' + sectionId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Initial view: show dashboard
  showSection('dashboard-container');

  menuLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = link.getAttribute('href').replace('#', '');
      showSection(targetId);
    });
  });
  const dashboardTotal = document.getElementById("dashboard-total");
  const dashboardParticipants = document.getElementById("dashboard-participants");
  const dashboardActivityList = document.getElementById("dashboard-activity-list");
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch dashboard stats from API
  async function fetchDashboard() {
    try {
      const response = await fetch("/dashboard");
      const dashboard = await response.json();
      dashboardTotal.textContent = `Total Activities: ${dashboard.total_activities}`;
      dashboardParticipants.textContent = `Total Participants: ${dashboard.total_participants}`;
      // Render activity stats
      dashboardActivityList.innerHTML = "<h4>Activities Overview</h4>";
      dashboardActivityList.innerHTML += `<ul>${dashboard.activity_stats.map(stat => `<li><strong>${stat.name}</strong>: ${stat.participants} participants, ${stat.spots_left} spots left</li>`).join("")}</ul>`;
    } catch (error) {
      dashboardTotal.textContent = "Failed to load dashboard.";
      dashboardParticipants.textContent = "";
      dashboardActivityList.textContent = "";
      console.error("Error fetching dashboard:", error);
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";


      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with name and grade
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (p) =>
                      `<li><span class="participant-email">${p.email}</span> <span class="participant-name">${p.name ? p.name : ""}</span> <span class="participant-grade">${p.grade ? p.grade : ""}</span> <button class="delete-btn" data-activity="${name}" data-email="${p.email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("name").value;
    const grade = document.getElementById("grade").value;
    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const params = new URLSearchParams({
        email,
        name,
        grade
      });
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?${params.toString()}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Handle student profile form
  const profileForm = document.getElementById("profile-form");
  const profileResult = document.getElementById("profile-result");
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("profile-email").value;
    try {
      const response = await fetch(`/students/${encodeURIComponent(email)}`);
      if (response.ok) {
        const profile = await response.json();
        let activitiesHTML = "";
        if (profile.activities && profile.activities.length > 0) {
          activitiesHTML = `<h5>Activities:</h5><ul>${profile.activities.map(a => `<li><strong>${a.name}</strong>: ${a.description} <em>(${a.schedule})</em></li>`).join("")}</ul>`;
        } else {
          activitiesHTML = `<p><em>No activities found.</em></p>`;
        }
        profileResult.innerHTML = `<div class=\"activity-card\"><h4>Student Profile</h4><p><strong>Email:</strong> ${profile.email}</p><p><strong>Name:</strong> ${profile.name}</p><p><strong>Grade:</strong> ${profile.grade}</p>${activitiesHTML}</div>`;
      } else {
        const error = await response.json();
  profileResult.innerHTML = `<div class="error">${error.detail || "Student not found."}</div>`;
      }
    } catch (err) {
      profileResult.innerHTML = `<div class="error">Failed to fetch profile.</div>`;
    }
  });

  // Attendance Marking
  const attendanceMarkForm = document.getElementById("attendance-mark-form");
  const attendanceMarkMessage = document.getElementById("attendance-mark-message");
  attendanceMarkForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const activity = document.getElementById("attendance-activity").value;
    const studentEmail = document.getElementById("attendance-email").value;
    const date = document.getElementById("attendance-date").value;
    const present = document.getElementById("attendance-present").value === "true";
    const userEmail = document.getElementById("attendance-user-email").value;
    try {
      const params = new URLSearchParams({ student_email: studentEmail, date, present, user_email: userEmail });
      const response = await fetch(`/activities/${encodeURIComponent(activity)}/attendance?${params.toString()}`, { method: "POST" });
      const result = await response.json();
      if (response.ok) {
        attendanceMarkMessage.textContent = result.message;
        attendanceMarkMessage.className = "success";
      } else {
        attendanceMarkMessage.textContent = result.detail || "An error occurred";
        attendanceMarkMessage.className = "error";
      }
    } catch (error) {
      attendanceMarkMessage.textContent = "Failed to mark attendance.";
      attendanceMarkMessage.className = "error";
    }
  });

  // Attendance History
  const attendanceHistoryForm = document.getElementById("attendance-history-form");
  const attendanceHistoryResult = document.getElementById("attendance-history-result");
  attendanceHistoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("attendance-history-email").value;
    const userEmail = document.getElementById("attendance-history-user-email").value;
    try {
      const params = new URLSearchParams({ user_email: userEmail });
      const response = await fetch(`/students/${encodeURIComponent(email)}/attendance?${params.toString()}`);
      if (response.ok) {
        const records = await response.json();
        if (records.length > 0) {
          attendanceHistoryResult.innerHTML = `<ul>${records.map(r => `<li>Activity ID: ${r.activity_id}, Date: ${r.date}, Present: ${r.present ? "Yes" : "No"}</li>`).join("")}</ul>`;
        } else {
          attendanceHistoryResult.innerHTML = `<p><em>No attendance records found.</em></p>`;
        }
      } else {
        const error = await response.json();
        attendanceHistoryResult.innerHTML = `<div class="error">${error.detail || "Error fetching attendance."}</div>`;
      }
    } catch (err) {
      attendanceHistoryResult.innerHTML = `<div class="error">Failed to fetch attendance.</div>`;
    }
  });

  // Notification Sending
  const notificationSendForm = document.getElementById("notification-send-form");
  const notificationSendMessage = document.getElementById("notification-send-message");
  notificationSendForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("notification-email").value;
    const message = document.getElementById("notification-message").value;
    const userEmail = document.getElementById("notification-user-email").value;
    try {
      const params = new URLSearchParams({ message, user_email: userEmail });
      const response = await fetch(`/students/${encodeURIComponent(email)}/notify?${params.toString()}`, { method: "POST" });
      const result = await response.json();
      if (response.ok) {
        notificationSendMessage.textContent = result.message;
        notificationSendMessage.className = "success";
      } else {
        notificationSendMessage.textContent = result.detail || "An error occurred";
        notificationSendMessage.className = "error";
      }
    } catch (error) {
      notificationSendMessage.textContent = "Failed to send notification.";
      notificationSendMessage.className = "error";
    }
  });

  // Notification History
  const notificationHistoryForm = document.getElementById("notification-history-form");
  const notificationHistoryResult = document.getElementById("notification-history-result");
  notificationHistoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("notification-history-email").value;
    try {
      const response = await fetch(`/students/${encodeURIComponent(email)}/notifications`);
      if (response.ok) {
        const notifications = await response.json();
        if (notifications.length > 0) {
          notificationHistoryResult.innerHTML = `<ul>${notifications.map(n => `<li>${n.message} (${n.sent ? "Sent" : "Not sent"})</li>`).join("")}</ul>`;
        } else {
          notificationHistoryResult.innerHTML = `<p><em>No notifications found.</em></p>`;
        }
      } else {
        const error = await response.json();
        notificationHistoryResult.innerHTML = `<div class="error">${error.detail || "Error fetching notifications."}</div>`;
      }
    } catch (err) {
      notificationHistoryResult.innerHTML = `<div class="error">Failed to fetch notifications.</div>`;
    }
  });

  // Initialize app
  fetchDashboard();
  fetchActivities();
});
