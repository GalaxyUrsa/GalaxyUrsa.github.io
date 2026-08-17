(function (root) {
  "use strict";

  /* --------------------------------------------------------------------------
   * 1. Constants
   * 日期字段统一使用 YYYY-MM；修改月份显示文字时只需调整此数组。
   * ------------------------------------------------------------------------ */

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* --------------------------------------------------------------------------
   * 2. Shared helpers
   * 这里放多个页面区域都会使用的小工具，避免在各渲染器里重复实现。
   * ------------------------------------------------------------------------ */

  /** 创建元素并可选地设置 class 与纯文本内容。 */
  function makeElement(doc, tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /** 安全替换挂载点内容；挂载点不存在时直接跳过。 */
  function replaceChildren(mount, children) {
    if (mount) mount.replaceChildren(...children);
  }

  /** 将名称转换成适合 DOM id 的短横线格式。 */
  function graphId(value) {
    return String(value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /** 返回项目的第一个有效链接，供能力图项目节点复用。 */
  function getProjectPrimaryUrl(project) {
    const links = Array.isArray(project?.links) ? project.links : [];
    const primaryLink = links.find((link) => link && typeof link.url === "string" && link.url.trim());
    return primaryLink ? primaryLink.url : null;
  }

  /** 按开始日期倒序排列；无效日期放在最后，同日期保持数据原顺序。 */
  function compareByStartDesc(a, b) {
    const aStart = parseMonth(a.start);
    const bStart = parseMonth(b.start);
    if (aStart === null && bStart === null) return a.order - b.order;
    if (aStart === null) return 1;
    if (bStart === null) return -1;
    return bStart - aStart || a.order - b.order;
  }

  /* --------------------------------------------------------------------------
   * 3. Timeline
   * Timeline 合并 education 与 projects，并按开始日期从新到旧展示。
   * 修改日期文案看 formatPeriod；修改卡片结构看 renderTimelineItem。
   * ------------------------------------------------------------------------ */

  /** 校验 YYYY-MM 并转换成可排序数字；格式无效时返回 null。 */
  function parseMonth(value) {
    if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
    const [year, month] = value.split("-").map(Number);
    return year * 100 + month;
  }

  /** 将 YYYY-MM 转换成英文月份标签。 */
  function formatMonth(value) {
    const parsed = parseMonth(value);
    if (parsed === null) return null;
    const year = Math.floor(parsed / 100);
    const month = parsed % 100;
    return `${MONTHS[month - 1]} ${year}`;
  }

  /** 生成人类可读的时间范围；end 为 null 时表示项目或经历仍在进行。 */
  function formatPeriod(start, end) {
    const startLabel = formatMonth(start);
    if (!startLabel) return "Date unavailable";

    const startValue = parseMonth(start);
    if (end === null) return `${startLabel} – Present`;

    const endValue = parseMonth(end);
    if (endValue === null || endValue < startValue) return startLabel;
    return `${startLabel} – ${formatMonth(end)}`;
  }

  /** 将教育和项目数据转换成 Timeline 使用的统一结构。 */
  function buildTimeline(education = [], projects = []) {
    const educationItems = education.map((item, order) => ({
      kind: "Education",
      title: item.school,
      description: item.stage,
      start: item.start,
      end: item.end,
      period: formatPeriod(item.start, item.end),
      order,
    }));
    const offset = educationItems.length;
    const projectItems = projects.map((item, index) => ({
      kind: "Project",
      title: item.name,
      description: item.summary || item.description || "Project details are being prepared.",
      start: item.start,
      end: item.end,
      period: formatPeriod(item.start, item.end),
      order: offset + index,
    }));

    return [...educationItems, ...projectItems].sort(compareByStartDesc);
  }

  /** 创建单个 Timeline 条目。 */
  function renderTimelineItem(item, doc) {
    const node = makeElement(doc, "li", "timeline-item");
    const marker = makeElement(doc, "span", "timeline-marker");
    const body = makeElement(doc, "div", "timeline-body");
    const heading = makeElement(doc, "div", "timeline-heading");

    marker.setAttribute("aria-hidden", "true");
    heading.append(
      makeElement(doc, "p", "item-period", item.period),
      makeElement(doc, "p", "timeline-kind", item.kind),
    );
    body.append(
      heading,
      makeElement(doc, "h3", null, item.title),
      makeElement(doc, "p", "timeline-desc", item.description),
    );
    node.append(marker, body);
    return node;
  }

  /** 渲染完整 Timeline。 */
  function renderTimeline(data, doc) {
    const items = buildTimeline(data.education, data.projects).map((item) => renderTimelineItem(item, doc));
    replaceChildren(doc.getElementById("timeline-mount"), items);
  }

  /* --------------------------------------------------------------------------
   * 4. Projects
   * 新项目只需在 data.js 填写 groupId、日期、文案、stack、architecture、links。
   * 缺少或未知 groupId 的项目会自动进入 Other Projects。
   * ------------------------------------------------------------------------ */

  /** 按配置的研究方向组织项目，并保留原始顺序作为排序回退。 */
  function groupProjects(data) {
    const projects = Array.isArray(data.projects) ? data.projects : [];
    const configuredGroups = Array.isArray(data.projectGroups) ? data.projectGroups : [];
    const groups = configuredGroups.map((group) => ({ ...group, projects: [] }));
    const projectsByGroup = new Map(groups.map((group) => [group.id, group.projects]));
    const fallbackProjects = [];

    projects.forEach((project, order) => {
      const orderedProject = { ...project, order };
      const target = projectsByGroup.get(project.groupId);
      if (target) target.push(orderedProject);
      else fallbackProjects.push(orderedProject);
    });

    if (fallbackProjects.length) {
      groups.push({ id: "other-projects", name: "Other Projects", projects: fallbackProjects });
    }
    return groups.filter((group) => group.projects.length);
  }

  /** 创建项目技术栈；没有有效 stack 时返回 null。 */
  function renderProjectStack(project, doc) {
    const stack = Array.isArray(project.stack) ? project.stack.filter(Boolean) : [];
    if (!stack.length) return null;

    const list = makeElement(doc, "ul", "project-stack");
    list.setAttribute("aria-label", "Technology stack");
    stack.forEach((item) => list.appendChild(makeElement(doc, "li", null, item)));
    return list;
  }

  /** 创建可选架构图；architecture.src 是显示图片的最小条件。 */
  function renderProjectArchitecture(project, doc) {
    if (!project.architecture?.src) return null;

    const figure = makeElement(doc, "figure", "project-architecture");
    const button = makeElement(doc, "button", "project-image-button");
    const image = makeElement(doc, "img");
    button.type = "button";
    button.setAttribute("aria-label", `View larger image: ${project.architecture.caption || project.name}`);
    image.src = project.architecture.src;
    image.alt = project.architecture.alt || `${project.name} architecture`;
    image.loading = "lazy";
    image.decoding = "async";
    button.appendChild(image);
    figure.appendChild(button);
    if (project.architecture.caption) {
      figure.appendChild(makeElement(doc, "figcaption", null, project.architecture.caption));
    }
    return figure;
  }

  /** 创建项目链接区；无效或不完整的链接会被忽略。 */
  function renderProjectActions(project, doc) {
    const links = Array.isArray(project.links)
      ? project.links.filter((link) => link?.label && link?.url)
      : [];
    if (!links.length) return null;

    const actions = makeElement(doc, "div", "project-actions");
    links.forEach((item) => {
      const link = makeElement(doc, "a", "project-action", item.label);
      link.href = item.url;
      link.setAttribute("aria-label", `Open ${item.label} for ${project.name}`);
      actions.appendChild(link);
    });
    return actions;
  }

  /** 创建完整项目卡片。 */
  function renderProjectCard(project, doc) {
    const card = makeElement(doc, "article", "project-card");
    const heading = makeElement(doc, "div", "project-card-heading");
    const architecture = renderProjectArchitecture(project, doc);

    card.classList.toggle("has-architecture", Boolean(architecture));
    heading.append(
      makeElement(doc, "h4", null, project.name),
      makeElement(doc, "p", "item-period project-period", formatPeriod(project.start, project.end)),
    );
    card.append(heading, makeElement(doc, "p", "project-summary", project.summary));

    const stack = renderProjectStack(project, doc);
    const actions = renderProjectActions(project, doc);
    if (stack) card.appendChild(stack);
    if (project.description) card.appendChild(makeElement(doc, "p", "project-description", project.description));
    if (architecture) card.appendChild(architecture);
    if (actions) card.appendChild(actions);
    return card;
  }

  /** 创建一个研究方向及其项目列表。 */
  function renderProjectGroup(group, doc) {
    const section = makeElement(doc, "section", "project-group");
    const header = makeElement(doc, "header", "project-group-header");
    const list = makeElement(doc, "div", "project-group-list");
    const headingId = `project-group-${graphId(group.id)}`;
    const heading = makeElement(doc, "h3", null, group.name);

    section.setAttribute("aria-labelledby", headingId);
    heading.id = headingId;
    header.append(makeElement(doc, "p", "project-group-kicker", "Research direction"), heading);
    group.projects.sort(compareByStartDesc).forEach((project) => list.appendChild(renderProjectCard(project, doc)));
    section.append(header, list);
    return section;
  }

  /** 渲染全部项目分组。 */
  function renderProjects(data, doc) {
    const groups = groupProjects(data).map((group) => renderProjectGroup(group, doc));
    replaceChildren(doc.getElementById("projects-mount"), groups);
  }

  /* --------------------------------------------------------------------------
   * 5. Capability Map
   * 桌面端用 SVG 连接节点；720px 以下由 CSS 切换为能力下方的项目标签。
   * 修改关系请编辑 data.js 中 skill.projectIds；修改高亮看 highlightGraphRelationship。
   * ------------------------------------------------------------------------ */

  /** 根据节点尺寸重新绘制桌面端 SVG 曲线。 */
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

  /** 突出当前节点、直接连线节点以及相关研究主题。 */
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
      const related = relatedNodeIds.has(node.dataset.nodeId);
      node.classList.toggle("is-related", related);
      node.classList.toggle("is-dimmed", !related);
    });
    edges.forEach((edge) => {
      const related = relatedEdges.has(edge);
      edge.classList.toggle("is-related", related);
      edge.classList.toggle("is-dimmed", !related);
    });
  }

  /** 清除能力图的临时高亮状态。 */
  function clearGraphHighlight(graph) {
    graph.classList.remove("has-highlight");
    graph.querySelectorAll(".is-related, .is-dimmed").forEach((node) => {
      node.classList.remove("is-related", "is-dimmed");
    });
  }

  /** 同时注册鼠标和键盘焦点交互。 */
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

  /** 首次绘制连线，并在容器尺寸变化时安排重绘。 */
  function setupGraphLayout(graph, doc) {
    const view = doc.defaultView;
    const redraw = () => drawGraphConnections(graph, doc);
    const scheduleRedraw = () => {
      if (view && typeof view.requestAnimationFrame === "function") view.requestAnimationFrame(redraw);
      else redraw();
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

  /** 创建能力图中心节点；文案统一由 data.js 的 capabilityFocus 控制。 */
  function renderResearchNode(focus, doc) {
    const node = makeElement(doc, "article", "graph-node graph-research-node");
    const label = focus?.label || "Systems Focus";
    const title = focus?.title || "AI for Science and Human-Centered Systems";
    const description = focus?.description || "Connecting capabilities with related projects.";
    node.dataset.nodeId = "research-focus";
    node.tabIndex = 0;
    node.setAttribute("aria-label", `${label}. ${title}. ${description}`);
    node.append(
      makeElement(doc, "p", "graph-node-label", label),
      makeElement(doc, "h3", null, title),
      makeElement(doc, "p", "graph-node-copy", description),
    );
    return node;
  }

  /** 创建能力列，同时记录研究主题、能力和项目之间的边。 */
  function renderSkillsColumn(skills, projectById, edges, doc) {
    const column = makeElement(doc, "div", "graph-column graph-skills");
    column.appendChild(makeElement(doc, "p", "graph-column-label", "Core Capabilities"));

    skills.forEach((skill) => {
      const nodeId = `skill-${graphId(skill.name)}`;
      const node = makeElement(doc, "article", "graph-node graph-skill-node");
      const projectIds = Array.isArray(skill.projectIds) ? skill.projectIds : [];
      const linkedProjects = projectIds.map((id) => projectById.get(id)).filter(Boolean);

      node.dataset.nodeId = nodeId;
      node.tabIndex = 0;
      node.setAttribute("aria-label", `${skill.name}. ${skill.description}`);
      node.append(
        makeElement(doc, "p", "graph-node-label", "Capability"),
        makeElement(doc, "h3", null, skill.name),
        makeElement(doc, "p", "graph-node-copy", skill.description),
      );

      const evidence = makeElement(doc, "div", "graph-mobile-evidence");
      evidence.appendChild(makeElement(doc, "span", "graph-mobile-label", "Used in"));
      linkedProjects.forEach((project) => {
        const primaryUrl = getProjectPrimaryUrl(project);
        const projectLabel = makeElement(doc, primaryUrl ? "a" : "span", "graph-mobile-project", project.name);
        if (primaryUrl) {
          projectLabel.href = primaryUrl;
          projectLabel.setAttribute("aria-label", `View ${project.name}`);
        }
        evidence.appendChild(projectLabel);
        edges.push({ from: nodeId, to: `project-${project.id}`, kind: "evidence" });
      });
      node.appendChild(evidence);
      column.appendChild(node);
      edges.push({ from: "research-focus", to: nodeId, kind: "research" });
    });
    return column;
  }

  /** 创建桌面端相关项目列。 */
  function renderGraphProjectsColumn(projects, doc) {
    const column = makeElement(doc, "div", "graph-column graph-projects");
    column.appendChild(makeElement(doc, "p", "graph-column-label", "Related Projects"));

    projects.forEach((project) => {
      const primaryUrl = getProjectPrimaryUrl(project);
      const node = makeElement(doc, primaryUrl ? "a" : "article", "graph-node graph-project-node");
      node.dataset.nodeId = `project-${project.id}`;
      if (primaryUrl) {
        node.href = primaryUrl;
        node.setAttribute("aria-label", `View ${project.name}`);
      }
      node.append(
        makeElement(doc, "p", "graph-node-label", "Open-Source Project"),
        makeElement(doc, "h3", null, project.name),
      );
      column.appendChild(node);
    });
    return column;
  }

  /** 组装并挂载完整 Capability Map。 */
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
    stage.append(
      svg,
      renderResearchNode(data.capabilityFocus, doc),
      renderSkillsColumn(skills, projectById, edges, doc),
      renderGraphProjectsColumn(projects, doc),
    );
    graph.graphEdges = edges;
    graph.appendChild(stage);
    replaceChildren(mount, [graph]);
    setupGraphInteractions(graph);
    setupGraphLayout(graph, doc);
  }

  /* --------------------------------------------------------------------------
   * 6. Public API and bootstrap
   * render() 是内容入口；setupNavigation() 只管理移动菜单状态。
   * HomepageRenderer 保留给调试和轻量测试使用。
   * ------------------------------------------------------------------------ */

  /** 启用移动菜单；链接点击或按 Escape 后自动收起。 */
  function setupNavigation(doc) {
    const nav = doc.querySelector(".site-nav");
    const toggle = doc.querySelector(".nav-toggle");
    const links = doc.getElementById("primary-nav");
    if (!nav || !toggle || !links) return;

    const closeMenu = () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    };

    nav.classList.add("is-ready");
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    doc.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  /** 为项目图提供原生 dialog 放大预览；点击遮罩、Close 或 Escape 均可退出。 */
  function setupImageViewer(doc) {
    const dialog = doc.getElementById("image-viewer");
    const viewerImage = doc.getElementById("image-viewer-image");
    const caption = doc.getElementById("image-viewer-caption");
    const closeButton = dialog?.querySelector(".image-viewer-close");
    if (!dialog || !viewerImage || !caption || !closeButton) return;

    let trigger = null;
    doc.addEventListener("click", (event) => {
      const button = event.target.closest?.(".project-image-button");
      if (!button) return;

      const image = button.querySelector("img");
      const figureCaption = button.closest("figure")?.querySelector("figcaption");
      if (!image) return;

      trigger = button;
      viewerImage.src = image.currentSrc || image.src;
      viewerImage.alt = image.alt;
      caption.textContent = figureCaption?.textContent || image.alt;
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    });

    const closeViewer = () => {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    };

    closeButton.addEventListener("click", closeViewer);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeViewer();
    });
    dialog.addEventListener("close", () => {
      viewerImage.removeAttribute("src");
      trigger?.focus();
      trigger = null;
    });
  }

  function render(data, doc) {
    if (!data || !doc) return false;
    renderTimeline(data, doc);
    renderProjects(data, doc);
    renderKnowledgeGraph(data, doc);
    return true;
  }

  root.HomepageRenderer = { parseMonth, formatPeriod, buildTimeline, render };

  if (root.document) {
    setupNavigation(root.document);
    if (root.SITE_DATA) render(root.SITE_DATA, root.document);
    setupImageViewer(root.document);
  }
})(typeof window !== "undefined" ? window : globalThis);
