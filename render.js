(function (root) {
  "use strict";

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function parseMonth(value) {
    if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
    const [year, month] = value.split("-").map(Number);
    return year * 100 + month;
  }

  function formatMonth(value) {
    const parsed = parseMonth(value);
    if (parsed === null) return null;
    const year = Math.floor(parsed / 100);
    const month = parsed % 100;
    return `${MONTHS[month - 1]} ${year}`;
  }

  function formatPeriod(start, end) {
    const startLabel = formatMonth(start);
    if (!startLabel) return "Date unavailable";

    const startValue = parseMonth(start);
    const endValue = parseMonth(end);
    if (endValue === null || endValue < startValue) return startLabel;
    return `${startLabel} – ${formatMonth(end)}`;
  }

  function getProjectPrimaryUrl(project) {
    const links = Array.isArray(project?.links) ? project.links : [];
    const primaryLink = links.find((link) => link && typeof link.url === "string" && link.url.trim());
    return primaryLink ? primaryLink.url : null;
  }

  function buildTimeline(education = [], projects = []) {
    const educationItems = education.map((item, index) => ({
      kind: "Education",
      title: item.school,
      meta: item.stage,
      description: item.stage,
      start: item.start,
      end: item.end,
      period: formatPeriod(item.start, item.end),
      order: index,
    }));
    const offset = educationItems.length;
    const projectItems = projects.map((item, index) => ({
      kind: "Project",
      title: item.name,
      meta: "Open-Source Project",
      description: item.summary || item.description || "Project details are being prepared.",
      start: item.start,
      end: item.end,
      period: formatPeriod(item.start, item.end),
      order: offset + index,
    }));

    return [...educationItems, ...projectItems].sort((a, b) => {
      const aStart = parseMonth(a.start);
      const bStart = parseMonth(b.start);
      if (aStart === null && bStart === null) return a.order - b.order;
      if (aStart === null) return 1;
      if (bStart === null) return -1;
      return bStart - aStart || a.order - b.order;
    });
  }

  function makeElement(doc, tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function replaceChildren(mount, children) {
    if (!mount) return;
    mount.replaceChildren(...children);
  }

  function renderProfile(data, doc) {
    const profile = data.profile;
    if (!profile) return;

    doc.title = profile.name;
    const eyebrow = doc.getElementById("hero-eyebrow");
    const title = doc.getElementById("hero-title");
    const secondaryInterest = doc.getElementById("hero-secondary-interest");
    const lead = doc.getElementById("hero-lead");
    if (eyebrow) eyebrow.textContent = profile.heroEyebrow;
    if (title) title.textContent = profile.primaryInterest;
    if (secondaryInterest) secondaryInterest.textContent = profile.secondaryInterest;
    if (lead) lead.textContent = profile.currentWork;

    const avatar = doc.getElementById("profile-avatar");
    if (avatar) {
      avatar.src = profile.avatar;
      avatar.alt = `${profile.handle}'s GitHub avatar`;
    }

    const profileEyebrow = doc.getElementById("profile-eyebrow");
    const name = doc.getElementById("profile-name");
    const status = doc.getElementById("profile-status");
    if (profileEyebrow) profileEyebrow.textContent = profile.cardEyebrow;
    if (name) name.textContent = profile.name;
    if (status) status.textContent = profile.academicStatus;

    const facts = profile.quickFacts.map((fact) => {
      const wrap = makeElement(doc, "div");
      wrap.appendChild(makeElement(doc, "dt", null, fact.label));
      const detail = makeElement(doc, "dd");
      if (fact.href) {
        const link = makeElement(doc, "a", "profile-link", fact.value);
        link.href = fact.href;
        detail.appendChild(link);
      } else {
        detail.textContent = fact.value;
      }
      wrap.appendChild(detail);
      return wrap;
    });
    replaceChildren(doc.getElementById("quick-facts"), facts);
  }

  function renderTimeline(data, doc) {
    const items = buildTimeline(data.education, data.projects).map((item) => {
      const node = makeElement(doc, "li", "timeline-item");
      const marker = makeElement(doc, "span", "timeline-marker");
      marker.setAttribute("aria-hidden", "true");
      const body = makeElement(doc, "div", "timeline-body");
      const heading = makeElement(doc, "div", "timeline-heading");
      heading.appendChild(makeElement(doc, "p", "item-period", item.period));
      heading.appendChild(makeElement(doc, "p", "timeline-kind", item.kind));
      body.appendChild(heading);
      body.appendChild(makeElement(doc, "h3", null, item.title));
      body.appendChild(makeElement(doc, "p", "timeline-desc", item.description));
      node.append(marker, body);
      return node;
    });
    replaceChildren(doc.getElementById("timeline-mount"), items);
  }

  function renderProjects(data, doc) {
    const projects = Array.isArray(data.projects) ? data.projects : [];
    const configuredGroups = Array.isArray(data.projectGroups) ? data.projectGroups : [];
    const knownGroupIds = new Set(configuredGroups.map((group) => group.id));
    const groups = configuredGroups.map((group) => ({ ...group, projects: [] }));
    const projectsByGroup = new Map(groups.map((group) => [group.id, group.projects]));
    const fallbackProjects = [];

    projects.forEach((project, index) => {
      const projectWithOrder = { ...project, order: index };
      if (knownGroupIds.has(project.groupId)) {
        projectsByGroup.get(project.groupId).push(projectWithOrder);
      } else {
        fallbackProjects.push(projectWithOrder);
      }
    });

    if (fallbackProjects.length) {
      groups.push({ id: "other-projects", name: "Other Projects", projects: fallbackProjects });
    }

    const renderedGroups = groups
      .filter((group) => group.projects.length)
      .map((group) => {
        const section = makeElement(doc, "section", "project-group");
        const headingId = `project-group-${graphId(group.id)}`;
        const header = makeElement(doc, "header", "project-group-header");
        const list = makeElement(doc, "div", "project-group-list");

        section.setAttribute("aria-labelledby", headingId);
        header.appendChild(makeElement(doc, "p", "project-group-kicker", "Research direction"));
        const groupHeading = makeElement(doc, "h3", null, group.name);
        groupHeading.id = headingId;
        header.appendChild(groupHeading);

        group.projects
          .sort((a, b) => {
            const aStart = parseMonth(a.start);
            const bStart = parseMonth(b.start);
            if (aStart === null && bStart === null) return a.order - b.order;
            if (aStart === null) return 1;
            if (bStart === null) return -1;
            return bStart - aStart || a.order - b.order;
          })
          .forEach((project) => {
            const card = makeElement(doc, "article", "project-card");
            const cardHeading = makeElement(doc, "div", "project-card-heading");
            const hasArchitecture = Boolean(project.architecture?.src);
            const stack = Array.isArray(project.stack) ? project.stack.filter(Boolean) : [];
            const links = Array.isArray(project.links)
              ? project.links.filter((link) => link?.label && link?.url)
              : [];

            card.classList.toggle("has-architecture", hasArchitecture);

            cardHeading.appendChild(makeElement(doc, "h4", null, project.name));
            cardHeading.appendChild(
              makeElement(doc, "p", "item-period project-period", formatPeriod(project.start, project.end)),
            );
            card.appendChild(cardHeading);
            card.appendChild(makeElement(doc, "p", "project-summary", project.summary));

            if (stack.length) {
              const stackList = makeElement(doc, "ul", "project-stack");
              stackList.setAttribute("aria-label", "Technology stack");
              stack.forEach((item) => stackList.appendChild(makeElement(doc, "li", null, item)));
              card.appendChild(stackList);
            }

            if (project.description) {
              card.appendChild(makeElement(doc, "p", "project-description", project.description));
            }

            if (hasArchitecture) {
              const figure = makeElement(doc, "figure", "project-architecture");
              const image = makeElement(doc, "img");
              image.src = project.architecture.src;
              image.alt = project.architecture.alt || `${project.name} architecture`;
              image.loading = "lazy";
              image.decoding = "async";
              figure.appendChild(image);
              if (project.architecture.caption) {
                figure.appendChild(makeElement(doc, "figcaption", null, project.architecture.caption));
              }
              card.appendChild(figure);
            }

            if (links.length) {
              const actions = makeElement(doc, "div", "project-actions");
              links.forEach((item) => {
                const link = makeElement(doc, "a", "project-action", item.label);
                link.href = item.url;
                link.setAttribute("aria-label", `Open ${item.label} for ${project.name}`);
                actions.appendChild(link);
              });
              card.appendChild(actions);
            }

            list.appendChild(card);
          });

        section.append(header, list);
        return section;
      });

    replaceChildren(doc.getElementById("projects-mount"), renderedGroups);
  }

  function graphId(value) {
    return String(value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function drawGraphConnections(graph, doc) {
    const svg = graph.querySelector(".graph-connections");
    const stage = graph.querySelector(".graph-stage");
    const view = doc.defaultView;
    if (!svg || !stage) return;

    svg.replaceChildren();
    if (view && view.matchMedia("(max-width: 720px)").matches) return;

    const stageRect = stage.getBoundingClientRect();
    if (!stageRect.width || !stageRect.height) return;

    const nodes = new Map(
      Array.from(graph.querySelectorAll("[data-node-id]"), (node) => [node.dataset.nodeId, node]),
    );
    svg.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);
    svg.setAttribute("width", stageRect.width);
    svg.setAttribute("height", stageRect.height);

    for (const edge of graph.graphEdges || []) {
      const fromNode = nodes.get(edge.from);
      const toNode = nodes.get(edge.to);
      if (!fromNode || !toNode) continue;

      const fromRect = fromNode.getBoundingClientRect();
      const toRect = toNode.getBoundingClientRect();
      const startX = fromRect.right - stageRect.left;
      const startY = fromRect.top + fromRect.height / 2 - stageRect.top;
      const endX = toRect.left - stageRect.left;
      const endY = toRect.top + toRect.height / 2 - stageRect.top;
      const curve = Math.max(28, (endX - startX) * 0.52);
      const path = doc.createElementNS("http://www.w3.org/2000/svg", "path");

      path.setAttribute("d", `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`);
      path.setAttribute("vector-effect", "non-scaling-stroke");
      path.classList.add("graph-edge", `graph-edge-${edge.kind}`);
      path.dataset.from = edge.from;
      path.dataset.to = edge.to;
      svg.appendChild(path);
    }
  }

  function highlightGraphRelationship(graph, nodeId) {
    const nodes = Array.from(graph.querySelectorAll(".graph-node"));
    const edges = Array.from(graph.querySelectorAll(".graph-edge"));
    const relatedNodeIds = new Set([nodeId]);
    const relatedEdges = new Set();

    if (nodeId === "research-focus") {
      nodes.forEach((node) => relatedNodeIds.add(node.dataset.nodeId));
      edges.forEach((edge) => relatedEdges.add(edge));
    } else {
      edges.forEach((edge) => {
        if (edge.dataset.from === nodeId || edge.dataset.to === nodeId) {
          relatedEdges.add(edge);
          relatedNodeIds.add(edge.dataset.from);
          relatedNodeIds.add(edge.dataset.to);
        }
      });

      if (nodeId.startsWith("project-")) {
        edges.forEach((edge) => {
          if (edge.dataset.from === "research-focus" && relatedNodeIds.has(edge.dataset.to)) {
            relatedEdges.add(edge);
            relatedNodeIds.add("research-focus");
          }
        });
      }
    }

    graph.classList.add("has-highlight");
    nodes.forEach((node) => {
      const isRelated = relatedNodeIds.has(node.dataset.nodeId);
      node.classList.toggle("is-related", isRelated);
      node.classList.toggle("is-dimmed", !isRelated);
    });
    edges.forEach((edge) => {
      const isRelated = relatedEdges.has(edge);
      edge.classList.toggle("is-related", isRelated);
      edge.classList.toggle("is-dimmed", !isRelated);
    });
  }

  function clearGraphHighlight(graph) {
    graph.classList.remove("has-highlight");
    graph.querySelectorAll(".is-related, .is-dimmed").forEach((node) => {
      node.classList.remove("is-related", "is-dimmed");
    });
  }

  function setupGraphInteractions(graph) {
    graph.querySelectorAll(".graph-node").forEach((node) => {
      const highlight = () => highlightGraphRelationship(graph, node.dataset.nodeId);
      node.addEventListener("mouseenter", highlight);
      node.addEventListener("mouseleave", () => clearGraphHighlight(graph));
      node.addEventListener("focusin", highlight);
      node.addEventListener("focusout", (event) => {
        if (!node.contains(event.relatedTarget)) clearGraphHighlight(graph);
      });
    });
  }

  function setupGraphLayout(graph, doc) {
    const view = doc.defaultView;
    const redraw = () => drawGraphConnections(graph, doc);
    const scheduleRedraw = () => {
      if (view && typeof view.requestAnimationFrame === "function") {
        view.requestAnimationFrame(redraw);
      } else {
        redraw();
      }
    };

    scheduleRedraw();
    if (view && typeof view.ResizeObserver === "function") {
      const observer = new view.ResizeObserver(scheduleRedraw);
      observer.observe(graph);
      graph.connectionObserver = observer;
    } else if (view) {
      view.addEventListener("resize", scheduleRedraw);
    }
  }

  function renderKnowledgeGraph(data, doc) {
    const mount = doc.getElementById("skills-mount");
    if (!mount) return;

    const projects = Array.isArray(data.projects) ? data.projects : [];
    const skills = Array.isArray(data.skills) ? data.skills : [];
    const projectById = new Map(projects.map((project) => [project.id, project]));
    const graph = makeElement(doc, "div", "knowledge-graph");
    const stage = makeElement(doc, "div", "graph-stage");
    const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    const edges = [];

    svg.classList.add("graph-connections");
    svg.setAttribute("aria-hidden", "true");

    const researchNode = makeElement(doc, "article", "graph-node graph-research-node");
    researchNode.dataset.nodeId = "research-focus";
    researchNode.appendChild(makeElement(doc, "p", "graph-node-label", "Research Focus"));
    researchNode.appendChild(makeElement(doc, "h3", null, data.profile?.primaryInterest || "Research Focus"));
    researchNode.appendChild(
      makeElement(doc, "p", "graph-node-copy", "The central question connecting methods with shipped work."),
    );

    const skillsColumn = makeElement(doc, "div", "graph-column graph-skills");
    skillsColumn.appendChild(makeElement(doc, "p", "graph-column-label", "Core Capabilities"));
    skills.forEach((skill) => {
      const skillNodeId = `skill-${graphId(skill.name)}`;
      const skillNode = makeElement(doc, "article", "graph-node graph-skill-node");
      const projectIds = Array.isArray(skill.projectIds) ? skill.projectIds : [];
      const linkedProjects = projectIds.map((id) => projectById.get(id)).filter(Boolean);

      skillNode.dataset.nodeId = skillNodeId;
      skillNode.tabIndex = 0;
      skillNode.setAttribute("aria-label", `${skill.name}. ${skill.description}`);
      skillNode.appendChild(makeElement(doc, "p", "graph-node-label", "Capability"));
      skillNode.appendChild(makeElement(doc, "h3", null, skill.name));
      skillNode.appendChild(makeElement(doc, "p", "graph-node-copy", skill.description));

      const mobileEvidence = makeElement(doc, "div", "graph-mobile-evidence");
      mobileEvidence.appendChild(makeElement(doc, "span", "graph-mobile-label", "Used in"));
      linkedProjects.forEach((project) => {
        const primaryUrl = getProjectPrimaryUrl(project);
        const link = makeElement(doc, primaryUrl ? "a" : "span", "graph-mobile-project", project.name);
        if (primaryUrl) {
          link.href = primaryUrl;
          link.setAttribute("aria-label", `View ${project.name}`);
        }
        mobileEvidence.appendChild(link);
        edges.push({ from: skillNodeId, to: `project-${project.id}`, kind: "evidence" });
      });
      skillNode.appendChild(mobileEvidence);
      skillsColumn.appendChild(skillNode);
      edges.push({ from: "research-focus", to: skillNodeId, kind: "research" });
    });

    const projectsColumn = makeElement(doc, "div", "graph-column graph-projects");
    projectsColumn.appendChild(makeElement(doc, "p", "graph-column-label", "Related Projects"));
    projects.forEach((project) => {
      const primaryUrl = getProjectPrimaryUrl(project);
      const projectNode = makeElement(doc, primaryUrl ? "a" : "article", "graph-node graph-project-node");
      projectNode.dataset.nodeId = `project-${project.id}`;
      if (primaryUrl) {
        projectNode.href = primaryUrl;
        projectNode.setAttribute("aria-label", `View ${project.name}`);
      }
      projectNode.appendChild(makeElement(doc, "p", "graph-node-label", "Open-Source Project"));
      projectNode.appendChild(makeElement(doc, "h3", null, project.name));
      projectsColumn.appendChild(projectNode);
    });

    graph.graphEdges = edges;
    stage.append(svg, researchNode, skillsColumn, projectsColumn);
    graph.appendChild(stage);
    replaceChildren(mount, [graph]);
    setupGraphInteractions(graph);
    setupGraphLayout(graph, doc);
  }

  function render(data, doc) {
    if (!data || !doc) return false;
    renderProfile(data, doc);
    renderTimeline(data, doc);
    renderProjects(data, doc);
    renderKnowledgeGraph(data, doc);
    return true;
  }

  const api = { parseMonth, formatPeriod, buildTimeline, render };
  root.HomepageRenderer = api;

  if (root.document && root.SITE_DATA) {
    render(root.SITE_DATA, root.document);
  }
})(typeof window !== "undefined" ? window : globalThis);
