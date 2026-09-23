import {
  PrismaClient,
  AccountType,
  ProjectStatus,
  ProjectVisibility,
  TeamRequestRole,
  TeamRequestStatus,
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

async function main() {
  console.log("Seeding SDG catalog (17 official goals)...");
  for (const sdg of SDGS) {
    await prisma.sdg.upsert({ where: { id: sdg.id }, update: sdg, create: sdg });
  }

  console.log("Seeding sample users...");
  const passwordHash = await bcrypt.hash("praxis123", 10);

  const student = await prisma.user.upsert({
    where: { email: "ana.martinez@alumnos.udg.mx" },
    update: {},
    create: {
      email: "ana.martinez@alumnos.udg.mx",
      passwordHash,
      name: "Ana Martínez",
      accountType: AccountType.STUDENT,
      skills: ["React", "Node.js", "Diseño UX"],
      interests: ["Educación", "Sostenibilidad"],
      verified: true,
      verifiedAt: new Date(),
    },
  });

  const collaborator = await prisma.user.upsert({
    where: { email: "luis.hernandez@alumnos.udg.mx" },
    update: {},
    create: {
      email: "luis.hernandez@alumnos.udg.mx",
      passwordHash,
      name: "Luis Hernández",
      accountType: AccountType.STUDENT,
      skills: ["Python", "Análisis de datos"],
      interests: ["ODS", "Impacto social"],
      verified: true,
      verifiedAt: new Date(),
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: "carlos.rios@udg.mx" },
    update: {},
    create: {
      email: "carlos.rios@udg.mx",
      passwordHash,
      name: "Carlos Ríos",
      accountType: AccountType.TEACHER,
      skills: ["Metodología ABP", "Gestión de proyectos"],
      interests: ["Innovación educativa"],
      verified: true,
      verifiedAt: new Date(),
    },
  });

  const organization = await prisma.user.upsert({
    where: { email: "contacto@fundacionverde.org" },
    update: {},
    create: {
      email: "contacto@fundacionverde.org",
      passwordHash,
      name: "Fundación Verde A.C.",
      accountType: AccountType.ORGANIZATION,
      skills: [],
      interests: ["Medio ambiente", "Reforestación"],
      verified: false,
    },
  });

  console.log("Seeding sample project...");
  const project = await prisma.project.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Recicla UDG",
      description: "Plataforma para coordinar puntos de acopio de reciclaje dentro del campus.",
      problemStatement: "El campus no tiene un sistema centralizado para gestionar el reciclaje de residuos.",
      objectives: "Reducir en 30% los residuos no separados durante el primer semestre de operación.",
      status: ProjectStatus.PUBLISHED,
      visibility: ProjectVisibility.PUBLIC,
      ownerId: student.id,
      teacherId: teacher.id,
      organizationId: organization.id,
    },
  });

  console.log("Linking project to SDGs 11 and 12...");
  await prisma.projectSdg.upsert({
    where: { projectId_sdgId: { projectId: project.id, sdgId: 11 } },
    update: {},
    create: { projectId: project.id, sdgId: 11 },
  });
  await prisma.projectSdg.upsert({
    where: { projectId_sdgId: { projectId: project.id, sdgId: 12 } },
    update: {},
    create: { projectId: project.id, sdgId: 12 },
  });

  console.log("Seeding a team request...");
  await prisma.teamRequest.upsert({
    where: { projectId_userId: { projectId: project.id, userId: collaborator.id } },
    update: {},
    create: {
      projectId: project.id,
      userId: collaborator.id,
      role: TeamRequestRole.COLLABORATOR,
      status: TeamRequestStatus.ACCEPTED,
      message: "Me interesa colaborar en la parte de datos.",
      resolvedAt: new Date(),
    },
  });

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
