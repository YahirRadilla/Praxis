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
  DictamenVerdict,
  type Prisma,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

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

// --- Helpers -----------------------------------------------------------

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
 * Demo evaluator link: real evaluator links only ever come from an accepted
 * EVALUATOR TeamRequest (WU-05's consent flow); seed data is allowed to set
 * up that already-accepted state directly since it never goes through the
 * real invitation/consent validation. Pairs with the `teacher`/
 * `organization` direct connect already set on the project.
 *
 * Forces the EVALUATOR state on `update` too (not just `create`): because of
 * `@@unique([projectId, userId])`, a pre-existing row for this pair (e.g. a
 * leftover MEMBER request from earlier manual testing, migrated to
 * `purpose: MEMBER` by the WU-04 migration's column default) would otherwise
 * be left untouched by the upsert and silently block the intended evaluator
 * link.
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

async function ensureDictamen(
  projectId: number,
  evaluatorId: number,
  verdict: DictamenVerdict,
  comment: string,
) {
  // Dictamen has no unique constraint on (projectId, evaluatorId) anymore
  // (append-only feedback history, dropped in `drop_dictamen_unique_constraint`),
  // so `upsert` can't target it by that compound key. Use findFirst+create
  // to stay idempotent across repeated seed runs instead.
  const existing = await prisma.dictamen.findFirst({ where: { projectId, evaluatorId, comment } });
  if (existing) return existing;
  return prisma.dictamen.create({ data: { projectId, evaluatorId, verdict, comment } });
}

async function main() {
  console.log("Seeding SDG catalog (17 official goals)...");
  for (const sdg of SDGS) {
    await prisma.sdg.upsert({ where: { id: sdg.id }, update: sdg, create: sdg });
  }

  console.log("Seeding category catalog (22 entries)...");
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: category,
      create: category,
    });
  }

  console.log("Seeding sample users...");
  const passwordHash = await bcrypt.hash("praxis123", 10);

  const student = await prisma.user.upsert({
    where: { email: "ana.martinez@alumnos.udg.mx" },
    update: { academicProgram: "Ingeniería en Sistemas Computacionales" },
    create: {
      email: "ana.martinez@alumnos.udg.mx",
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

  const collaborator = await prisma.user.upsert({
    where: { email: "luis.hernandez@alumnos.udg.mx" },
    update: { academicProgram: "Ingeniería en Sistemas Computacionales" },
    create: {
      email: "luis.hernandez@alumnos.udg.mx",
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

  const teacher = await prisma.user.upsert({
    where: { email: "carlos.rios@udg.mx" },
    update: { academicProgram: "Departamento Académico de Sistemas Computacionales" },
    create: {
      email: "carlos.rios@udg.mx",
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

  const organization = await prisma.user.upsert({
    where: { email: "contacto@fundacionverde.org" },
    update: { academicProgram: "Organización civil enfocada en sostenibilidad ambiental" },
    create: {
      email: "contacto@fundacionverde.org",
      passwordHash,
      name: "Fundación Verde A.C.",
      accountType: AccountType.ORGANIZATION,
      skills: [],
      interests: ["Medio ambiente", "Reforestación"],
      academicProgram: "Organización civil enfocada en sostenibilidad ambiental",
      verified: false,
    },
  });

  await prisma.user.upsert({
    where: { email: "paola.ramos@gmail.com" },
    update: { academicProgram: "Gestión comunitaria y voluntariado" },
    create: {
      email: "paola.ramos@gmail.com",
      passwordHash,
      name: "Paola Ramos",
      accountType: AccountType.INDEPENDENT,
      skills: ["Gestión comunitaria", "Fotografía"],
      interests: ["Impacto social", "Voluntariado"],
      academicProgram: "Gestión comunitaria y voluntariado",
      verified: false,
    },
  });

  console.log("Seeding additional demo users across disciplines...");
  const mariana = await prisma.user.upsert({
    where: { email: "mariana.castro@alumnos.uabcs.mx" },
    update: {},
    create: {
      email: "mariana.castro@alumnos.uabcs.mx",
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

  const jorge = await prisma.user.upsert({
    where: { email: "jorge.perez@alumnos.uabcs.mx" },
    update: {},
    create: {
      email: "jorge.perez@alumnos.uabcs.mx",
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

  const sofia = await prisma.user.upsert({
    where: { email: "sofia.lugo@alumnos.uabcs.mx" },
    update: {},
    create: {
      email: "sofia.lugo@alumnos.uabcs.mx",
      passwordHash,
      name: "Sofía Lugo",
      accountType: AccountType.STUDENT,
      skills: ["Planeación turística", "Redacción", "Fotografía"],
      interests: ["Turismo sustentable", "Patrimonio natural"],
      academicProgram: "Turismo Alternativo",
      verified: true,
      verifiedAt: new Date(),
    },
  });

  const diego = await prisma.user.upsert({
    where: { email: "diego.flores@alumnos.uabcs.mx" },
    update: {},
    create: {
      email: "diego.flores@alumnos.uabcs.mx",
      passwordHash,
      name: "Diego Flores",
      accountType: AccountType.STUDENT,
      skills: ["React Native", "UX research", "Nutrición básica"],
      interests: ["Salud digital", "Apps móviles"],
      academicProgram: "Ingeniería en Sistemas Computacionales",
      verified: true,
      verifiedAt: new Date(),
    },
  });

  const renata = await prisma.user.upsert({
    where: { email: "renata.cruz@alumnos.uabcs.mx" },
    update: {},
    create: {
      email: "renata.cruz@alumnos.uabcs.mx",
      passwordHash,
      name: "Renata Cruz",
      accountType: AccountType.STUDENT,
      skills: ["Gastronomía regional", "Costeo de recetas"],
      interests: ["Economía circular", "Cocina sudcaliforniana"],
      academicProgram: "Gastronomía",
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

  console.log("Seeding sample project...");
  const project = await findOrCreateProject("Recicla UDG", {
    name: "Recicla UDG",
    description: "Plataforma para coordinar puntos de acopio de reciclaje dentro del campus.",
    problemStatement: "El campus no tiene un sistema centralizado para gestionar el reciclaje de residuos.",
    objectives: "Reducir en 30% los residuos no separados durante el primer semestre de operación.",
    visibility: ProjectVisibility.PUBLIC,
    owner: { connect: { id: student.id } },
    teacher: { connect: { id: teacher.id } },
    organization: { connect: { id: organization.id } },
  });

  console.log("Linking project to SDGs 11 and 12...");
  await linkSdg(project.id, 11);
  await linkSdg(project.id, 12);

  console.log("Linking project to its category...");
  await linkCategory(project.id, 9); // Sustentabilidad y Medio Ambiente

  console.log("Seeding accepted evaluator links (teacher + organization)...");
  // `findOrCreateProject` only writes on first insert, and the WU-04
  // migration clears every project's teacherId/organizationId directly in
  // the DB (uncounseted pre-existing links), so an already-seeded project
  // needs these fields re-applied explicitly on every seed run, alongside
  // the accepted EVALUATOR TeamRequest row that is the real consent record.
  await prisma.project.update({
    where: { id: project.id },
    data: { teacherId: teacher.id, organizationId: organization.id },
  });
  await ensureEvaluatorLink(project.id, teacher.id);
  await ensureEvaluatorLink(project.id, organization.id);

  console.log("Seeding a team request...");
  await ensureTeamMember(
    project.id,
    collaborator.id,
    TeamRequestRole.COLLABORATOR,
    TeamRequestStatus.ACCEPTED,
    "Me interesa colaborar en la parte de datos.",
  );

  // --- Additional demo projects across disciplines ------------------------

  console.log("Seeding additional demo projects across UABCS disciplines...");

  const roboticArm = await findOrCreateProject("Prototipo de brazo robótico asistivo", {
    name: "Prototipo de brazo robótico asistivo",
    description:
      "Desarrollo de un brazo robótico de bajo costo para apoyar tareas cotidianas de personas con discapacidad motriz.",
    problemStatement:
      "Las prótesis y brazos asistivos comerciales son inaccesibles económicamente para la mayoría de las familias de la región.",
    objectives: "Construir un prototipo funcional con componentes impresos en 3D y control por sensores de bajo costo.",
    visibility: ProjectVisibility.PUBLIC,
    owner: { connect: { id: jorge.id } },
    teacher: { connect: { id: valeria.id } },
  });

  const touristRoute = await findOrCreateProject("Ruta turística sustentable en La Paz", {
    name: "Ruta turística sustentable en La Paz",
    description:
      "Diseño de una ruta turística de bajo impacto ambiental que conecta atractivos naturales de la bahía de La Paz.",
    problemStatement:
      "El crecimiento turístico de la zona no cuenta con rutas que distribuyan la afluencia y protejan los ecosistemas costeros.",
    objectives: "Publicar una ruta y folleto bilingüe validado por prestadores de servicios turísticos locales.",
    visibility: ProjectVisibility.PUBLIC,
    owner: { connect: { id: sofia.id } },
    teacher: { connect: { id: teacher.id } },
  });

  const modularHousing = await findOrCreateProject("Vivienda modular de bajo costo", {
    name: "Vivienda modular de bajo costo",
    description: "Propuesta de vivienda modular con materiales regionales para familias de bajos ingresos en la península.",
    problemStatement: "El déficit de vivienda asequible en la región crece más rápido que la oferta de soluciones sustentables.",
    objectives: "Entregar un modelo arquitectónico y un presupuesto preliminar validado con costos reales de la región.",
    visibility: ProjectVisibility.PUBLIC,
    owner: { connect: { id: mariana.id } },
    teacher: { connect: { id: teacher.id } },
  });

  const healthyMenuApp = await findOrCreateProject(
    "App de menús saludables para cafeterías universitarias",
    {
      name: "App de menús saludables para cafeterías universitarias",
      description: "Aplicación móvil para consultar el valor nutricional de los menús ofrecidos en cafeterías del campus.",
      problemStatement: "Los estudiantes no tienen acceso claro a información nutricional de lo que consumen en el campus.",
      objectives: "Lanzar una versión beta con el menú de al menos una cafetería piloto.",
      visibility: ProjectVisibility.PUBLIC,
      owner: { connect: { id: diego.id } },
      teacher: { connect: { id: valeria.id } },
    },
  );

  const regionalCookbook = await findOrCreateProject(
    "Recetario de cocina regional sudcaliforniana con enfoque en economía circular",
    {
      name: "Recetario de cocina regional sudcaliforniana con enfoque en economía circular",
      description:
        "Recopilación de recetas tradicionales de Baja California Sur que privilegian ingredientes locales y el aprovechamiento integral de los alimentos.",
      problemStatement: "El conocimiento gastronómico regional se está perdiendo y gran parte de los alimentos se desperdicia en la preparación tradicional.",
      objectives: "Documentar al menos 15 recetas regionales con su versión de bajo desperdicio.",
      visibility: ProjectVisibility.PRIVATE,
      owner: { connect: { id: renata.id } },
    },
  );

  console.log("Linking new projects to categories and SDGs...");
  await linkCategory(roboticArm.id, 4); // Electrónica y Robótica
  await linkCategory(touristRoute.id, 15); // Turismo y Hospitalidad
  await linkCategory(modularHousing.id, 3); // Arquitectura y Diseño Urbano
  await linkSdg(modularHousing.id, 11);
  await linkCategory(healthyMenuApp.id, 1); // Tecnología y Computación
  await linkCategory(healthyMenuApp.id, 11); // Salud y Bienestar
  await linkCategory(regionalCookbook.id, 22); // Gastronomía
  await linkCategory(regionalCookbook.id, 9); // Sustentabilidad y Medio Ambiente

  console.log("Seeding accepted evaluator links for new projects...");
  await prisma.project.update({ where: { id: roboticArm.id }, data: { teacherId: valeria.id } });
  await prisma.project.update({ where: { id: touristRoute.id }, data: { teacherId: teacher.id } });
  await prisma.project.update({ where: { id: modularHousing.id }, data: { teacherId: teacher.id } });
  await prisma.project.update({ where: { id: healthyMenuApp.id }, data: { teacherId: valeria.id } });
  await ensureEvaluatorLink(roboticArm.id, valeria.id);
  await ensureEvaluatorLink(touristRoute.id, teacher.id);
  await ensureEvaluatorLink(modularHousing.id, teacher.id);
  await ensureEvaluatorLink(healthyMenuApp.id, valeria.id);

  console.log("Seeding team memberships for new projects...");
  await ensureTeamMember(
    roboticArm.id,
    diego.id,
    TeamRequestRole.COLLABORATOR,
    TeamRequestStatus.ACCEPTED,
    "Puedo ayudar con la programación del firmware.",
  );
  await ensureTeamMember(
    roboticArm.id,
    mariana.id,
    TeamRequestRole.COLLABORATOR,
    TeamRequestStatus.PENDING,
    "Me gustaría ayudar con el diseño ergonómico de la pinza.",
  );

  await ensureTeamMember(
    touristRoute.id,
    renata.id,
    TeamRequestRole.COLLABORATOR,
    TeamRequestStatus.ACCEPTED,
    "Me interesa apoyar con el contenido del folleto.",
  );

  await ensureTeamMember(
    modularHousing.id,
    jorge.id,
    TeamRequestRole.COLLABORATOR,
    TeamRequestStatus.ACCEPTED,
    "Puedo apoyar con los cálculos de instalación eléctrica.",
  );
  await ensureTeamMember(
    modularHousing.id,
    collaborator.id,
    TeamRequestRole.COLLABORATOR,
    TeamRequestStatus.PENDING,
    "Puedo ayudar con el modelo de costos del proyecto.",
  );

  await ensureTeamMember(
    healthyMenuApp.id,
    collaborator.id,
    TeamRequestRole.COLLABORATOR,
    TeamRequestStatus.ACCEPTED,
    "Me interesa colaborar con el análisis de datos nutricionales.",
  );

  // --- Kanban labels per project -------------------------------------------

  console.log("Seeding project labels...");
  const reciclaLabels = {
    Urgente: (await ensureLabel(project.id, "Urgente", "#E53935")).id,
    Backend: (await ensureLabel(project.id, "Backend", "#1E88E5")).id,
    Diseño: (await ensureLabel(project.id, "Diseño", "#8E24AA")).id,
    Comunicación: (await ensureLabel(project.id, "Comunicación", "#43A047")).id,
  };

  const roboticLabels = {
    Urgente: (await ensureLabel(roboticArm.id, "Urgente", "#E53935")).id,
    Hardware: (await ensureLabel(roboticArm.id, "Hardware", "#546E7A")).id,
    Firmware: (await ensureLabel(roboticArm.id, "Firmware", "#00897B")).id,
    Documentación: (await ensureLabel(roboticArm.id, "Documentación", "#6D4C41")).id,
  };

  const touristLabels = {
    Urgente: (await ensureLabel(touristRoute.id, "Urgente", "#E53935")).id,
    "Investigación de campo": (
      await ensureLabel(touristRoute.id, "Investigación de campo", "#00ACC1")
    ).id,
    Contenido: (await ensureLabel(touristRoute.id, "Contenido", "#F4511E")).id,
    Alianzas: (await ensureLabel(touristRoute.id, "Alianzas", "#3949AB")).id,
  };

  // --- Kanban activities ----------------------------------------------------

  console.log("Seeding Kanban activities for Recicla UDG...");
  await seedActivity(
    project.id,
    student.id,
    {
      title: "Diseñar mapa de puntos de acopio en el campus",
      description: "Levantar un mapa interactivo con las ubicaciones propuestas para contenedores de reciclaje.",
      dueDateOffsetDays: -20,
      completedOffsetDays: -18,
      status: ActivityStatus.DONE,
      priority: ActivityPriority.ALTA,
      position: 0,
      assigneeIds: [student.id, collaborator.id],
      labelNames: ["Diseño"],
      sections: [
        {
          name: "Investigación",
          items: [
            { text: "Visitar facultades para ubicar contenedores actuales", done: true, doneById: collaborator.id },
            { text: "Entrevistar a personal de intendencia", done: true, doneById: student.id },
          ],
        },
        {
          name: "Diseño",
          items: [{ text: "Bocetar mapa interactivo", done: true, doneById: student.id }],
        },
      ],
      comments: [
        { authorId: collaborator.id, text: "Ya tengo las ubicaciones de los 5 edificios principales." },
        { authorId: student.id, text: "Perfecto, lo integro al mapa esta semana." },
      ],
      events: [
        { from: null, to: ActivityStatus.IN_PROGRESS, actorId: student.id },
        { from: ActivityStatus.IN_PROGRESS, to: ActivityStatus.TO_VALIDATE, actorId: collaborator.id },
        { from: ActivityStatus.TO_VALIDATE, to: ActivityStatus.DONE, actorId: teacher.id },
      ],
    },
    reciclaLabels,
  );

  await seedActivity(
    project.id,
    student.id,
    {
      title: "Desarrollar formulario de registro de puntos de acopio",
      description: "Formulario web para que el personal del campus reporte el estado de cada contenedor.",
      dueDateOffsetDays: -15,
      completedOffsetDays: -12,
      status: ActivityStatus.DONE,
      priority: ActivityPriority.MEDIA,
      position: 1,
      assigneeIds: [collaborator.id],
      labelNames: ["Backend"],
      unsectionedItems: [
        { text: "Definir campos del formulario", done: true, doneById: collaborator.id },
        { text: "Conectar formulario a base de datos", done: true, doneById: collaborator.id },
      ],
      events: [
        { from: null, to: ActivityStatus.IN_PROGRESS, actorId: collaborator.id },
        { from: ActivityStatus.IN_PROGRESS, to: ActivityStatus.DONE, actorId: collaborator.id },
      ],
    },
    reciclaLabels,
  );

  await seedActivity(
    project.id,
    student.id,
    {
      title: "Implementar panel de administración de contenedores",
      description: "Panel para que el equipo dé de alta, edite y dé seguimiento al estado de los contenedores.",
      dueDateOffsetDays: 10,
      status: ActivityStatus.IN_PROGRESS,
      priority: ActivityPriority.ALTA,
      position: 0,
      assigneeIds: [collaborator.id, student.id],
      labelNames: ["Backend", "Urgente"],
      sections: [
        {
          name: "Backend",
          items: [
            { text: "Crear endpoints CRUD", done: true, doneById: collaborator.id },
            { text: "Agregar validaciones", done: false },
          ],
        },
        {
          name: "Frontend",
          items: [{ text: "Tabla de contenedores", done: false }],
        },
      ],
      comments: [
        { authorId: student.id, text: "¿Cómo va el endpoint de actualización de estado?" },
        { authorId: collaborator.id, text: "Lo termino hoy, falta solo la validación de duplicados." },
      ],
      events: [{ from: null, to: ActivityStatus.IN_PROGRESS, actorId: collaborator.id }],
    },
    reciclaLabels,
  );

  await seedActivity(
    project.id,
    student.id,
    {
      title: "Redactar guía de separación de residuos para la comunidad",
      description: "Material informativo para carteles y redes sociales sobre separación correcta de residuos.",
      dueDateOffsetDays: 3,
      status: ActivityStatus.TO_VALIDATE,
      priority: ActivityPriority.MEDIA,
      position: 0,
      assigneeIds: [student.id],
      labelNames: ["Comunicación"],
      unsectionedItems: [
        { text: "Redactar texto para carteles", done: true, doneById: student.id },
        { text: "Revisar con Fundación Verde", done: true, doneById: student.id },
      ],
      comments: [{ authorId: teacher.id, text: "Buen trabajo, reviso antes del viernes." }],
      events: [
        { from: null, to: ActivityStatus.IN_PROGRESS, actorId: student.id },
        { from: ActivityStatus.IN_PROGRESS, to: ActivityStatus.TO_VALIDATE, actorId: student.id },
      ],
    },
    reciclaLabels,
  );

  await seedActivity(
    project.id,
    student.id,
    {
      title: "Coordinar recolección piloto con Fundación Verde",
      description: "Primera recolección de prueba en los puntos de acopio ya instalados.",
      dueDateOffsetDays: -3,
      status: ActivityStatus.PENDING,
      priority: ActivityPriority.ALTA,
      position: 0,
      assigneeIds: [collaborator.id],
      labelNames: ["Urgente"],
    },
    reciclaLabels,
  );

  await seedActivity(
    project.id,
    student.id,
    {
      title: "Diseñar encuesta de percepción sobre el programa de reciclaje",
      description: "Encuesta corta para medir qué tan enterada está la comunidad universitaria del programa.",
      dueDateOffsetDays: 25,
      status: ActivityStatus.PENDING,
      priority: ActivityPriority.BAJA,
      position: 1,
      assigneeIds: [student.id],
    },
    reciclaLabels,
  );

  console.log("Seeding Kanban activities for brazo robótico asistivo...");
  await seedActivity(
    roboticArm.id,
    jorge.id,
    {
      title: "Diseñar esquema eléctrico del brazo",
      description: "Esquema de conexión de motores, sensores y controlador principal.",
      dueDateOffsetDays: -25,
      completedOffsetDays: -22,
      status: ActivityStatus.DONE,
      priority: ActivityPriority.ALTA,
      position: 0,
      assigneeIds: [jorge.id],
      labelNames: ["Hardware"],
      sections: [
        {
          name: "Electrónica",
          items: [
            { text: "Seleccionar servomotores", done: true, doneById: jorge.id },
            { text: "Definir diagrama de conexiones", done: true, doneById: jorge.id },
          ],
        },
      ],
      comments: [{ authorId: diego.id, text: "El esquema se ve sólido, ya pedí los componentes." }],
      events: [
        { from: null, to: ActivityStatus.IN_PROGRESS, actorId: jorge.id },
        { from: ActivityStatus.IN_PROGRESS, to: ActivityStatus.DONE, actorId: jorge.id },
      ],
    },
    roboticLabels,
  );

  await seedActivity(
    roboticArm.id,
    jorge.id,
    {
      title: "Programar firmware de control de motores",
      description: "Lógica de control de posición y velocidad de los servomotores de cada articulación.",
      dueDateOffsetDays: 8,
      status: ActivityStatus.IN_PROGRESS,
      priority: ActivityPriority.ALTA,
      position: 0,
      assigneeIds: [jorge.id, diego.id],
      labelNames: ["Firmware", "Urgente"],
      sections: [
        {
          name: "Firmware",
          items: [
            { text: "Configurar PWM", done: true, doneById: jorge.id },
            { text: "Calibrar sensores", done: false },
            { text: "Probar con motor de prueba", done: false },
          ],
        },
      ],
      comments: [
        { authorId: jorge.id, text: "Vamos a mitad del calibrado, el sensor de posición da ruido." },
        { authorId: diego.id, text: "Prueba con un filtro pasabajas, a mí me funcionó en otro proyecto." },
      ],
      events: [{ from: null, to: ActivityStatus.IN_PROGRESS, actorId: jorge.id }],
    },
    roboticLabels,
  );

  await seedActivity(
    roboticArm.id,
    jorge.id,
    {
      title: "Imprimir en 3D las piezas de la carcasa",
      description: "Impresión de la base y la pinza del brazo con PLA reforzado.",
      dueDateOffsetDays: 2,
      status: ActivityStatus.TO_VALIDATE,
      priority: ActivityPriority.MEDIA,
      position: 0,
      assigneeIds: [diego.id],
      labelNames: ["Hardware"],
      unsectionedItems: [
        { text: "Imprimir base", done: true, doneById: diego.id },
        { text: "Imprimir pinza", done: true, doneById: diego.id },
      ],
      comments: [{ authorId: valeria.id, text: "Reviso las piezas el lunes en el laboratorio." }],
      events: [
        { from: null, to: ActivityStatus.IN_PROGRESS, actorId: diego.id },
        { from: ActivityStatus.IN_PROGRESS, to: ActivityStatus.TO_VALIDATE, actorId: diego.id },
      ],
    },
    roboticLabels,
  );

  await seedActivity(
    roboticArm.id,
    jorge.id,
    {
      title: "Documentar manual de ensamblaje",
      description: "Guía paso a paso para armar el prototipo a partir de las piezas impresas.",
      dueDateOffsetDays: 14,
      status: ActivityStatus.TO_VALIDATE,
      priority: ActivityPriority.BAJA,
      position: 1,
      assigneeIds: [jorge.id],
      labelNames: ["Documentación"],
      events: [
        { from: null, to: ActivityStatus.IN_PROGRESS, actorId: jorge.id },
        { from: ActivityStatus.IN_PROGRESS, to: ActivityStatus.TO_VALIDATE, actorId: jorge.id },
      ],
    },
    roboticLabels,
  );

  await seedActivity(
    roboticArm.id,
    jorge.id,
    {
      title: "Investigar sensores de fuerza para la pinza",
      description: "Comparar sensores de bajo costo para dar retroalimentación de presión al usuario.",
      dueDateOffsetDays: -2,
      status: ActivityStatus.PENDING,
      priority: ActivityPriority.MEDIA,
      position: 0,
      assigneeIds: [diego.id],
    },
    roboticLabels,
  );

  await seedActivity(
    roboticArm.id,
    jorge.id,
    {
      title: "Planear pruebas con usuarios con discapacidad motriz",
      description: "Diseñar protocolo de pruebas seguras del prototipo con usuarios reales.",
      dueDateOffsetDays: 30,
      status: ActivityStatus.PENDING,
      priority: ActivityPriority.ALTA,
      position: 1,
      assigneeIds: [],
      labelNames: ["Urgente"],
    },
    roboticLabels,
  );

  console.log("Seeding Kanban activities for ruta turística sustentable...");
  await seedActivity(
    touristRoute.id,
    sofia.id,
    {
      title: "Mapear atractivos naturales de la bahía",
      description: "Identificar y georreferenciar los puntos de interés natural para la ruta.",
      dueDateOffsetDays: -18,
      completedOffsetDays: -15,
      status: ActivityStatus.DONE,
      priority: ActivityPriority.MEDIA,
      position: 0,
      assigneeIds: [sofia.id, renata.id],
      labelNames: ["Investigación de campo"],
      sections: [
        {
          name: "Campo",
          items: [
            { text: "Visitar El Mogote", done: true, doneById: sofia.id },
            { text: "Visitar Balandra", done: true, doneById: renata.id },
          ],
        },
      ],
      comments: [{ authorId: renata.id, text: "Las fotos de Balandra quedaron increíbles para el folleto." }],
      events: [
        { from: null, to: ActivityStatus.IN_PROGRESS, actorId: sofia.id },
        { from: ActivityStatus.IN_PROGRESS, to: ActivityStatus.DONE, actorId: sofia.id },
      ],
    },
    touristLabels,
  );

  await seedActivity(
    touristRoute.id,
    sofia.id,
    {
      title: "Entrevistar a prestadores de servicios turísticos locales",
      description: "Recoger testimonios y recomendaciones de guías y cooperativas de la zona.",
      dueDateOffsetDays: 6,
      status: ActivityStatus.IN_PROGRESS,
      priority: ActivityPriority.MEDIA,
      position: 0,
      assigneeIds: [renata.id],
      labelNames: ["Investigación de campo"],
      unsectionedItems: [
        { text: "Entrevistar a 3 guías certificados", done: true, doneById: renata.id },
        { text: "Entrevistar a cooperativa de pescadores", done: false },
      ],
      events: [{ from: null, to: ActivityStatus.IN_PROGRESS, actorId: renata.id }],
    },
    touristLabels,
  );

  await seedActivity(
    touristRoute.id,
    sofia.id,
    {
      title: "Diseñar folleto bilingüe de la ruta",
      description: "Folleto en español e inglés con el mapa, horarios y recomendaciones de la ruta.",
      dueDateOffsetDays: 4,
      status: ActivityStatus.TO_VALIDATE,
      priority: ActivityPriority.ALTA,
      position: 0,
      assigneeIds: [sofia.id],
      labelNames: ["Contenido", "Urgente"],
      unsectionedItems: [
        { text: "Traducir textos al inglés", done: true, doneById: sofia.id },
        { text: "Maquetar folleto final", done: true, doneById: sofia.id },
      ],
      comments: [{ authorId: teacher.id, text: "Se ve muy profesional, solo ajusten el logo de la universidad." }],
      events: [
        { from: null, to: ActivityStatus.IN_PROGRESS, actorId: sofia.id },
        { from: ActivityStatus.IN_PROGRESS, to: ActivityStatus.TO_VALIDATE, actorId: sofia.id },
      ],
    },
    touristLabels,
  );

  await seedActivity(
    touristRoute.id,
    sofia.id,
    {
      title: "Gestionar alianza con cooperativa de pescadores de El Mogote",
      description: "Acordar condiciones para incluir recorridos en lancha dentro de la ruta.",
      dueDateOffsetDays: 9,
      status: ActivityStatus.PENDING,
      priority: ActivityPriority.ALTA,
      position: 0,
      assigneeIds: [sofia.id],
      labelNames: ["Alianzas", "Urgente"],
    },
    touristLabels,
  );

  await seedActivity(
    touristRoute.id,
    sofia.id,
    {
      title: "Redactar protocolo de turismo responsable",
      description: "Lineamientos para visitantes sobre manejo de residuos y respeto a la fauna local.",
      dueDateOffsetDays: 20,
      status: ActivityStatus.PENDING,
      priority: ActivityPriority.BAJA,
      position: 1,
      assigneeIds: [],
    },
    touristLabels,
  );

  console.log("Seeding Kanban activities for vivienda modular de bajo costo...");
  await seedActivity(
    modularHousing.id,
    mariana.id,
    {
      title: "Investigar materiales locales de bajo costo",
      description: "Comparar materiales de construcción disponibles en la región por costo y disponibilidad.",
      dueDateOffsetDays: 12,
      status: ActivityStatus.IN_PROGRESS,
      priority: ActivityPriority.MEDIA,
      position: 0,
      assigneeIds: [mariana.id],
      events: [{ from: null, to: ActivityStatus.IN_PROGRESS, actorId: mariana.id }],
    },
    {},
  );

  await seedActivity(
    modularHousing.id,
    mariana.id,
    {
      title: "Elaborar presupuesto preliminar",
      description: "Costeo inicial del modelo de vivienda con los materiales seleccionados.",
      dueDateOffsetDays: 18,
      status: ActivityStatus.PENDING,
      priority: ActivityPriority.MEDIA,
      position: 0,
      assigneeIds: [jorge.id],
    },
    {},
  );

  console.log("Seeding Kanban activities for app de menús saludables...");
  await seedActivity(
    healthyMenuApp.id,
    diego.id,
    {
      title: "Diseñar wireframes de la app",
      description: "Primeras pantallas de búsqueda de menús y detalle nutricional.",
      dueDateOffsetDays: -10,
      completedOffsetDays: -8,
      status: ActivityStatus.DONE,
      priority: ActivityPriority.MEDIA,
      position: 0,
      assigneeIds: [diego.id],
      events: [
        { from: null, to: ActivityStatus.IN_PROGRESS, actorId: diego.id },
        { from: ActivityStatus.IN_PROGRESS, to: ActivityStatus.DONE, actorId: diego.id },
      ],
    },
    {},
  );

  await seedActivity(
    healthyMenuApp.id,
    diego.id,
    {
      title: "Definir base de datos nutricional",
      description: "Estructurar la información nutricional de los platillos de la cafetería piloto.",
      dueDateOffsetDays: 15,
      status: ActivityStatus.PENDING,
      priority: ActivityPriority.ALTA,
      position: 0,
      assigneeIds: [collaborator.id],
    },
    {},
  );

  // --- General progress updates ("Avances generales") ---------------------

  console.log("Seeding general progress updates not tied to a specific activity...");
  await ensureProgressUpdate(
    project.id,
    student.id,
    "Esta semana cerramos el diseño del mapa de puntos de acopio y arrancamos la implementación del panel de administración. El equipo de Fundación Verde ya revisó la primera propuesta de contenedores y nos dio luz verde para dos ubicaciones adicionales.",
    { postedToFeed: true, validated: true },
  );
  await ensureProgressUpdate(
    project.id,
    teacher.id,
    "Felicito al equipo por el avance constante; sugiero documentar el proceso de la recolección piloto para el reporte final.",
    { postedToFeed: true, validated: false },
  );
  await ensureProgressUpdate(
    roboticArm.id,
    jorge.id,
    "Terminamos la impresión 3D de las piezas principales y comenzamos las pruebas de calibración del firmware. La próxima semana esperamos tener el primer prototipo funcional completo.",
    { postedToFeed: true, validated: false },
  );
  await ensureProgressUpdate(
    touristRoute.id,
    sofia.id,
    "Concluimos el mapeo de los atractivos naturales de la bahía y empezamos las entrevistas con prestadores de servicios turísticos. El folleto bilingüe va en buen camino.",
    { postedToFeed: true, validated: true },
  );

  // --- Challenges and dictámenes --------------------------------------------

  console.log("Seeding a sample challenge...");
  const existingChallenge = await prisma.challenge.findFirst({
    where: { title: "Reducción de residuos sólidos en instituciones educativas" },
  });
  const challenge =
    existingChallenge ??
    (await prisma.challenge.create({
      data: {
        title: "Reducción de residuos sólidos en instituciones educativas",
        description:
          "Buscamos propuestas estudiantiles para disminuir la generación de residuos no separados dentro de campus universitarios de Baja California Sur.",
        deadline: daysFromNow(60),
        organizationId: organization.id,
      },
    }));
  if (!existingChallenge) {
    await prisma.challengeSdg.createMany({
      data: [
        { challengeId: challenge.id, sdgId: 11 },
        { challengeId: challenge.id, sdgId: 12 },
      ],
      skipDuplicates: true,
    });
  }

  console.log("Seeding sample dictámenes...");
  await ensureDictamen(
    project.id,
    teacher.id,
    DictamenVerdict.APPROVED,
    "El proyecto muestra avances sólidos y una propuesta de valor clara para el campus. Aprobado para continuar a la fase de implementación.",
  );
  await ensureDictamen(
    roboticArm.id,
    valeria.id,
    DictamenVerdict.CHANGES_REQUESTED,
    "Buen avance técnico, pero falta documentar el protocolo de pruebas con usuarios antes de pasar a validación final.",
  );

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
