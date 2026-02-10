import type { Page } from "@playwright/test";

type StudentRegisterKycOptions = {
  minor?: boolean;
  schoolName?: string;
  level?: "primary" | "secondary" | "high" | "college" | "uni" | "other";
  mobile?: string;
};

export async function fillStudentRegisterKyc(page: Page, options: StudentRegisterKycOptions = {}) {
  const minor = Boolean(options.minor);
  await page.getByLabel("Mobile").fill(options.mobile ?? "+255700111222");
  await page.getByLabel("Country").fill("Tanzania");
  await page.getByLabel("Region").fill("Dar es Salaam");
  await page.getByLabel("Street").fill("Mtaa wa Uhuru 1");
  await page.getByLabel("Date of birth").fill(minor ? "2012-01-01" : "2008-01-01");
  await page.getByLabel("Gender (optional)").selectOption("prefer_not_to_say");
  await page.getByLabel("Level").selectOption(options.level ?? "secondary");

  const schoolName = page.getByLabel("School name");
  if ((await schoolName.count()) > 0 && (await schoolName.first().isVisible())) {
    await schoolName.fill(options.schoolName ?? "SomaSmart Community School");
  }

  const minorCheckbox = page.getByLabel("Student is a minor (parental controls)");
  if ((await minorCheckbox.count()) > 0) {
    if (minor) await minorCheckbox.check();
    else await minorCheckbox.uncheck();
  }

  if (minor) {
    await page.getByLabel("Guardian full name").fill("Guardian One");
    await page.getByLabel("Guardian mobile").fill("+255700111223");
  }
}

type SchoolUserKycOptions = {
  role: "student" | "teacher";
  minor?: boolean;
};

export async function fillSchoolUserKyc(page: Page, options: SchoolUserKycOptions) {
  const isStudent = options.role === "student";
  const minor = Boolean(options.minor);
  await page.getByLabel("Mobile").fill(isStudent ? "+255700444111" : "+255700444211");
  await page.getByLabel("Country").fill("Tanzania");
  await page.getByLabel("Region").fill("Dodoma");
  await page.getByLabel("Street").fill("Main Street 1");
  await page.getByLabel("Date of birth").fill(isStudent ? (minor ? "2012-01-01" : "2008-01-01") : "1990-01-01");
  await page.getByLabel("Gender (optional)").selectOption("prefer_not_to_say");
  if (isStudent) {
    await page.getByLabel("Level").selectOption("secondary");
    const minorCheckbox = page.getByLabel("Student is a minor");
    if ((await minorCheckbox.count()) > 0) {
      if (minor) await minorCheckbox.check();
      else await minorCheckbox.uncheck();
    }
    if (minor) {
      await page.getByLabel("Guardian full name").fill("School Guardian");
      await page.getByLabel("Guardian mobile").fill("+255700444112");
    }
  }
}
