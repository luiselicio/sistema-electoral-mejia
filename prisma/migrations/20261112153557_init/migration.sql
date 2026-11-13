-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'CAMPAIGN_ADMIN', 'ANALYST', 'ENUMERATOR');

-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SurveyChannel" AS ENUM ('PUBLIC', 'ENUMERATOR', 'BOTH');

-- CreateEnum
CREATE TYPE "SubmissionChannel" AS ENUM ('PUBLIC', 'ENUMERATOR');

-- CreateEnum
CREATE TYPE "SubmissionQuality" AS ENUM ('VALID', 'OBSERVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('ACTIVE', 'USED', 'REVOKED');

-- CreateEnum
CREATE TYPE "FigureCondition" AS ENUM ('FIGURE', 'POTENTIAL_PRE_CANDIDATE', 'OFFICIALLY_REGISTERED_CANDIDATE', 'OTHER');

-- CreateTable
CREATE TABLE "Province" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Province_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Canton" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provinceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Canton_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parish" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cantonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "source" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "parishId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "cantonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoliticalOrganization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoliticalOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoliticalFigure" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "organizationId" TEXT,
    "cantonId" TEXT,
    "condition" "FigureCondition" NOT NULL DEFAULT 'FIGURE',
    "verifiedSource" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoliticalFigure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "SurveyStatus" NOT NULL DEFAULT 'DRAFT',
    "channel" "SurveyChannel" NOT NULL DEFAULT 'BOTH',
    "privacyVersion" TEXT,
    "methodologyNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyVersion" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "surveyVersionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "surveyVersionId" TEXT NOT NULL,
    "sectionId" TEXT,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isSpecial" BOOLEAN NOT NULL DEFAULT false,
    "figureId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogicRule" (
    "id" TEXT NOT NULL,
    "sourceQuestionId" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" JSONB,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogicRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantIdentity" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "identityHash" TEXT NOT NULL,
    "localFormatValid" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participation" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "participantIdentityId" TEXT NOT NULL,
    "status" "ParticipationStatus" NOT NULL DEFAULT 'ACTIVE',
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveySubmission" (
    "id" TEXT NOT NULL,
    "participationId" TEXT NOT NULL,
    "surveyVersionId" TEXT NOT NULL,
    "channel" "SubmissionChannel" NOT NULL,
    "enumeratorId" TEXT,
    "sectorId" TEXT,
    "quality" "SubmissionQuality" NOT NULL DEFAULT 'VALID',
    "qualityNotes" TEXT,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyContent" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacyContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Province_code_key" ON "Province"("code");

-- CreateIndex
CREATE INDEX "Canton_provinceId_idx" ON "Canton"("provinceId");

-- CreateIndex
CREATE INDEX "Parish_cantonId_idx" ON "Parish"("cantonId");

-- CreateIndex
CREATE INDEX "Sector_parishId_idx" ON "Sector"("parishId");

-- CreateIndex
CREATE INDEX "Campaign_cantonId_idx" ON "Campaign"("cantonId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "CampaignAssignment_campaignId_idx" ON "CampaignAssignment"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignAssignment_userId_campaignId_key" ON "CampaignAssignment"("userId", "campaignId");

-- CreateIndex
CREATE INDEX "PoliticalFigure_organizationId_idx" ON "PoliticalFigure"("organizationId");

-- CreateIndex
CREATE INDEX "PoliticalFigure_cantonId_idx" ON "PoliticalFigure"("cantonId");

-- CreateIndex
CREATE INDEX "Survey_campaignId_idx" ON "Survey"("campaignId");

-- CreateIndex
CREATE INDEX "SurveyVersion_surveyId_idx" ON "SurveyVersion"("surveyId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyVersion_surveyId_version_key" ON "SurveyVersion"("surveyId", "version");

-- CreateIndex
CREATE INDEX "Section_surveyVersionId_idx" ON "Section"("surveyVersionId");

-- CreateIndex
CREATE INDEX "Question_surveyVersionId_idx" ON "Question"("surveyVersionId");

-- CreateIndex
CREATE INDEX "Question_sectionId_idx" ON "Question"("sectionId");

-- CreateIndex
CREATE INDEX "QuestionOption_questionId_idx" ON "QuestionOption"("questionId");

-- CreateIndex
CREATE INDEX "LogicRule_sourceQuestionId_idx" ON "LogicRule"("sourceQuestionId");

-- CreateIndex
CREATE INDEX "ParticipantIdentity_surveyId_idx" ON "ParticipantIdentity"("surveyId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantIdentity_surveyId_identityHash_key" ON "ParticipantIdentity"("surveyId", "identityHash");

-- CreateIndex
CREATE UNIQUE INDEX "Participation_participantIdentityId_key" ON "Participation"("participantIdentityId");

-- CreateIndex
CREATE INDEX "Participation_surveyId_idx" ON "Participation"("surveyId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveySubmission_participationId_key" ON "SurveySubmission"("participationId");

-- CreateIndex
CREATE INDEX "SurveySubmission_surveyVersionId_idx" ON "SurveySubmission"("surveyVersionId");

-- CreateIndex
CREATE INDEX "SurveySubmission_enumeratorId_idx" ON "SurveySubmission"("enumeratorId");

-- CreateIndex
CREATE INDEX "SurveySubmission_sectorId_idx" ON "SurveySubmission"("sectorId");

-- CreateIndex
CREATE INDEX "Answer_submissionId_idx" ON "Answer"("submissionId");

-- CreateIndex
CREATE INDEX "Answer_questionId_idx" ON "Answer"("questionId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyContent_key_version_key" ON "PrivacyContent"("key", "version");

-- AddForeignKey
ALTER TABLE "Canton" ADD CONSTRAINT "Canton_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parish" ADD CONSTRAINT "Parish_cantonId_fkey" FOREIGN KEY ("cantonId") REFERENCES "Canton"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sector" ADD CONSTRAINT "Sector_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_cantonId_fkey" FOREIGN KEY ("cantonId") REFERENCES "Canton"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAssignment" ADD CONSTRAINT "CampaignAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAssignment" ADD CONSTRAINT "CampaignAssignment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoliticalFigure" ADD CONSTRAINT "PoliticalFigure_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PoliticalOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoliticalFigure" ADD CONSTRAINT "PoliticalFigure_cantonId_fkey" FOREIGN KEY ("cantonId") REFERENCES "Canton"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyVersion" ADD CONSTRAINT "SurveyVersion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_surveyVersionId_fkey" FOREIGN KEY ("surveyVersionId") REFERENCES "SurveyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_surveyVersionId_fkey" FOREIGN KEY ("surveyVersionId") REFERENCES "SurveyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_figureId_fkey" FOREIGN KEY ("figureId") REFERENCES "PoliticalFigure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogicRule" ADD CONSTRAINT "LogicRule_sourceQuestionId_fkey" FOREIGN KEY ("sourceQuestionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantIdentity" ADD CONSTRAINT "ParticipantIdentity_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_participantIdentityId_fkey" FOREIGN KEY ("participantIdentityId") REFERENCES "ParticipantIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySubmission" ADD CONSTRAINT "SurveySubmission_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "Participation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySubmission" ADD CONSTRAINT "SurveySubmission_surveyVersionId_fkey" FOREIGN KEY ("surveyVersionId") REFERENCES "SurveyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySubmission" ADD CONSTRAINT "SurveySubmission_enumeratorId_fkey" FOREIGN KEY ("enumeratorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySubmission" ADD CONSTRAINT "SurveySubmission_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "SurveySubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
