
# 🎉 Eventro 
## The Next-Gen Event Management Platform

<p align="center">
  <img src="public/logo.png" alt="Eventro Logo" width="120" />
</p>

<p align="center">
  <b>Discover. Organize. Experience. All in one place.</b>
</p>

---

## 🌍 Live Demo

Check out the live deployed version of Eventro:

👉 [https://eventro0.netlify.app/](https://eventro0.netlify.app/)

---

## 🚀 Overview
Eventro is a modern, AI-powered event management platform designed for both organizers and attendees. With seamless registration, smart recommendations, analytics, and a beautiful UI, Eventro makes every event memorable and efficient.

---

## ✨ Features

### For Attendees
- 🌎 <b>Discover Events</b>: Browse and search for events in your area
- 📝 <b>Easy Registration</b>: Register for events in seconds
- 🧠 <b>Personalized Recommendations</b>: AI-powered suggestions tailored to your interests
- 🎟️ <b>Digital Tickets</b>: QR code tickets for fast check-in
- 💬 <b>Contact Organizers</b>: Direct messaging with event hosts
- ❤️ <b>Favorites</b>: Save and revisit your favorite events

### For Organizers
- 🆕 <b>Event Creation</b>: Publish events with rich details and images
- 👥 <b>Attendee Management</b>: Upload, manage, and communicate with attendees
- ✅ <b>Check-In System</b>: QR code scanning for smooth entry
- 📦 <b>Distribution Tracking</b>: Manage swag, lunch, and more
- 📊 <b>Analytics Dashboard</b>: Real-time insights and performance metrics
- 📣 <b>Feedback Management</b>: Collect and analyze attendee feedback
- 📨 <b>Messaging System</b>: Built-in communication tools

---

## 🛠️ Tech Stack

- <b>Frontend</b>: React, TypeScript, Vite
- <b>UI</b>: shadcn/ui, Tailwind CSS
- <b>Database</b>: Supabase
- <b>Maps</b>: Mapbox
- <b>AI</b>: Google Gemini API
- <b>Email</b>: SMTP (Gmail)
- <b>QR Scanning</b>: qr-scanner

---

## 📂 Project Structure

<details>
<summary>Click to expand full folder tree</summary>

```
eventro/
├── bun.lockb
├── components.json
├── email-server.js
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── README.md
├── tailwind.config.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── public/
│   ├── favicon.ico
│   ├── logo.png
│   ├── placeholder.svg
│   └── robots.txt
├── src/
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── Categories.tsx
│   │   ├── ContactOrganizerModal.tsx
│   │   ├── DynamicPricing.tsx
│   │   ├── EventCard.tsx
│   │   ├── EventPaths.tsx
│   │   ├── EventRegistration.tsx
│   │   ├── Footer.tsx
│   │   ├── Hero.tsx
│   │   ├── InterestSelector.tsx
│   │   ├── LocationMap.tsx
│   │   ├── Navbar.tsx
│   │   ├── PersonalizedRecommendations.tsx
│   │   ├── admin/
│   │   │   ├── AttendeeUpload.tsx
│   │   │   ├── CheckIn.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── DashboardAnalytics.tsx
│   │   │   ├── Distribution.tsx
│   │   │   ├── EventActivities.tsx
│   │   │   ├── EventAnalytics.tsx
│   │   │   ├── EventCalendar.tsx
│   │   │   ├── EventFinancials.tsx
│   │   │   ├── FeedbackManagement.tsx
│   │   │   ├── Messages.tsx
│   │   │   └── UserEvents.tsx
│   │   ├── profile/
│   │   │   ├── FeedbackForm.tsx
│   │   │   └── PurchasedTickets.tsx
│   │   └── ui/
│   │       ├── accordion.tsx
│   │       ├── ... (all shadcn/ui components)
│   ├── data/
│   │   └── events.ts
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts
│   │       └── types.ts
│   ├── lib/
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Admin.tsx
│   │   ├── BrowseEvents.tsx
│   │   ├── CreateEvent.tsx
│   │   ├── EditEvent.tsx
│   │   ├── EventAnalyticsPage.tsx
│   │   ├── EventDetail.tsx
│   │   ├── Favorites.tsx
│   │   ├── Home.tsx
│   │   ├── Index.tsx
│   │   ├── Login.tsx
│   │   ├── NotFound.tsx
│   │   ├── Profile.tsx
│   │   ├── Recommendations.tsx
│   │   ├── Register.tsx
│   │   └── SignUp.tsx
│   ├── services/
│   │   ├── geminiService.ts
│   │   └── recommendationService.ts
│   ├── types/
│   │   ├── admin.ts
│   │   └── event.ts
│   └── utils/
│       ├── directEmailService.ts
│       ├── emailService.ts
│       ├── notificationService.ts
│       └── ticketGenerator.ts
├── supabase/
│   ├── config.toml
│   ├── functions/
│   │   ├── analyze-receipt/
│   │   ├── financial-insights/
│   │   ├── generate-email/
│   │   ├── send-email/
│   │   ├── send-reminder-email/
│   │   └── send-ticket-email/
│   └── migrations/
│       ├── 20240701000000_add_feedback_and_event_days.sql
│       ├── 20240702000000_fix_notifications_table.sql
│       ├── 20240702000001_complete_schema.sql
│       ├── 20240702000002_fix_feedback_table.sql
│       ├── 20240702000003_fix_event_day_columns.sql
│       ├── 20250512000000_add_recommendation_tables.sql
│       ├── 20250513000000_fix_event_paths_policy.sql
│       ├── 20250514000000_add_event_path_functions.sql
│       └── 20250515000000_add_messages_table.sql
```
</details>

---

## 🧠 Notable AI & Custom Features
- <b>src/services/geminiService.ts</b> – Gemini API integration for AI-powered recommendations
- <b>src/services/recommendationService.ts</b> – Recommendation engine logic
- <b>src/components/PersonalizedRecommendations.tsx</b> – Personalized event suggestions UI
- <b>src/components/EventPaths.tsx</b> – Personalized learning/event paths UI
- <b>src/components/DynamicPricing.tsx</b> – Dynamic pricing based on user engagement
- <b>src/components/InterestSelector.tsx</b> – User interest selection for personalization

---

## 🏁 Getting Started

### Prerequisites
- Node.js & npm ([Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

### Installation

```sh
# 1. Clone the repository
git clone <YOUR_REPO_URL>

# 2. Navigate to the project directory
cd eventro

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

---

## 📱 Mobile First
Eventro is fully responsive and optimized for all devices.

## 🔒 Authentication
Secure login and registration powered by Supabase Auth.

## 📧 Email Notifications
Automated emails for registration, check-in, and distributions.

## 🗺️ Maps Integration
Interactive venue maps powered by Mapbox.

## 🤖 AI Features
- Smart event matching and recommendations (Gemini API)
- Personalized learning/event paths
- Dynamic pricing for loyal users

## 📊 Analytics
- Registration trends
- Attendance rates
- Feedback analysis

## 💬 Messaging
WhatsApp-style chat between organizers and attendees.

## 🎨 Customization
Modern, clean, and easily customizable UI.

## 🔄 Deployment
Deploy easily on Vercel, Netlify, or your favorite platform.

---

## 🤝 Contributing
We welcome contributions! Please open issues or submit pull requests.

## 📞 Support
For help, contact the Eventro team or open an issue.

---

