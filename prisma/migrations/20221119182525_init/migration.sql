-- CreateTable
CREATE TABLE "Reference" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "lineItemId" INTEGER,
    CONSTRAINT "Reference_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "LineItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LineItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sheetId" INTEGER NOT NULL,
    "acceptanceCriteria" TEXT NOT NULL,
    CONSTRAINT "LineItem_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "Sheet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sheet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "description" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "signedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signerId" INTEGER NOT NULL,
    "lineItemId" INTEGER NOT NULL,
    "qualificationId" INTEGER NOT NULL,
    CONSTRAINT "Signature_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Signature_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "LineItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Signature_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Qualification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "qualifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "Qualification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT
);

-- CreateTable
CREATE TABLE "_SheetToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_SheetToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Sheet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_SheetToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_QualificationToSheet" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_QualificationToSheet_A_fkey" FOREIGN KEY ("A") REFERENCES "Qualification" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_QualificationToSheet_B_fkey" FOREIGN KEY ("B") REFERENCES "Sheet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_SheetToUser_AB_unique" ON "_SheetToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_SheetToUser_B_index" ON "_SheetToUser"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_QualificationToSheet_AB_unique" ON "_QualificationToSheet"("A", "B");

-- CreateIndex
CREATE INDEX "_QualificationToSheet_B_index" ON "_QualificationToSheet"("B");
