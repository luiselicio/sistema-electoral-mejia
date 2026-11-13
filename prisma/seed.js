const { PrismaClient, UserRole, SurveyStatus, SurveyChannel } = require("@prisma/client");
const { randomBytes, scryptSync } = require("crypto");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

async function main() {
  console.log("Seeding ELECTORAL DATA (datos de prueba ficticios)...");

  // Limpieza básica para re-ejecución en desarrollo (orden por dependencias)
  await prisma.answer.deleteMany();
  await prisma.surveySubmission.deleteMany();
  await prisma.participation.deleteMany();
  await prisma.participantIdentity.deleteMany();
  await prisma.logicRule.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.section.deleteMany();
  await prisma.surveyVersion.deleteMany();
  await prisma.survey.deleteMany();
  await prisma.campaignAssignment.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.politicalFigure.deleteMany();
  await prisma.politicalOrganization.deleteMany();
  await prisma.sector.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.canton.deleteMany();
  await prisma.province.deleteMany();
  await prisma.privacyContent.deleteMany();
  await prisma.user.deleteMany();

  // Territorio base: Pichincha / Mejía (datos de prueba; sectores ficticios, no oficiales)
  const pichincha = await prisma.province.create({
    data: { name: "Pichincha", code: "17", active: true },
  });

  const mejia = await prisma.canton.create({
    data: { name: "Mejía", provinceId: pichincha.id },
  });

  const parishNames = [
    "Machachi",
    "Alóag",
    "Aloasí",
    "Cutuglagua",
    "El Chaupi",
    "Manuel Cornejo Astorga",
    "Tambillo",
    "Uyumbicho",
  ];

  const parishes = [];
  for (const name of parishNames) {
    const parish = await prisma.parish.create({
      data: { name, cantonId: mejia.id },
    });
    parishes.push(parish);
  }

  // Sectores/barrios ficticios de ejemplo (no oficiales)
  for (const parish of parishes) {
    await prisma.sector.createMany({
      data: [
        { name: `Sector Centro (${parish.name})`, type: "sector", source: "manual", verified: false, parishId: parish.id },
        { name: `Barrio Norte (${parish.name})`, type: "barrio", source: "manual", verified: false, parishId: parish.id },
      ],
    });
  }

  // Usuarios de prueba por rol (contraseñas solo para desarrollo)
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "superadmin@electoral.local",
        name: "Super Admin (Prueba)",
        passwordHash: hashPassword("Admin123!"),
        role: UserRole.SUPERADMIN,
        active: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "admincampana@electoral.local",
        name: "Admin Campaña (Prueba)",
        passwordHash: hashPassword("Admin123!"),
        role: UserRole.CAMPAIGN_ADMIN,
        active: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "analista@electoral.local",
        name: "Analista (Prueba)",
        passwordHash: hashPassword("Admin123!"),
        role: UserRole.ANALYST,
        active: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "encuestador@electoral.local",
        name: "Encuestador (Prueba)",
        passwordHash: hashPassword("Admin123!"),
        role: UserRole.ENUMERATOR,
        active: true,
      },
    }),
  ]);

  // Organizaciones políticas y candidatos (catálogo referencial, cantón Mejía)
  const orgCD = await prisma.politicalOrganization.create({ data: { name: "Centro Democrático", shortName: "CD", description: "Lista 1" } });
  const orgUP = await prisma.politicalOrganization.create({ data: { name: "Unidad Popular", shortName: "UP", description: "Lista 2" } });
  const orgAvanza = await prisma.politicalOrganization.create({ data: { name: "Avanza", shortName: "AVANZA", description: "Lista 8" } });
  const orgADN = await prisma.politicalOrganization.create({ data: { name: "Acción Democrática Nacional", shortName: "ADN", description: "Lista 7" } });
  const orgPSE = await prisma.politicalOrganization.create({ data: { name: "Partido Socialista Ecuatoriano", shortName: "PSE", description: "Lista 17" } });
  const orgTODOS = await prisma.politicalOrganization.create({ data: { name: "TODOS", shortName: "TODOS", description: "Lista 70" } });
  const orgCREO = await prisma.politicalOrganization.create({ data: { name: "Movimiento CREO", shortName: "CREO", description: "Lista 21" } });
  const orgFenix = await prisma.politicalOrganization.create({ data: { name: "Acción Ciudadana Fénix", shortName: "FÉNIX", description: "Lista 110" } });
  const orgFuerzaMejiense = await prisma.politicalOrganization.create({ data: { name: "Fuerza Mejiense", shortName: "FM", description: "Lista 115" } });

  const figures = await Promise.all([
    prisma.politicalFigure.create({ data: { name: "Wilson Castillo", organizationId: orgCD.id, cantonId: mejia.id, condition: "FIGURE", verifiedSource: "Catálogo referencial: Centro Democrático - Lista 1", description: "Centro Democrático - Lista 1" } }),
    prisma.politicalFigure.create({ data: { name: "Tatiana Ruiz", organizationId: orgUP.id, cantonId: mejia.id, condition: "FIGURE", verifiedSource: "Catálogo referencial: Unidad Popular - Lista 2 / Avanza - Lista 8", description: "Unidad Popular - Lista 2 / Avanza - Lista 8" } }),
    prisma.politicalFigure.create({ data: { name: "María Fernanda Molina", organizationId: orgADN.id, cantonId: mejia.id, condition: "FIGURE", verifiedSource: "Catálogo referencial: ADN - Lista 7", description: "ADN - Lista 7" } }),
    prisma.politicalFigure.create({ data: { name: "Roberto Hidalgo", organizationId: orgPSE.id, cantonId: mejia.id, condition: "FIGURE", verifiedSource: "Catálogo referencial: Partido Socialista - Lista 17 / TODOS - Lista 70", description: "Partido Socialista - Lista 17 / TODOS - Lista 70" } }),
    prisma.politicalFigure.create({ data: { name: "Brayan Rossi", organizationId: orgCREO.id, cantonId: mejia.id, condition: "FIGURE", verifiedSource: "Catálogo referencial: CREO - Lista 21", description: "CREO - Lista 21" } }),
    prisma.politicalFigure.create({ data: { name: "Edwin Yánez", organizationId: orgFenix.id, cantonId: mejia.id, condition: "FIGURE", verifiedSource: "Catálogo referencial: Acción Ciudadana Fénix - Lista 110", description: "Acción Ciudadana Fénix - Lista 110" } }),
    prisma.politicalFigure.create({ data: { name: "Wilson Rodríguez", organizationId: orgFuerzaMejiense.id, cantonId: mejia.id, condition: "FIGURE", verifiedSource: "Catálogo referencial: Fuerza Mejiense - Lista 115", description: "Fuerza Mejiense - Lista 115" } }),
  ]);

  const campaign = await prisma.campaign.create({
    data: {
      name: "Campaña Piloto Mejía 2026",
      description: "Campaña piloto para el cantón Mejía.",
      status: "active",
      cantonId: mejia.id,
      assignments: {
        create: [
          { userId: users[1].id }, // admin campaña
          { userId: users[2].id }, // analista
          { userId: users[3].id }, // encuestador
        ],
      },
    },
  });

  await prisma.privacyContent.create({
    data: {
      key: "survey_notice",
      version: "v1",
      title: "Aviso de privacidad (borrador de prueba)",
      body:
        "Texto de prueba. La validación de cédula es local (formato y dígito verificador) y no acredita nacionalidad, identidad ni habilitación electoral. Las respuestas se tratan bajo modelo confidencial o seudonimizado.",
      active: true,
      effectiveAt: new Date(),
    },
  });

  const survey = await prisma.survey.create({
    data: {
      campaignId: campaign.id,
      title: "Encuesta de Opinión Ciudadana e Intención de Voto - Cantón Mejía",
      description: "Encuesta piloto (datos de prueba). No recopilar información real sin revisiones legales y operativas.",
      status: SurveyStatus.PUBLISHED,
      channel: SurveyChannel.BOTH,
      privacyVersion: "v1",
      methodologyNote:
        "Piloto. Validación local de cédula; control de duplicados por encuesta mediante derivado protegido. Modelo confidencial o seudonimizado.",
    },
  });

  const version = await prisma.surveyVersion.create({
    data: {
      surveyId: survey.id,
      version: 1,
      isPublished: true,
      publishedAt: new Date(),
    },
  });

  const sec1 = await prisma.section.create({ data: { surveyVersionId: version.id, title: "SECCIÓN 1. UBICACIÓN TERRITORIAL Y DEMOGRÁFICA", order: 1 } });
  const sec2 = await prisma.section.create({ data: { surveyVersionId: version.id, title: "SECCIÓN 2. PRINCIPALES PROBLEMÁTICAS DEL BARRIO O SECTOR", order: 2 } });
  const sec3 = await prisma.section.create({ data: { surveyVersionId: version.id, title: "SECCIÓN 3. PRIORIDADES PARA EL FUTURO DEL CANTÓN MEJÍA", order: 3 } });
  const sec4 = await prisma.section.create({ data: { surveyVersionId: version.id, title: "SECCIÓN 4. EVALUACIÓN DE CANDIDATOS E INTENCIÓN DE VOTO", order: 4 } });

  // Pregunta 1
  const q1 = await prisma.question.create({
    data: {
      surveyVersionId: version.id,
      sectionId: sec1.id,
      text: "Parroquia de residencia en el cantón Mejía",
      type: "single_choice",
      required: true,
      order: 1,
      options: {
        create: [
          "Machachi", "Alóag", "Aloasí", "Cutuglagua", "El Chaupi", "Manuel Cornejo Astorga", "Tambillo", "Uyumbicho"
        ].map((name, idx) => {
          const p = parishes.find((x) => x.name === name);
          return { label: name, value: p ? p.id : name, order: idx + 1 };
        }),
      },
    },
  });

  // Pregunta 2 (dinámica según parroquia; opciones de sectores se resuelven en el formulario)
  const q2 = await prisma.question.create({
    data: {
      surveyVersionId: version.id,
      sectionId: sec1.id,
      text: "Barrio, comunidad o sector específico de residencia",
      type: "single_choice",
      required: true,
      order: 2,
      config: { dynamic: "sector_by_parish", dependsOnQuestionOrder: 1 },
      options: { create: [] },
    },
  });

  // Pregunta 3
  const q3 = await prisma.question.create({
    data: {
      surveyVersionId: version.id,
      sectionId: sec2.id,
      text: "¿Cuál considera que es el principal problema de su barrio o comunidad?",
      type: "single_choice",
      required: true,
      order: 3,
      options: { create: [
        "Inseguridad y delincuencia","Falta de alumbrado público","Calles en mal estado","Falta de agua potable","Problemas de alcantarillado","Recolección de basura","Falta de transporte público","Falta de espacios deportivos y recreativos","Falta de mantenimiento de parques","Falta de atención a grupos vulnerables","Desempleo y falta de oportunidades","Problemas ambientales","Otro"
      ].map((label, idx) => ({ label, value: label, order: idx + 1, isSpecial: label === "Otro" })) },
    },
  });

  // Pregunta 4
  const q4 = await prisma.question.create({
    data: {
      surveyVersionId: version.id,
      sectionId: sec2.id,
      text: "¿Qué otros problemas afectan a su sector? (Seleccione hasta tres opciones)",
      type: "multiple_choice",
      required: true,
      order: 4,
      config: { maxSelections: 3 },
      options: { create: [
        "Inseguridad","Vialidad","Agua potable","Alcantarillado","Alumbrado público","Transporte","Limpieza y recolección de basura","Falta de espacios recreativos","Desempleo","Problemas ambientales","Otro"
      ].map((label, idx) => ({ label, value: label, order: idx + 1, isSpecial: label === "Otro" })) },
    },
  });

  // Pregunta 5
  const q5 = await prisma.question.create({
    data: {
      surveyVersionId: version.id,
      sectionId: sec2.id,
      text: "¿Cómo calificaría la atención que recibe su barrio por parte del Municipio de Mejía?",
      type: "single_choice",
      required: true,
      order: 5,
      options: { create: ["Muy buena","Buena","Regular","Mala","Muy mala","No sabe / No responde"].map((label, idx) => ({ label, value: label, order: idx + 1, isSpecial: label.includes("No sabe") })) },
    },
  });

  // Pregunta 6
  const q6 = await prisma.question.create({
    data: {
      surveyVersionId: version.id,
      sectionId: sec2.id,
      text: "¿Considera que las autoridades municipales han atendido las necesidades de su sector?",
      type: "single_choice",
      required: true,
      order: 6,
      options: { create: ["Sí, completamente","Sí, parcialmente","Muy poco","No han atendido nuestras necesidades","No sabe"].map((label, idx) => ({ label, value: label, order: idx + 1, isSpecial: label === "No sabe" })) },
    },
  });

  // Pregunta 7
  const q7 = await prisma.question.create({
    data: {
      surveyVersionId: version.id,
      sectionId: sec2.id,
      text: "¿Qué obra o proyecto considera más urgente para su barrio o comunidad?",
      type: "text",
      required: true,
      order: 7,
    },
  });

  // Pregunta 8
  const q8 = await prisma.question.create({
    data: {
      surveyVersionId: version.id,
      sectionId: sec3.id,
      text: "¿Cuál debería ser la principal prioridad del próximo alcalde o alcaldesa del cantón Mejía?",
      type: "single_choice",
      required: true,
      order: 8,
      options: { create: [
        "Seguridad ciudadana","Agua potable y alcantarillado","Mejoramiento de calles y carreteras","Generación de empleo","Apoyo a emprendedores y pequeños negocios","Turismo y desarrollo económico","Educación y capacitación","Salud y atención social","Transporte y movilidad","Protección del medio ambiente","Desarrollo rural, agrícola y ganadero","Atención a las parroquias rurales"
      ].map((label, idx) => ({ label, value: label, order: idx + 1 })) },
    },
  });

  // Pregunta 9
  const q9 = await prisma.question.create({
    data: {
      surveyVersionId: version.id,
      sectionId: sec3.id,
      text: "¿Qué debería hacer el próximo alcalde para mejorar la seguridad ciudadana?",
      type: "text",
      required: true,
      order: 9,
    },
  });

  // Pregunta 10
  const q10 = await prisma.question.create({
    data: {
      surveyVersionId: version.id,
      sectionId: sec3.id,
      text: "¿Qué sector considera que necesita mayor atención del Municipio?",
      type: "single_choice",
      required: true,
      order: 10,
      options: { create: ["Zona urbana de Machachi","Parroquias rurales","Comunidades y barrios periféricos","Sectores agrícolas y ganaderos","Todos por igual"].map((label, idx) => ({ label, value: label, order: idx + 1 })) },
    },
  });

  // Pregunta 11
  const q11 = await prisma.question.create({
    data: {
      surveyVersionId: version.id,
      sectionId: sec3.id,
      text: "¿Considera que el cantón Mejía ha progresado durante los últimos años?",
      type: "single_choice",
      required: true,
      order: 11,
      options: { create: ["Sí, mucho","Sí, algo","Poco","Nada","Ha empeorado","No sabe"].map((label, idx) => ({ label, value: label, order: idx + 1, isSpecial: label === "No sabe" })) },
    },
  });

  // Pregunta 12
  const q12 = await prisma.question.create({
    data: {
      surveyVersionId: version.id,
      sectionId: sec4.id,
      text: "¿Conoce a los candidatos que participarán en las próximas elecciones para la Alcaldía del cantón Mejía?",
      type: "single_choice",
      required: true,
      order: 12,
      options: { create: [
        "Sí, conozco a todos",
        "Conozco a algunos",
        "He escuchado sus nombres, pero no conozco sus propuestas",
        "No conozco a ninguno"
      ].map((label, idx) => ({ label, value: label, order: idx + 1 })) },
    },
  });

  // Pregunta 13
  const q13 = await prisma.question.create({
    data: {
      surveyVersionId: version.id,
      sectionId: sec4.id,
      text: "¿Por cuál de los siguientes candidatos votaría para la Alcaldía del cantón Mejía?",
      type: "single_choice",
      required: true,
      order: 13,
      options: {
        create: [
          { label: "Wilson Castillo — Centro Democrático (Lista 1)", value: `figure_${figures[0].id}`, order: 1, figureId: figures[0].id },
          { label: "Tatiana Ruiz — Unidad Popular (Lista 2) / Avanza (Lista 8)", value: `figure_${figures[1].id}`, order: 2, figureId: figures[1].id },
          { label: "María Fernanda Molina — ADN (Lista 7)", value: `figure_${figures[2].id}`, order: 3, figureId: figures[2].id },
          { label: "Roberto Hidalgo — Partido Socialista (Lista 17) / TODOS (Lista 70)", value: `figure_${figures[3].id}`, order: 4, figureId: figures[3].id },
          { label: "Brayan Rossi — CREO (Lista 21)", value: `figure_${figures[4].id}`, order: 5, figureId: figures[4].id },
          { label: "Edwin Yánez — Acción Ciudadana Fénix (Lista 110)", value: `figure_${figures[5].id}`, order: 6, figureId: figures[5].id },
          { label: "Wilson Rodríguez — Fuerza Mejiense (Lista 115)", value: `figure_${figures[6].id}`, order: 7, figureId: figures[6].id },
          { label: "Indeciso", value: "indeciso", order: 8, isSpecial: true },
          { label: "Voto blanco", value: "blanco", order: 9, isSpecial: true },
          { label: "Voto nulo", value: "nulo", order: 10, isSpecial: true },
          { label: "Ninguno", value: "ninguno", order: 11, isSpecial: true },
          { label: "Prefiero no responder", value: "prefiero_no_responder", order: 12, isSpecial: true },
        ],
      },
    },
  });

  console.log("Seed completado.");
  console.log({ 
    surveyId: survey.id, 
    surveyVersionId: version.id, 
    questionIds: { parroquia: q1.id, intencionVoto: q2.id, problema: q3.id },
    testUsers: {
      superadmin: "superadmin@electoral.local",
      campaign_admin: "admincampana@electoral.local",
      analyst: "analista@electoral.local",
      enumerator: "encuestador@electoral.local",
      password: "Admin123!",
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });