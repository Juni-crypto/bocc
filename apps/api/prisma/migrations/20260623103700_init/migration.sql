-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'LIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('WEDDING', 'BIRTHDAY', 'CORPORATE', 'SPORTS', 'CONCERT', 'TRAVEL', 'OTHER');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- CreateEnum
CREATE TYPE "UploadWindow" AS ENUM ('DURING_EVENT', 'DAYS_AFTER', 'ALWAYS');

-- CreateEnum
CREATE TYPE "DownloadPolicy" AS ENUM ('EVERYONE', 'HOST_ONLY', 'DISABLED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('HOST', 'GUEST');

-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EventType" NOT NULL DEFAULT 'OTHER',
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "coverUrl" TEXT,
    "venue" TEXT,
    "startsAt" TIMESTAMP(3),
    "slug" TEXT NOT NULL,
    "joinCode" TEXT,
    "immichAlbumId" TEXT,
    "perGuestCap" INTEGER NOT NULL DEFAULT 15,
    "totalCap" INTEGER,
    "allowVideo" BOOLEAN NOT NULL DEFAULT true,
    "maxVideoSec" INTEGER NOT NULL DEFAULT 30,
    "liveCaptureOnly" BOOLEAN NOT NULL DEFAULT false,
    "uploadWindow" "UploadWindow" NOT NULL DEFAULT 'DAYS_AFTER',
    "uploadDaysAfter" INTEGER NOT NULL DEFAULT 7,
    "geoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "geofenceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "geofenceLat" DOUBLE PRECISION,
    "geofenceLng" DOUBLE PRECISION,
    "geofenceRadiusM" INTEGER NOT NULL DEFAULT 250,
    "mapView" BOOLEAN NOT NULL DEFAULT false,
    "faceMatching" BOOLEAN NOT NULL DEFAULT true,
    "autoHighlights" BOOLEAN NOT NULL DEFAULT true,
    "semanticSearch" BOOLEAN NOT NULL DEFAULT true,
    "autoModeration" BOOLEAN NOT NULL DEFAULT true,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "requireName" BOOLEAN NOT NULL DEFAULT true,
    "requireSelfie" BOOLEAN NOT NULL DEFAULT false,
    "hostApproval" BOOLEAN NOT NULL DEFAULT false,
    "uploadToUnlock" BOOLEAN NOT NULL DEFAULT false,
    "downloadPolicy" "DownloadPolicy" NOT NULL DEFAULT 'EVERYONE',
    "watermark" BOOLEAN NOT NULL DEFAULT false,
    "moderationQueue" BOOLEAN NOT NULL DEFAULT false,
    "expiryDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'GUEST',
    "consentFaceMatch" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "immichPersonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT,
    "immichAssetId" TEXT NOT NULL,
    "status" "PhotoStatus" NOT NULL DEFAULT 'APPROVED',
    "isVideo" BOOLEAN NOT NULL DEFAULT false,
    "takenAt" TIMESTAMP(3),
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Member_eventId_idx" ON "Member"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Photo_immichAssetId_key" ON "Photo"("immichAssetId");

-- CreateIndex
CREATE INDEX "Photo_eventId_status_idx" ON "Photo"("eventId", "status");

-- CreateIndex
CREATE INDEX "Photo_memberId_idx" ON "Photo"("memberId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
