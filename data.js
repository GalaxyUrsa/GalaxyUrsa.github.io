// Single source of truth for the homepage. Dates use YYYY-MM.
window.SITE_DATA = {
  profile: {
    name: "Jianheng Huang",
    handle: "GalaxyUrsa",
    avatar: "assets/galaxyursa-avatar.webp",
    heroEyebrow: "Research Interests",
    primaryInterest: "3D Ocean Reconstruction and Prediction",
    secondaryInterest: "Information Perception and Computation",
    currentWork:
      "My earlier work focused on information perception and computation for maritime applications. I am now building a 3D ocean reconstruction and prediction framework, with Pisces-Ocean as its prediction core and Pisces-Explorer as its visualization interface.",
    cardEyebrow: "Profile",
    academicStatus: "Master's Student at Sun Yat-sen University",
    github: "https://github.com/GalaxyUrsa",
    email: "jianhenghuang26@gmail.com",
    quickFacts: [
      {
        label: "Email",
        value: "jianhenghuang26@gmail.com",
        href: "mailto:jianhenghuang26@gmail.com",
      },
      {
        label: "GitHub",
        value: "github.com/GalaxyUrsa",
        href: "https://github.com/GalaxyUrsa",
      },
    ],
  },

  education: [
    {
      start: "2021-09",
      end: "2025-06",
      stage: "Bachelor's Degree",
      school: "Wuhan University of Technology",
    },
    {
      start: "2025-09",
      end: null,
      stage: "Master's Degree",
      school: "Sun Yat-sen University",
    },
  ],

  projectGroups: [
    {
      id: "ocean-intelligence",
      name: "Ocean Intelligence",
    },
    {
      id: "maritime-perception",
      name: "Maritime Perception",
    },
  ],

  // Optional architecture: { src, alt, caption }. Add more link objects for Documentation, Demo, Paper, and so on.
  projects: [
    {
      id: "pisces-explorer",
      groupId: "ocean-intelligence",
      start: "2026-07",
      end: null,
      name: "Pisces-Explorer",
      summary: "An interactive tool for exploring Pisces-Ocean outputs across 2D and 3D ocean variables with time-series animation.",
      stack: ["JavaScript", "Scientific Visualization"],
      description:
        "Designed as the visual exploration layer for Pisces-Ocean, the interface brings multidimensional model outputs into coordinated spatial views and time-series animation so evolving ocean structures can be inspected more directly.",
      architecture: null,
      links: [
        {
          label: "GitHub",
          url: "https://github.com/GalaxyUrsa/Pisces-Explorer",
        },
      ],
    },
    {
      id: "drone-search-and-rescue",
      groupId: "maritime-perception",
      start: "2023-09",
      end: "2025-09",
      name: "Drone-Search-And-Rescue",
      summary: "A YOLOv5-based framework for detecting people in distress from live drone RTMP video streams.",
      stack: ["Python", "YOLOv5", "RTMP"],
      description:
        "The project connects live video ingestion with an object-detection pipeline to support rapid identification of people in distress from aerial maritime footage.",
      architecture: null,
      links: [
        {
          label: "GitHub",
          url: "https://github.com/GalaxyUrsa/Drone-Search-And-Rescue",
        },
      ],
    },
    {
      id: "pisces-ocean",
      groupId: "ocean-intelligence",
      start: "2026-04",
      end: null,
      name: "Pisces-Ocean",
      summary: "A deep learning research project for reconstructing three-dimensional ocean temperature-salinity fields.",
      stack: ["Python", "Deep Learning", "3D Reconstruction"],
      description:
        "Pisces-Ocean is the prediction core of a broader 3D ocean framework, focusing on learning spatial relationships in temperature and salinity observations to recover volumetric ocean fields.",
      architecture: {
        src: "assets/Pisces-Ocean.png",
        alt: "Pisces-Ocean architecture diagram",
        caption: "Pisces-Ocean architecture overview",
      },
      links: [
        {
          label: "GitHub",
          url: "https://github.com/GalaxyUrsa/Pisces-Ocean",
        },
      ],
    },
  ],

  skills: [
    {
      name: "Python",
      description: "Model development, data processing, and real-time inference workflows.",
      projectIds: ["pisces-ocean", "drone-search-and-rescue", "pisces-explorer"],
    },
    {
      name: "Deep Learning",
      description: "3D temperature-salinity field reconstruction and YOLOv5 object detection.",
      projectIds: ["pisces-ocean", "drone-search-and-rescue"],
    },
    {
      name: "JavaScript",
      description: "Interactive interfaces for scientific data exploration.",
      projectIds: ["pisces-explorer"],
    },
  ],
};
