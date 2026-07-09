# Schema Diagrams (ER)

Mermaid ER diagrams, grouped by domain area (33 collections in a single
diagram is unreadable). Cardinality notation: `||--||` 1:1, `||--o{` 1:many,
`}o--o{` many:many. Fields shown are the relationship-relevant ones only —
see each `*.schema.ts` file for the full field list.

## 1. Identity & Access

```mermaid
erDiagram
    TENANT ||--|| TENANT_SETTINGS : has
    TENANT ||--o{ USER : scopes
    TENANT ||--o{ ROLE : defines
    ROLE }o..o{ PERMISSION : "composed of (by key)"
    USER ||--o{ USER_PERMISSION : "granted/revoked"
    USER_PERMISSION }o..|| PERMISSION : "overrides (by key)"

    TENANT {
      string slug
      string type
      string status
    }
    USER {
      ObjectId tenantId
      string email
      string phone
      string role
      string status
    }
    ROLE {
      ObjectId tenantId
      string name
      string[] permissionKeys
    }
    PERMISSION {
      string key
      string module
    }
    USER_PERMISSION {
      ObjectId tenantId
      ObjectId user
      string permissionKey
      boolean isGranted
    }
```

## 2. People (role profiles)

```mermaid
erDiagram
    USER ||--|| STUDENT : "role=student"
    USER ||--|| PARENT : "role=parent"
    USER ||--|| SHEIKH : "role=sheikh"
    USER ||--|| SUPERVISOR : "role=supervisor"
    STUDENT }o--o{ PARENT : "guardianship"
    SHEIKH }o--o{ GROUP : teaches
    SUPERVISOR }o--o{ GROUP : oversees
    STUDENT }o--|| GROUP : "enrolled in"

    STUDENT {
      ObjectId tenantId
      ObjectId user
      ObjectId group
      ObjectId[] parents
      string currentMemorizationStatus
    }
    PARENT {
      ObjectId tenantId
      ObjectId user
      ObjectId[] students
    }
    SHEIKH {
      ObjectId tenantId
      ObjectId user
      ObjectId[] groups
    }
    SUPERVISOR {
      ObjectId tenantId
      ObjectId user
      ObjectId[] supervisedGroups
    }
```

## 3. Academic structure & attendance

```mermaid
erDiagram
    GROUP ||--o{ SESSION : schedules
    SESSION ||--o{ ATTENDANCE : records
    STUDENT ||--o{ ATTENDANCE : attends

    GROUP {
      ObjectId tenantId
      string name
      ObjectId sheikh
      ObjectId[] students
    }
    SESSION {
      ObjectId tenantId
      ObjectId group
      ObjectId sheikh
      string type
      string status
      date scheduledAt
    }
    ATTENDANCE {
      ObjectId tenantId
      ObjectId session
      ObjectId student
      string status
    }
```

## 4. Quran progress (memorization, review, mistakes, exams, assignments)

```mermaid
erDiagram
    STUDENT ||--o{ MEMORIZATION_RECORD : evaluated
    STUDENT ||--o{ REVIEW_RECORD : evaluated
    STUDENT ||--o{ EXAM : sits
    STUDENT ||--o{ ASSIGNMENT : assigned
    MEMORIZATION_RECORD ||--o{ QURAN_MISTAKE : logs
    REVIEW_RECORD ||--o{ QURAN_MISTAKE : logs
    SESSION ||--o{ MEMORIZATION_RECORD : "held during"
    SESSION ||--o{ REVIEW_RECORD : "held during"

    MEMORIZATION_RECORD {
      ObjectId tenantId
      ObjectId student
      ObjectId evaluatedBy
      QuranRange range
      string status
      string grade
    }
    REVIEW_RECORD {
      ObjectId tenantId
      ObjectId student
      ObjectId reviewedBy
      QuranRange range
      string retentionGrade
      date nextReviewDueAt
    }
    QURAN_MISTAKE {
      ObjectId tenantId
      ObjectId student
      ObjectId memorizationRecord
      ObjectId reviewRecord
      string type
      string severity
    }
    EXAM {
      ObjectId tenantId
      ObjectId student
      string type
      string status
      number score
    }
    ASSIGNMENT {
      ObjectId tenantId
      ObjectId student
      string status
      date dueAt
    }
```

## 5. Communication

```mermaid
erDiagram
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ PUSH_SUBSCRIPTION : registers
    USER ||--o{ SUPPORT_TICKET : opens
    SUPPORT_TICKET ||--o{ SUPPORT_MESSAGE : contains

    NOTIFICATION {
      ObjectId tenantId
      ObjectId recipient
      string type
      string channel
      boolean isRead
    }
    PUSH_SUBSCRIPTION {
      ObjectId tenantId
      ObjectId user
      string platform
      string token
    }
    SUPPORT_TICKET {
      ObjectId tenantId
      ObjectId openedBy
      ObjectId assignedTo
      string status
    }
    SUPPORT_MESSAGE {
      ObjectId tenantId
      ObjectId ticket
      string senderType
    }
```

## 6. Billing

```mermaid
erDiagram
    TENANT ||--|| SUBSCRIPTION : subscribes
    SUBSCRIPTION }o--|| PLAN : "on plan"
    SUBSCRIPTION ||--o{ PAYMENT : bills
    PAYMENT ||--o{ TRANSACTION : ledgers

    SUBSCRIPTION {
      ObjectId tenantId
      ObjectId plan
      string status
      date currentPeriodEnd
    }
    PLAN {
      string code
      number price
      string billingCycle
    }
    PAYMENT {
      ObjectId tenantId
      ObjectId subscription
      number amount
      string status
    }
    TRANSACTION {
      ObjectId tenantId
      ObjectId payment
      string type
      number amount
    }
```

## 7. Gamification & AI

```mermaid
erDiagram
    STUDENT ||--o{ ACHIEVEMENT : earns
    ACHIEVEMENT }o--|| BADGE : "instance of"
    USER ||--o{ AI_REQUEST : requests
    AI_REQUEST ||--|| AI_REPORT : produces
    STUDENT ||--o{ AI_REQUEST : "subject of"

    ACHIEVEMENT {
      ObjectId tenantId
      ObjectId student
      ObjectId badge
      date awardedAt
    }
    BADGE {
      string code
      string category
      string tier
    }
    AI_REQUEST {
      ObjectId tenantId
      ObjectId requestedBy
      ObjectId student
      string type
      string status
    }
    AI_REPORT {
      ObjectId tenantId
      ObjectId request
      string type
      object summary
    }
```

## 8. Platform observability (loosely coupled)

```mermaid
erDiagram
    TENANT ||--o{ AUDIT_LOG : "optional"
    TENANT ||--o{ ACTIVITY_LOG : "optional"
    USER ||--o{ AUDIT_LOG : acts
    USER ||--o{ ACTIVITY_LOG : acts

    AUDIT_LOG {
      ObjectId tenantId
      ObjectId actor
      string action
      string entityType
    }
    ACTIVITY_LOG {
      ObjectId tenantId
      ObjectId user
      string action
    }
    SYSTEM_SETTINGS {
      string key
      object value
    }
```
