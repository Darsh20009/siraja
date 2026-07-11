---
name: Siraja Phase 8 Operational Engine
description: Architecture decisions, field name corrections, and patterns for Attendance, Exams, Assignments, Assessments, and Reporting modules.
---

# Phase 8 — Attendance, Exams, Assignments, Assessments & Reporting

## Module graph
- `AttendanceModule` → owns `attendance` collection; exports `ATTENDANCE_REPOSITORY`
- `ExamsModule` → owns `exams` collection; exports `EXAM_REPOSITORY`
- `AssignmentsModule` → owns `assignments` collection (educational tasks, NOT student-circle assignments from Phase 6); exports `ASSIGNMENT_REPOSITORY`
- `AssessmentsModule` → owns `assessments` collection; exports `ASSESSMENT_REPOSITORY`
- `ReportingModule` → imports all four above + MemorizationModule; read-only aggregation, no own collection

## Critical interface field names (must match exactly)
- `ParentRecord.studentIds` — NOT `childIds`
- `SupervisorRecord.supervisedGroupIds` — NOT `groupIds`
- `SheikhRecord.groupIds` — correct
- `StudentRecord.groupId` is `string | null | undefined` — always coerce with `?? undefined` before passing to a `string | undefined` field
- `StudentRepository.findAll()` returns `StudentRecord[]` (no pagination) — for circle reports use `findByCircle(tenantId, groupId)`

## Schema changes in Phase 8
- `attendance.schema.ts` — added `group` (ref Group), `sheikh` (ref User), `date` (explicit Date); `session` is now optional; `remarks` renamed to `notes`
- `exam.schema.ts` — added `category` (ExamCategory enum), `grade` (EvaluationGrade), `result` (ExamResult); existing `type` is format (oral/written/mixed)
- `assignment.schema.ts` — added `type` (AssignmentType), `submissionNotes`
- `assessment.schema.ts` — NEW collection for periodic evaluations (weekly/monthly/custom)

## New enums (exam-assignment.enum.ts)
- `ExamCategory`: MEMORIZATION, REVISION, COMPLETION
- `ExamResult`: PASS, FAIL, PENDING
- `AssignmentType`: HOMEWORK, REVISION_TASK, MEMORIZATION_TASK
- `AssessmentType`: WEEKLY, MONTHLY, CUSTOM
- `AssessmentStatus`: DRAFT, PUBLISHED, ARCHIVED

## RBAC mapping
- Attendance CREATE/UPDATE → ATTENDANCE.CREATE/UPDATE (sheikh scoped to own circles)
- Exams CREATE → EXAMS.CREATE; grade → EXAMS.APPROVE
- Assignments CREATE → ASSIGNMENTS.CREATE; submit → ASSIGNMENTS.UPDATE; review → ASSIGNMENTS.APPROVE
- Assessments (all) → REPORTS.READ (assessments are part of reporting layer)
- Reports (all) → REPORTS.READ (role-scoped in each use-case)

## markOverdue gap
`AssignmentRepository.markOverdue()` is implemented but not scheduled. No cron job calls it yet — assignments past due date stay ASSIGNED until a Task #2 addresses this.

**Why:** keeping the scheduled job out of Phase 8 scope to avoid introducing @nestjs/schedule as a dependency mid-phase.
