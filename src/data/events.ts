
export interface Event {
  id: string;
  title: string;
  description: string;
  organizer: string;
  date: Date;
  endDate?: Date;
  location: string;
  imageUrl: string;
  price: string;
  category: string;
  tags: string[];
  attendees: number;
  isFeatured?: boolean;
}

export const events: Event[] = [
  {
    id: "1",
    title: "Web Development Conference 2025",
    description: "Join the premier web development conference featuring talks from industry leaders, workshops on the latest frameworks, and networking opportunities with top developers from around the world. This three-day event will cover everything from frontend frameworks to backend architecture, DevOps, and more.",
    organizer: "TechEvents Inc",
    date: new Date("2025-06-15T09:00:00"),
    endDate: new Date("2025-06-17T17:00:00"),
    location: "San Francisco Convention Center",
    imageUrl: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?auto=format&fit=crop&q=80&w=1000",
    price: "$299",
    category: "Technology",
    tags: ["Web Development", "JavaScript", "React", "Node.js"],
    attendees: 1200,
    isFeatured: true
  },
  {
    id: "2",
    title: "Summer Music Festival",
    description: "Experience the ultimate summer music festival featuring top artists from around the world. Enjoy multiple stages with diverse music genres, food vendors, art installations, and camping options for a complete festival experience.",
    organizer: "Melody Productions",
    date: new Date("2025-07-25T14:00:00"),
    endDate: new Date("2025-07-27T23:00:00"),
    location: "Golden Gate Park",
    imageUrl: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&q=80&w=1000",
    price: "$150",
    category: "Music",
    tags: ["Festival", "Live Music", "Outdoor"],
    attendees: 5000,
    isFeatured: true
  },
  {
    id: "3",
    title: "Startup Pitch Competition",
    description: "Pitch your startup idea to a panel of venture capitalists and industry experts. Win up to $50,000 in funding and valuable mentorship opportunities. Open to early-stage startups in all industries.",
    organizer: "Venture Network",
    date: new Date("2025-05-10T10:00:00"),
    location: "Downtown Innovation Hub",
    imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1000",
    price: "Free",
    category: "Business",
    tags: ["Startup", "Entrepreneurship", "Pitching"],
    attendees: 300
  },
  {
    id: "4",
    title: "Yoga & Wellness Retreat",
    description: "Escape to a weekend of relaxation, rejuvenation, and self-discovery. This all-inclusive retreat features yoga sessions, meditation workshops, nutritious meals, and nature hikes in a peaceful mountain setting.",
    organizer: "Peaceful Mind Retreats",
    date: new Date("2025-08-05T08:00:00"),
    endDate: new Date("2025-08-07T16:00:00"),
    location: "Mountain View Resort",
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=1000",
    price: "$399",
    category: "Health",
    tags: ["Yoga", "Wellness", "Meditation", "Retreat"],
    attendees: 75
  },
  {
    id: "5",
    title: "Food & Wine Festival",
    description: "Indulge in a culinary journey featuring tastings from top local restaurants, wineries, and craft breweries. Enjoy cooking demonstrations from celebrity chefs, food pairings, and entertainment throughout the day.",
    organizer: "Gourmet Events",
    date: new Date("2025-09-20T12:00:00"),
    location: "Riverfront Park",
    imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=1000",
    price: "$85",
    category: "Food & Drink",
    tags: ["Food", "Wine", "Tasting", "Culinary"],
    attendees: 2000,
    isFeatured: true
  },
  {
    id: "6",
    title: "Artificial Intelligence Summit",
    description: "Explore the latest advancements in AI technology with talks from leading researchers and industry practitioners. Topics include machine learning, neural networks, robotics, and the ethical implications of AI.",
    organizer: "AI Research Institute",
    date: new Date("2025-04-18T09:00:00"),
    endDate: new Date("2025-04-19T17:00:00"),
    location: "Tech Campus Auditorium",
    imageUrl: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&q=80&w=1000",
    price: "$199",
    category: "Technology",
    tags: ["AI", "Machine Learning", "Data Science"],
    attendees: 800
  },
  {
    id: "7",
    title: "Marathon for Charity",
    description: "Run for a cause in this annual charity marathon. Choose from 5K, 10K, half marathon, or full marathon distances. All proceeds go toward supporting local children's hospitals.",
    organizer: "Community Runners Association",
    date: new Date("2025-10-12T07:00:00"),
    location: "Lakeside Park",
    imageUrl: "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&q=80&w=1000",
    price: "$50",
    category: "Sports",
    tags: ["Running", "Marathon", "Charity", "Fitness"],
    attendees: 3500
  },
  {
    id: "8",
    title: "Photography Workshop",
    description: "Learn photography techniques from professional photographers in this hands-on workshop. Topics include composition, lighting, portrait photography, and post-processing. Suitable for all skill levels.",
    organizer: "Capture Moments Studio",
    date: new Date("2025-06-05T13:00:00"),
    location: "Urban Arts Center",
    imageUrl: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&q=80&w=1000",
    price: "$120",
    category: "Arts",
    tags: ["Photography", "Workshop", "Creative"],
    attendees: 45
  }
];

// Helper function to filter events by category
export const getEventsByCategory = (category: string) => {
  if (category === "All") {
    return events;
  }
  return events.filter(event => event.category === category);
};

// Helper function to get featured events
export const getFeaturedEvents = () => {
  return events.filter(event => event.isFeatured);
};

// Helper function to get event by id
export const getEventById = (id: string) => {
  return events.find(event => event.id === id);
};

// Get all unique categories
export const getCategories = (): string[] => {
  const categories = events.map(event => event.category);
  return ["All", ...Array.from(new Set(categories))];
};
