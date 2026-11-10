/**
 * Standalone demo seed for the live final-delivery demo.
 *
 * This file is intentionally separate from `prisma/seed.ts` (which keeps its
 * own mixed/legacy domains for other purposes) so that EVERY seeded user here
 * uses exactly one of the two real UABCS domains, chosen by role:
 *   - STUDENT -> @alu.uabcs.mx
 *   - TEACHER -> @uabcs.mx
 * No ORGANIZATION/INDEPENDENT accounts are created and no other domain is
 * used anywhere in this file.
 *
 * Every seeded user has the same demo password: "praxis123" (bcrypt-hashed
 * once below and reused for all `user.upsert` calls), so whoever drives the
 * demo can log in as any seeded account.
 *
 * DESTRUCTIVE: this script truncates every application table before
 * reseeding (see `resetDatabase`), so the demo always starts from the exact
 * same clean dataset. This deletes ALL existing rows, including accounts
 * created by hand or by `prisma/seed.ts` — not just the rows this script
 * itself created. Only run it against the demo/dev database.
 *
 * Run with: npm run db:seed:demo  (tsx prisma/seed-demo.ts)
 */
import {
  PrismaClient,
  AccountType,
  ProjectVisibility,
  TeamRequestRole,
  TeamRequestPurpose,
  TeamRequestInitiator,
  TeamRequestStatus,
  ActivityStatus,
  ActivityPriority,
  EvidenceType,
  DictamenVerdict,
  type Prisma,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// --- Catalogs (copied verbatim from seed.ts so dropdowns/filters aren't empty) ---

const SDGS = [
  { id: 1, name: "Fin de la pobreza", colorHex: "#E5243B" },
  { id: 2, name: "Hambre cero", colorHex: "#DDA63A" },
  { id: 3, name: "Salud y bienestar", colorHex: "#4C9F38" },
  { id: 4, name: "Educación de calidad", colorHex: "#C5192D" },
  { id: 5, name: "Igualdad de género", colorHex: "#FF3A21" },
  { id: 6, name: "Agua limpia y saneamiento", colorHex: "#26BDE2" },
  { id: 7, name: "Energía asequible y no contaminante", colorHex: "#FCC30B" },
  { id: 8, name: "Trabajo decente y crecimiento económico", colorHex: "#A21942" },
  { id: 9, name: "Industria, innovación e infraestructura", colorHex: "#FD6925" },
  { id: 10, name: "Reducción de las desigualdades", colorHex: "#DD1367" },
  { id: 11, name: "Ciudades y comunidades sostenibles", colorHex: "#FD9D24" },
  { id: 12, name: "Producción y consumo responsables", colorHex: "#BF8B2E" },
  { id: 13, name: "Acción por el clima", colorHex: "#3F7E44" },
  { id: 14, name: "Vida submarina", colorHex: "#0A97D9" },
  { id: 15, name: "Vida de ecosistemas terrestres", colorHex: "#56C02B" },
  { id: 16, name: "Paz, justicia e instituciones sólidas", colorHex: "#00689D" },
  { id: 17, name: "Alianzas para lograr los objetivos", colorHex: "#19486A" },
];

const CATEGORIES = [
  { id: 1, name: "Tecnología y Computación", colorHex: "#19486A", icon: "Code" },
  { id: 2, name: "Ingeniería", colorHex: "#0A6E8A", icon: "Wrench" },
  { id: 3, name: "Arquitectura y Diseño Urbano", colorHex: "#4C6EA8", icon: "Compass" },
  { id: 4, name: "Electrónica y Robótica", colorHex: "#2E6F8E", icon: "Circuitry" },
  { id: 5, name: "Ciencias Naturales y Exactas", colorHex: "#3F7E44", icon: "Flask" },
  { id: 6, name: "Ciencias del Mar y Costeras", colorHex: "#0A97D9", icon: "Waves" },
  { id: 7, name: "Pesca y Acuicultura", colorHex: "#1B7A8C", icon: "Fish" },
  { id: 8, name: "Agropecuario y Agricultura", colorHex: "#8C6D1F", icon: "Plant" },
  { id: 9, name: "Sustentabilidad y Medio Ambiente", colorHex: "#56A02B", icon: "Leaf" },
  { id: 10, name: "Energías Renovables", colorHex: "#D4A017", icon: "Lightning" },
  { id: 11, name: "Salud y Bienestar", colorHex: "#A21942", icon: "Heartbeat" },
  { id: 12, name: "Ciencias Sociales", colorHex: "#6B4C9A", icon: "UsersThree" },
  {
    id: 13,
    name: "Trabajo Comunitario y Desarrollo Social",
    colorHex: "#8E5BA8",
    icon: "HandHeart",
  },
  { id: 14, name: "Economía y Negocios", colorHex: "#BF8B2E", icon: "ChartLineUp" },
  { id: 15, name: "Turismo y Hospitalidad", colorHex: "#E0893E", icon: "Island" },
  { id: 16, name: "Educación y Pedagogía", colorHex: "#D46A1F", icon: "GraduationCap" },
  { id: 17, name: "Arte y Diseño", colorHex: "#9C4F96", icon: "PaintBrush" },
  { id: 18, name: "Humanidades y Letras", colorHex: "#7A4FA0", icon: "BookOpen" },
  { id: 19, name: "Comunicación y Medios", colorHex: "#C2456B", icon: "Megaphone" },
  { id: 20, name: "Derecho y Políticas Públicas", colorHex: "#4A5568", icon: "Scales" },
  { id: 21, name: "Deporte y Recreación", colorHex: "#2E8B57", icon: "SoccerBall" },
  { id: 22, name: "Gastronomía", colorHex: "#B5651D", icon: "ForkKnife" },
];

// Every application table (from schema.prisma's `@@map` names), in no
// particular order — TRUNCATE ... CASCADE resolves FK dependencies itself,
// so ordering here doesn't matter. Catalog tables (sdgs/categories) are
// included too since they get re-upserted right after anyway.
const ALL_TABLES = [
  "users",
  "sdgs",
  "categories",
  "challenges",
  "challenge_sdgs",
  "challenge_categories",
  "class_groups",
  "class_group_members",
  "class_group_resources",
  "projects",
  "project_sdgs",
  "project_categories",
  "team_requests",
  "activities",
  "progress_updates",
  "saved_projects",
  "evidence",
  "dictamenes",
  "activity_assignees",
  "activity_events",
  "checklist_sections",
  "checklist_items",
  "activity_attachments",
  "activity_comments",
  "project_labels",
  "activity_labels",
  "project_resources",
  "notifications",
];

async function resetDatabase() {
  console.log("[demo] Wiping all existing data (destructive reset for a clean demo state)...");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${ALL_TABLES.join(", ")} RESTART IDENTITY CASCADE`);
}

// --- Helpers (same idempotent-upsert style as seed.ts) -----------------

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function findOrCreateProject(name: string, data: Prisma.ProjectCreateInput) {
  const existing = await prisma.project.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.project.create({ data });
}

async function linkCategory(projectId: number, categoryId: number) {
  await prisma.projectCategory.upsert({
    where: { projectId_categoryId: { projectId, categoryId } },
    update: {},
    create: { projectId, categoryId },
  });
}

async function linkSdg(projectId: number, sdgId: number) {
  await prisma.projectSdg.upsert({
    where: { projectId_sdgId: { projectId, sdgId } },
    update: {},
    create: { projectId, sdgId },
  });
}

async function ensureTeamMember(
  projectId: number,
  userId: number,
  role: TeamRequestRole,
  status: TeamRequestStatus,
  message?: string,
) {
  await prisma.teamRequest.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: {},
    create: {
      projectId,
      userId,
      role,
      status,
      message,
      resolvedAt: status === TeamRequestStatus.ACCEPTED ? new Date() : null,
    },
  });
}

/**
 * Demo evaluator link: mirrors seed.ts's `ensureEvaluatorLink` — real
 * evaluator links only ever come from an accepted EVALUATOR TeamRequest, so
 * seed data sets up that already-accepted state directly. Forces the
 * EVALUATOR state on `update` too, since `@@unique([projectId, userId])`
 * means a pre-existing MEMBER row for this pair would otherwise be left
 * untouched by the upsert.
 */
async function ensureEvaluatorLink(projectId: number, userId: number) {
  const evaluatorState = {
    purpose: TeamRequestPurpose.EVALUATOR,
    status: TeamRequestStatus.ACCEPTED,
    initiatedBy: TeamRequestInitiator.OWNER,
    resolvedAt: new Date(),
  };
  await prisma.teamRequest.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: evaluatorState,
    create: {
      projectId,
      userId,
      ...evaluatorState,
    },
  });
}

async function ensureLabel(projectId: number, name: string, colorHex: string) {
  return prisma.projectLabel.upsert({
    where: { projectId_name: { projectId, name } },
    update: { colorHex },
    create: { projectId, name, colorHex },
  });
}

async function ensureActivityLabel(activityId: number, labelId: number) {
  await prisma.activityLabel.upsert({
    where: { activityId_labelId: { activityId, labelId } },
    update: {},
    create: { activityId, labelId },
  });
}

async function ensureSavedProject(userId: number, projectId: number) {
  await prisma.savedProject.upsert({
    where: { userId_projectId: { userId, projectId } },
    update: {},
    create: { userId, projectId },
  });
}

async function ensureClassGroupMember(classGroupId: number, userId: number) {
  await prisma.classGroupMember.upsert({
    where: { classGroupId_userId: { classGroupId, userId } },
    update: {},
    create: { classGroupId, userId },
  });
}

interface ChecklistItemDef {
  text: string;
  done?: boolean;
  doneById?: number;
}

interface ChecklistSectionDef {
  name: string;
  items: ChecklistItemDef[];
}

interface CommentDef {
  authorId: number;
  text: string;
}

interface EventDef {
  from: ActivityStatus | null;
  to: ActivityStatus;
  actorId: number;
}

interface ActivityDef {
  title: string;
  description: string;
  dueDateOffsetDays: number;
  status: ActivityStatus;
  priority: ActivityPriority;
  position: number;
  completedOffsetDays?: number;
  assigneeIds: number[];
  labelNames?: string[];
  sections?: ChecklistSectionDef[];
  unsectionedItems?: ChecklistItemDef[];
  comments?: CommentDef[];
  events?: EventDef[];
}

async function seedActivity(
  projectId: number,
  ownerId: number,
  def: ActivityDef,
  labelIdByName: Record<string, number>,
) {
  const existing = await prisma.activity.findFirst({ where: { projectId, title: def.title } });
  const activity =
    existing ??
    (await prisma.activity.create({
      data: {
        projectId,
        ownerId,
        title: def.title,
        description: def.description,
        dueDate: daysFromNow(def.dueDateOffsetDays),
        status: def.status,
        priority: def.priority,
        position: def.position,
        completedAt:
          def.completedOffsetDays !== undefined ? daysFromNow(def.completedOffsetDays) : null,
        assignees: { create: def.assigneeIds.map((userId) => ({ userId })) },
      },
    }));

  if (existing) return activity;

  for (const labelName of def.labelNames ?? []) {
    const labelId = labelIdByName[labelName];
    if (labelId) await ensureActivityLabel(activity.id, labelId);
  }

  let sectionPosition = 0;
  for (const section of def.sections ?? []) {
    const createdSection = await prisma.checklistSection.create({
      data: { activityId: activity.id, name: section.name, position: sectionPosition++ },
    });
    let itemPosition = 0;
    for (const item of section.items) {
      await prisma.checklistItem.create({
        data: {
          activityId: activity.id,
          sectionId: createdSection.id,
          text: item.text,
          position: itemPosition++,
          done: item.done ?? false,
          doneById: item.done ? item.doneById : undefined,
          doneAt: item.done ? new Date() : undefined,
        },
      });
    }
  }

  let unsectionedPosition = 0;
  for (const item of def.unsectionedItems ?? []) {
    await prisma.checklistItem.create({
      data: {
        activityId: activity.id,
        text: item.text,
        position: unsectionedPosition++,
        done: item.done ?? false,
        doneById: item.done ? item.doneById : undefined,
        doneAt: item.done ? new Date() : undefined,
      },
    });
  }

  for (const comment of def.comments ?? []) {
    await prisma.activityComment.create({
      data: { activityId: activity.id, authorId: comment.authorId, text: comment.text },
    });
  }

  for (const event of def.events ?? []) {
    await prisma.activityEvent.create({
      data: {
        activityId: activity.id,
        actorId: event.actorId,
        fromStatus: event.from,
        toStatus: event.to,
      },
    });
  }

  return activity;
}

async function ensureProgressUpdate(
  projectId: number,
  authorId: number,
  text: string,
  opts: { postedToFeed?: boolean; validated?: boolean } = {},
) {
  const existing = await prisma.progressUpdate.findFirst({
    where: { projectId, authorId, text, activityId: null },
  });
  if (existing) return existing;
  return prisma.progressUpdate.create({
    data: {
      projectId,
      authorId,
      text,
      postedToFeed: opts.postedToFeed ?? true,
      validated: opts.validated ?? false,
    },
  });
}

async function ensureEvidence(
  progressUpdateId: number,
  type: EvidenceType,
  url: string,
  fileName: string,
) {
  const existing = await prisma.evidence.findFirst({ where: { progressUpdateId, url } });
  if (existing) return existing;
  return prisma.evidence.create({ data: { progressUpdateId, type, url, fileName } });
}

async function ensureDictamen(
  projectId: number,
  evaluatorId: number,
  verdict: DictamenVerdict,
  comment: string,
) {
  // Dictamen is an append-only feedback history with no unique constraint on
  // (projectId, evaluatorId), so `upsert` can't target it by that compound
  // key. Use findFirst+create to stay idempotent across repeated seed runs.
  const existing = await prisma.dictamen.findFirst({ where: { projectId, evaluatorId, comment } });
  if (existing) return existing;
  return prisma.dictamen.create({ data: { projectId, evaluatorId, verdict, comment } });
}

async function main() {
  await resetDatabase();

  console.log("[demo] Seeding SDG catalog (17 official goals)...");
  for (const sdg of SDGS) {
    await prisma.sdg.upsert({ where: { id: sdg.id }, update: sdg, create: sdg });
  }

  console.log("[demo] Seeding category catalog (22 entries)...");
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: category,
      create: category,
    });
  }

  console.log("[demo] Seeding demo users (STUDENT -> @alu.uabcs.mx, TEACHER -> @uabcs.mx)...");
  const passwordHash = await bcrypt.hash("praxis123", 10);

  // --- Teachers (@uabcs.mx) ---

  const carlos = await prisma.user.upsert({
    where: { email: "carlos.rios@uabcs.mx" },
    update: {},
    create: {
      email: "carlos.rios@uabcs.mx",
      passwordHash,
      name: "Carlos Ríos",
      accountType: AccountType.TEACHER,
      skills: ["Metodología ABP", "Gestión de proyectos"],
      interests: ["Innovación educativa"],
      academicProgram: "Departamento Académico de Sistemas Computacionales",
      verified: true,
      verifiedAt: new Date(),
    },
  });

  const valeria = await prisma.user.upsert({
    where: { email: "valeria.nuno@uabcs.mx" },
    update: {},
    create: {
      email: "valeria.nuno@uabcs.mx",
      passwordHash,
      name: "Valeria Nuño",
      accountType: AccountType.TEACHER,
      skills: ["Sistemas embebidos", "Mecatrónica"],
      interests: ["Tecnología asistiva", "Innovación educativa"],
      academicProgram: "Departamento Académico de Ingeniería en Electrónica",
      verified: true,
      verifiedAt: new Date(),
    },
  });

  const monica = await prisma.user.upsert({
    where: { email: "monica.gomez@uabcs.mx" },
    update: {},
    create: {
      email: "monica.gomez@uabcs.mx",
      passwordHash,
      name: "Mónica Gómez",
      accountType: AccountType.TEACHER,
      skills: ["Ecología marina", "Buceo científico"],
      interests: ["Conservación marina", "Cambio climático"],
      academicProgram: "Departamento Académico de Biología Marina",
      verified: true,
      verifiedAt: new Date(),
    },
  });

  // --- Students (@alu.uabcs.mx) ---

  const ana = await prisma.user.upsert({
    where: { email: "ana.martinez@alu.uabcs.mx" },
    update: {},
    create: {
      email: "ana.martinez@alu.uabcs.mx",
      passwordHash,
      name: "Ana Martínez",
      accountType: AccountType.STUDENT,
      skills: ["React", "Node.js", "Diseño UX"],
      interests: ["Educación", "Sostenibilidad"],
      academicProgram: "Ingeniería en Sistemas Computacionales",
      verified: true,
      verifiedAt: new Date(),
    },
  });

  const luis = await prisma.user.upsert({
    where: { email: "luis.hernandez@alu.uabcs.mx" },
    update: {},
    create: {
      email: "luis.hernandez@alu.uabcs.mx",
      passwordHash,
      name: "Luis Hernández",
      accountType: AccountType.STUDENT,
      skills: ["Python", "Análisis de datos"],
      interests: ["ODS", "Impacto social"],
      academicProgram: "Ingeniería en Sistemas Computacionales",
      verified: true,
      verifiedAt: new Date(),
    },
  });

  const diego = await prisma.user.upsert({
    where: { email: "diego.flores@alu.uabcs.mx" },
    update: {},
    create: {
      email: "diego.flores@alu.uabcs.mx",
      passwordHash,
      name: "Diego Flores",
      accountType: AccountType.STUDENT,
      skills: ["React Native", "UX research"],
      interests: ["Salud digital", "Apps móviles"],
      academicProgram: "Ingeniería en Sistemas Computacionales",
      verified: true,
      verifiedAt: new Date(),
    },
  });

  const jorge = await prisma.user.upsert({
    where: { email: "jorge.perez@alu.uabcs.mx" },
    update: {},
    create: {
      email: "jorge.perez@alu.uabcs.mx",
      passwordHash,
      name: "Jorge Pérez",
      accountType: AccountType.STUDENT,
      skills: ["Arduino", "Diseño de circuitos", "C++"],
      interests: ["Robótica", "Tecnología asistiva"],
      academicProgram: "Ingeniería en Electrónica",
      verified: true,
      verifiedAt: new Date(),
    },
  });

  const mariana = await prisma.user.upsert({
    where: { email: "mariana.castro@alu.uabcs.mx" },
    update: {},
    create: {
      email: "mariana.castro@alu.uabcs.mx",
      passwordHash,
      name: "Mariana Castro",
      accountType: AccountType.STUDENT,
      skills: ["AutoCAD", "SketchUp", "Diseño sustentable"],
      interests: ["Vivienda social", "Urbanismo"],
      academicProgram: "Arquitectura",
      verified: true,
      verifiedAt: new Date(),
    },
  });

  const paola = await prisma.user.upsert({
    where: { email: "paola.ramos@alu.uabcs.mx" },
    update: {},
    create: {
      email: "paola.ramos@alu.uabcs.mx",
      passwordHash,
      name: "Paola Ramos",
      accountType: AccountType.STUDENT,
      skills: ["Maquetación", "Render 3D"],
      interests: ["Vivienda social", "Bioclimática"],
      academicProgram: "Arquitectura",
      verified: true,
      verifiedAt: new Date(),
    },
  });

  const sofia = await prisma.user.upsert({
    where: { email: "sofia.lugo@alu.uabcs.mx" },
    update: {},
    create: {
      email: "sofia.lugo@alu.uabcs.mx",
      passwordHash,
      name: "Sofía Lugo",
      accountType: AccountType.STUDENT,
      skills: ["Buceo científico", "Identificación de especies", "Fotografía submarina"],
      interests: ["Conservación marina", "Arrecifes"],
      academicProgram: "Biología Marina",
      verified: true,
      verifiedAt: new Date(),
    },
  });

  const renata = await prisma.user.upsert({
    where: { email: "renata.cruz@alu.uabcs.mx" },
    update: {},
    create: {
      email: "renata.cruz@alu.uabcs.mx",
      passwordHash,
      name: "Renata Cruz",
      accountType: AccountType.STUDENT,
      skills: ["Análisis de datos ecológicos", "Buceo científico"],
      interests: ["Cambio climático", "Ecosistemas costeros"],
      academicProgram: "Biología Marina",
      verified: true,
      verifiedAt: new Date(),
    },
  });

  // --- Projects --------------------------------------------------------

  console.log("[demo] Seeding demo projects...");

  const reefProject = await findOrCreateProject("Monitoreo de arrecifes coralinos en Bahía de La Paz", {
    name: "Monitoreo de arrecifes coralinos en Bahía de La Paz",
    description:
      "Monitoreo participativo de la salud de los arrecifes coralinos en tres sitios de la Bahía de La Paz, con apoyo de buceo científico estudiantil.",
    problemStatement:
      "Los arrecifes de la bahía muestran señales de blanqueamiento y no existe un monitoreo sistemático que documente su evolución a lo largo del tiempo.",
    objectives: "Generar una línea base de cobertura coralina y un protocolo replicable de monitoreo trimestral.",
    visibility: ProjectVisibility.PUBLIC,
    bannerUrl: "https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=1200&q=75&fit=crop",
    owner: { connect: { id: sofia.id } },
    teacher: { connect: { id: monica.id } },
  });

  const heatAlertProject = await findOrCreateProject(
    "Sistema de alerta temprana de puntos de calor urbano en La Paz",
    {
      name: "Sistema de alerta temprana de puntos de calor urbano en La Paz",
      description:
        "Plataforma web que cruza datos satelitales y reportes ciudadanos para identificar las zonas de la ciudad con mayor riesgo por calor extremo.",
      problemStatement:
        "La Paz registra temperaturas cada vez más altas y no existe una herramienta accesible que señale las zonas más vulnerables para priorizar acciones.",
      objectives: "Lanzar una versión beta con el mapa de calor de al menos tres colonias piloto.",
      visibility: ProjectVisibility.PUBLIC,
      bannerUrl: "https://images.unsplash.com/photo-1732025407668-2e1c2f67f810?w=1200&q=75&fit=crop",
      owner: { connect: { id: ana.id } },
      teacher: { connect: { id: carlos.id } },
    },
  );

  const bioclimaticHousingProject = await findOrCreateProject(
    "Vivienda bioclimática con materiales regionales",
    {
      name: "Vivienda bioclimática con materiales regionales",
      description:
        "Propuesta de vivienda bioclimática que aprovecha materiales regionales y estrategias pasivas de enfriamiento para el clima desértico de la península.",
      problemStatement:
        "La mayoría de la vivienda económica de la región no considera el clima extremo, lo que incrementa el consumo eléctrico por climatización.",
      objectives: "Entregar un modelo arquitectónico validado con un prototipo de muro bioclimático a escala.",
      visibility: ProjectVisibility.PUBLIC,
      bannerUrl: "https://images.unsplash.com/photo-1785024773232-aa575a4f5dbf?w=1200&q=75&fit=crop",
      owner: { connect: { id: mariana.id } },
      teacher: { connect: { id: valeria.id } },
    },
  );

  console.log("[demo] Linking projects to SDGs and categories...");
  await linkSdg(reefProject.id, 14); // Vida submarina
  await linkSdg(reefProject.id, 13); // Acción por el clima
  await linkCategory(reefProject.id, 6); // Ciencias del Mar y Costeras

  await linkSdg(heatAlertProject.id, 11); // Ciudades y comunidades sostenibles
  await linkSdg(heatAlertProject.id, 13); // Acción por el clima
  await linkCategory(heatAlertProject.id, 1); // Tecnología y Computación

  await linkSdg(bioclimaticHousingProject.id, 11); // Ciudades y comunidades sostenibles
  await linkCategory(bioclimaticHousingProject.id, 3); // Arquitectura y Diseño Urbano

  console.log("[demo] Wiring evaluator links (teacher + accepted EVALUATOR TeamRequest)...");
  // `findOrCreateProject` only writes the teacher connect on first insert, so
  // on a re-run we re-apply it explicitly alongside the accepted EVALUATOR
  // TeamRequest row that is the real consent record (mirrors seed.ts).
  await prisma.project.update({ where: { id: reefProject.id }, data: { teacherId: monica.id } });
  await ensureEvaluatorLink(reefProject.id, monica.id);

  await prisma.project.update({ where: { id: heatAlertProject.id }, data: { teacherId: carlos.id } });
  await ensureEvaluatorLink(heatAlertProject.id, carlos.id);

  await prisma.project.update({
    where: { id: bioclimaticHousingProject.id },
    data: { teacherId: valeria.id },
  });

  console.log("[demo] Seeding team memberships...");
  await ensureTeamMember(
    reefProject.id,
    renata.id,
    TeamRequestRole.COLLABORATOR,
    TeamRequestStatus.ACCEPTED,
    "Puedo apoyar con los transectos y el registro fotográfico.",
  );

  await ensureTeamMember(
    heatAlertProject.id,
    luis.id,
    TeamRequestRole.COLLABORATOR,
    TeamRequestStatus.ACCEPTED,
    "Puedo ayudar con el análisis de datos satelitales.",
  );
  await ensureTeamMember(
    heatAlertProject.id,
    diego.id,
    TeamRequestRole.COLLABORATOR,
    TeamRequestStatus.ACCEPTED,
    "Me interesa trabajar en la app móvil de reportes ciudadanos.",
  );

  await ensureTeamMember(
    bioclimaticHousingProject.id,
    paola.id,
    TeamRequestRole.COLLABORATOR,
    TeamRequestStatus.ACCEPTED,
    "Puedo apoyar con los renders y la maquetación del prototipo.",
  );

  console.log("[demo] Seeding a pending team request (for Solicitudes Recibidas)...");
  await ensureTeamMember(
    heatAlertProject.id,
    jorge.id,
    TeamRequestRole.COLLABORATOR,
    TeamRequestStatus.PENDING,
    "Me gustaría colaborar con el diseño de sensores IoT para medir temperatura en campo.",
  );

  // --- Additional projects (feed richness for the demo) -------------------

  console.log("[demo] Seeding additional demo projects...");

  const telemedicineProject = await findOrCreateProject(
    "Telemedicina comunitaria para zonas rurales de BCS",
    {
      name: "Telemedicina comunitaria para zonas rurales de BCS",
      description:
        "Aplicación de telemedicina que conecta clínicas comunitarias de zonas rurales con médicos generales para consultas de seguimiento a distancia.",
      problemStatement:
        "Las comunidades rurales de Baja California Sur tienen que viajar horas para una consulta de seguimiento, lo que provoca abandono de tratamientos.",
      objectives: "Validar el flujo de consulta remota con al menos una clínica comunitaria piloto.",
      visibility: ProjectVisibility.PUBLIC,
      bannerUrl: "https://images.unsplash.com/photo-1732025407668-2e1c2f67f810?w=1200&q=75&fit=crop",
      owner: { connect: { id: diego.id } },
      teacher: { connect: { id: valeria.id } },
    },
  );

  const roboticsTherapyProject = await findOrCreateProject(
    "Brazo robótico de bajo costo para terapia física",
    {
      name: "Brazo robótico de bajo costo para terapia física",
      description:
        "Dispositivo robótico de bajo costo para asistir ejercicios de terapia física de mano y muñeca en pacientes con movilidad reducida.",
      problemStatement:
        "El equipo de rehabilitación robótica es inaccesible para clínicas públicas de la región por su costo.",
      objectives: "Construir y probar un prototipo funcional con al menos un paciente voluntario.",
      visibility: ProjectVisibility.PUBLIC,
      bannerUrl: "https://images.unsplash.com/photo-1732025407668-2e1c2f67f810?w=1200&q=75&fit=crop",
      owner: { connect: { id: jorge.id } },
      teacher: { connect: { id: valeria.id } },
    },
  );

  const fisheriesDataProject = await findOrCreateProject(
    "Tablero de datos abiertos de pesca sustentable en La Paz",
    {
      name: "Tablero de datos abiertos de pesca sustentable en La Paz",
      description:
        "Tablero público que concentra los datos de captura de cooperativas pesqueras locales para apoyar decisiones de manejo sustentable.",
      problemStatement:
        "Las cooperativas pesqueras registran su captura en papel y no existe una fuente consolidada que permita detectar sobreexplotación a tiempo.",
      objectives: "Publicar un tablero funcional con datos de al menos tres cooperativas pesqueras.",
      visibility: ProjectVisibility.PUBLIC,
      bannerUrl: "https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=1200&q=75&fit=crop",
      owner: { connect: { id: luis.id } },
      teacher: { connect: { id: monica.id } },
    },
  );

  const mangroveProject = await findOrCreateProject(
    "Restauración de manglares en la Ensenada de La Paz",
    {
      name: "Restauración de manglares en la Ensenada de La Paz",
      description:
        "Reforestación participativa de manglar rojo en zonas degradadas de la Ensenada de La Paz, con monitoreo de sobrevivencia de los propágulos.",
      problemStatement:
        "La pérdida histórica de manglar en la ensenada ha reducido la protección costera y el hábitat de especies juveniles de interés pesquero.",
      objectives: "Reforestar un sitio piloto y documentar la tasa de sobrevivencia a ocho semanas.",
      visibility: ProjectVisibility.PUBLIC,
      bannerUrl: "https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=1200&q=75&fit=crop",
      owner: { connect: { id: renata.id } },
      teacher: { connect: { id: monica.id } },
    },
  );

  console.log("[demo] Linking additional projects to SDGs and categories...");
  await linkSdg(telemedicineProject.id, 3); // Salud y bienestar
  await linkCategory(telemedicineProject.id, 1); // Tecnología y Computación

  await linkSdg(roboticsTherapyProject.id, 3); // Salud y bienestar
  await linkSdg(roboticsTherapyProject.id, 10); // Reducción de las desigualdades
  await linkCategory(roboticsTherapyProject.id, 4); // Electrónica y Robótica

  await linkSdg(fisheriesDataProject.id, 14); // Vida submarina
  await linkCategory(fisheriesDataProject.id, 7); // Pesca y Acuicultura

  await linkSdg(mangroveProject.id, 15); // Vida de ecosistemas terrestres
  await linkSdg(mangroveProject.id, 13); // Acción por el clima
  await linkCategory(mangroveProject.id, 6); // Ciencias del Mar y Costeras

  console.log("[demo] Wiring evaluator links for additional projects...");
  await prisma.project.update({ where: { id: telemedicineProject.id }, data: { teacherId: valeria.id } });
  await ensureEvaluatorLink(telemedicineProject.id, valeria.id);

  await prisma.project.update({ where: { id: roboticsTherapyProject.id }, data: { teacherId: valeria.id } });
  await ensureEvaluatorLink(roboticsTherapyProject.id, valeria.id);

  await prisma.project.update({ where: { id: fisheriesDataProject.id }, data: { teacherId: monica.id } });
  await ensureEvaluatorLink(fisheriesDataProject.id, monica.id);

  await prisma.project.update({ where: { id: mangroveProject.id }, data: { teacherId: monica.id } });
  await ensureEvaluatorLink(mangroveProject.id, monica.id);

  // --- Kanban board for the reef monitoring project -----------------------

  console.log("[demo] Seeding project labels for the reef monitoring project...");
  const reefLabels = {
    Campo: (await ensureLabel(reefProject.id, "Campo", "#00897B")).id,
    Fotografía: (await ensureLabel(reefProject.id, "Fotografía", "#1E88E5")).id,
    Reporte: (await ensureLabel(reefProject.id, "Reporte", "#8E24AA")).id,
    Urgente: (await ensureLabel(reefProject.id, "Urgente", "#E53935")).id,
  };

  console.log("[demo] Seeding Kanban activities for the reef monitoring project...");
  await seedActivity(
    reefProject.id,
    sofia.id,
    {
      title: "Levantar línea base de cobertura coralina en 3 sitios de muestreo",
      description:
        "Transectos de buceo para documentar el porcentaje de cobertura coralina viva en los sitios de referencia.",
      dueDateOffsetDays: -20,
      completedOffsetDays: -17,
      status: ActivityStatus.DONE,
      priority: ActivityPriority.ALTA,
      position: 0,
      assigneeIds: [sofia.id, renata.id],
      labelNames: ["Campo"],
      sections: [
        {
          name: "Trabajo de campo",
          items: [
            { text: "Realizar transectos en El Mogote", done: true, doneById: sofia.id },
            { text: "Registrar coordenadas GPS de cada sitio", done: true, doneById: renata.id },
          ],
        },
      ],
      comments: [
        { authorId: renata.id, text: "Los tres sitios quedaron georreferenciados y con fotos de respaldo." },
        { authorId: sofia.id, text: "Perfecto, armo la línea base esta semana." },
      ],
      events: [
        { from: null, to: ActivityStatus.IN_PROGRESS, actorId: sofia.id },
        { from: ActivityStatus.IN_PROGRESS, to: ActivityStatus.TO_VALIDATE, actorId: renata.id },
        { from: ActivityStatus.TO_VALIDATE, to: ActivityStatus.DONE, actorId: monica.id },
      ],
    },
    reefLabels,
  );

  await seedActivity(
    reefProject.id,
    sofia.id,
    {
      title: "Capturar fotografías subacuáticas para catálogo de especies",
      description:
        "Fotografiar las especies de coral y fauna asociada observadas en los transectos para armar un catálogo visual.",
      dueDateOffsetDays: 6,
      status: ActivityStatus.IN_PROGRESS,
      priority: ActivityPriority.MEDIA,
      position: 0,
      assigneeIds: [renata.id],
      labelNames: ["Fotografía"],
      unsectionedItems: [
        { text: "Subir fotografías del primer sitio", done: true, doneById: renata.id },
        { text: "Etiquetar especies observadas", done: false },
      ],
      events: [{ from: null, to: ActivityStatus.IN_PROGRESS, actorId: renata.id }],
    },
    reefLabels,
  );

  await seedActivity(
    reefProject.id,
    sofia.id,
    {
      title: "Redactar reporte preliminar de blanqueamiento coralino",
      description:
        "Documento con los primeros hallazgos sobre el estado de blanqueamiento observado en los sitios muestreados.",
      dueDateOffsetDays: 3,
      status: ActivityStatus.TO_VALIDATE,
      priority: ActivityPriority.ALTA,
      position: 0,
      assigneeIds: [sofia.id],
      labelNames: ["Reporte", "Urgente"],
      unsectionedItems: [
        { text: "Redactar hallazgos preliminares", done: true, doneById: sofia.id },
        { text: "Anexar fotografías de respaldo", done: true, doneById: sofia.id },
      ],
      comments: [{ authorId: monica.id, text: "Buen avance, reviso el reporte antes del viernes." }],
      events: [
        { from: null, to: ActivityStatus.IN_PROGRESS, actorId: sofia.id },
        { from: ActivityStatus.IN_PROGRESS, to: ActivityStatus.TO_VALIDATE, actorId: sofia.id },
      ],
    },
    reefLabels,
  );

  await seedActivity(
    reefProject.id,
    sofia.id,
    {
      title: "Planear segunda jornada de monitoreo",
      description: "Definir fechas, sitios adicionales y logística de buceo para la siguiente jornada trimestral.",
      dueDateOffsetDays: 25,
      status: ActivityStatus.PENDING,
      priority: ActivityPriority.MEDIA,
      position: 0,
      assigneeIds: [sofia.id],
    },
    reefLabels,
  );

  await seedActivity(
    reefProject.id,
    sofia.id,
    {
      title: "Coordinar con la Dirección de Áreas Naturales Protegidas",
      description: "Gestionar el permiso de monitoreo y compartir los primeros hallazgos con la autoridad ambiental.",
      dueDateOffsetDays: -2,
      status: ActivityStatus.PENDING,
      priority: ActivityPriority.ALTA,
      position: 1,
      assigneeIds: [renata.id],
      labelNames: ["Urgente"],
    },
    reefLabels,
  );

  // --- Progress update + evidence (gallery / PDF viewer demo) -------------

  console.log("[demo] Seeding a progress update with image + PDF evidence...");
  const reefProgressUpdate = await ensureProgressUpdate(
    reefProject.id,
    sofia.id,
    "Cerramos la primera jornada de monitoreo en los tres sitios de muestreo. Adjuntamos fotografías de los transectos y el reporte preliminar con los primeros datos de cobertura coralina.",
    { postedToFeed: true, validated: true },
  );

  // NOTE: these evidence URLs are placeholders for the demo script. The real
  // upload endpoint always returns an ABSOLUTE url (see
  // upload.controller.ts: `${req.protocol}://${req.get("host")}/uploads/...`)
  // because the frontend (port 5173) and backend (port 4000) run on
  // different origins in dev with no Vite proxy — a relative "/uploads/..."
  // url would resolve against the frontend's own origin and 404 even with
  // the files in place. These placeholders do not resolve to real files, so
  // the gallery/PDF viewer will show a broken thumbnail unless matching
  // files are dropped under `backend/uploads/demo/` with these exact names
  // before the live demo.
  const DEMO_BACKEND_ORIGIN = "http://localhost:4000";
  await ensureEvidence(
    reefProgressUpdate.id,
    EvidenceType.FILE,
    `${DEMO_BACKEND_ORIGIN}/uploads/demo/arrecife-transecto-el-mogote.jpg`,
    "arrecife-transecto-el-mogote.jpg",
  );
  await ensureEvidence(
    reefProgressUpdate.id,
    EvidenceType.FILE,
    `${DEMO_BACKEND_ORIGIN}/uploads/demo/reporte-preliminar-blanqueamiento.pdf`,
    "reporte-preliminar-blanqueamiento.pdf",
  );

  console.log("[demo] Seeding additional general progress updates...");
  await ensureProgressUpdate(
    heatAlertProject.id,
    ana.id,
    "Terminamos el primer cruce de datos satelitales con los reportes ciudadanos de tres colonias piloto. La próxima semana integramos el mapa de calor a la beta.",
    { postedToFeed: true, validated: false },
  );

  await ensureProgressUpdate(
    bioclimaticHousingProject.id,
    mariana.id,
    "Terminamos el prototipo a escala del muro bioclimático y lo dejamos expuesto a sol directo para medir la diferencia de temperatura interior durante una semana.",
    { postedToFeed: true, validated: true },
  );

  await ensureProgressUpdate(
    telemedicineProject.id,
    diego.id,
    "Completamos las primeras 10 consultas piloto con la clínica comunitaria de Todos Santos. El siguiente sprint integra recordatorios por SMS para pacientes sin conexión constante.",
    { postedToFeed: true, validated: false },
  );

  await ensureProgressUpdate(
    roboticsTherapyProject.id,
    jorge.id,
    "Terminamos el prototipo del actuador del brazo robótico y lo probamos con el primer paciente voluntario en terapia de mano.",
    { postedToFeed: true, validated: true },
  );

  await ensureProgressUpdate(
    fisheriesDataProject.id,
    luis.id,
    "Publicamos el primer tablero con datos de captura de tres cooperativas pesqueras de La Paz. Ya se puede filtrar por especie y temporada.",
    { postedToFeed: true, validated: false },
  );

  await ensureProgressUpdate(
    mangroveProject.id,
    renata.id,
    "Sembramos el primer lote de 500 propágulos de mangle rojo en la zona piloto de la Ensenada de La Paz. En dos semanas medimos la tasa de sobrevivencia.",
    { postedToFeed: true, validated: true },
  );

  // --- Dictámenes -----------------------------------------------------

  console.log("[demo] Seeding dictámenes...");
  await ensureDictamen(
    reefProject.id,
    monica.id,
    DictamenVerdict.APPROVED,
    "El monitoreo muestra una metodología sólida y datos consistentes entre los tres sitios. Aprobado para continuar con la segunda jornada y la publicación del reporte.",
  );
  await ensureDictamen(
    heatAlertProject.id,
    carlos.id,
    DictamenVerdict.CHANGES_REQUESTED,
    "Buen avance en el prototipo del mapa de calor, pero falta documentar la fuente y la fecha de los datos satelitales antes de publicar la beta.",
  );

  // --- Saved projects (Guardados screen) -----------------------------

  console.log("[demo] Seeding a saved project...");
  await ensureSavedProject(diego.id, reefProject.id);

  // --- Class group (teacher-owned, self-serve student membership) -----

  console.log("[demo] Seeding a sample class group...");
  const existingClassGroup = await prisma.classGroup.findFirst({
    where: { name: "Programación Avanzada — ISC 7mo semestre", teacherId: carlos.id },
  });
  const classGroup =
    existingClassGroup ??
    (await prisma.classGroup.create({
      data: {
        name: "Programación Avanzada — ISC 7mo semestre",
        description:
          "Grupo de 7mo semestre de Ingeniería en Sistemas Computacionales donde se desarrollan proyectos con enfoque social.",
        bannerUrl: "https://images.unsplash.com/photo-1719159381981-1327b22aff9b?w=1200&q=75&fit=crop",
        teacherId: carlos.id,
      },
    }));

  await ensureClassGroupMember(classGroup.id, ana.id);
  await ensureClassGroupMember(classGroup.id, luis.id);
  await ensureClassGroupMember(classGroup.id, diego.id);

  const existingClassGroupResource = await prisma.classGroupResource.findFirst({
    where: { classGroupId: classGroup.id, label: "Temario del curso" },
  });
  if (!existingClassGroupResource) {
    await prisma.classGroupResource.create({
      data: {
        classGroupId: classGroup.id,
        creatorId: carlos.id,
        type: EvidenceType.LINK,
        url: "https://example.com/temario-programacion-avanzada.pdf",
        label: "Temario del curso",
        description: "Temario compartido con el grupo al inicio del semestre.",
      },
    });
  }

  await prisma.project.update({
    where: { id: heatAlertProject.id },
    data: { classGroupId: classGroup.id },
  });

  // --- Challenge (Retos screen) ----------------------------------------

  console.log("[demo] Seeding a sample challenge...");
  const existingChallenge = await prisma.challenge.findFirst({
    where: { title: "Reducción de residuos plásticos en zonas costeras de La Paz" },
  });
  const challenge =
    existingChallenge ??
    (await prisma.challenge.create({
      data: {
        title: "Reducción de residuos plásticos en zonas costeras de La Paz",
        description:
          "Buscamos propuestas estudiantiles para disminuir la contaminación por plásticos de un solo uso en playas y zonas costeras de La Paz.",
        deadline: daysFromNow(45),
        bannerUrl: "https://images.unsplash.com/photo-1554265352-d7fd5129be15?w=1200&q=75&fit=crop",
        // Challenge.organizationId is a plain FK to User; the service layer
        // allows both ORGANIZATION and TEACHER accounts to author a
        // challenge, so a TEACHER is used here to avoid creating an
        // ORGANIZATION account for this demo dataset.
        organizationId: monica.id,
      },
    }));
  if (!existingChallenge) {
    await prisma.challengeSdg.createMany({
      data: [{ challengeId: challenge.id, sdgId: 14 }],
      skipDuplicates: true,
    });
    await prisma.challengeCategory.createMany({
      data: [{ challengeId: challenge.id, categoryId: 6 }],
      skipDuplicates: true,
    });
  }

  console.log("[demo] Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
