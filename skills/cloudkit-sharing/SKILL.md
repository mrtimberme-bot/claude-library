---
name: cloudkit-sharing
description: Use when implementing collaborative or shared CloudKit records — CKShare, CKShareParticipant, zone-based sharing, or any hand-rolled CloudKit (CKRecord-level) sync without an ORM like SwiftData/Core Data.
---

# CloudKit Sharing

## Overview

Raw CloudKit programming model for apps that need collaborative, shared records — `CKShare`-based sharing, custom zones, and manual conflict/change-token handling — without going through an ORM's sync layer. For apps that already use SwiftData's CloudKit integration (`.modelContainer(for:, cloudKitDatabase:)`), see the `swiftdata-cloudkit` skill instead; it hides `CKRecord` entirely and isn't a fit once you need per-record sharing controls, custom zones, or subscription-driven push sync. This skill is for direct `CKContainer` / `CKDatabase` / `CKRecord` / `CKShare` usage.

Core principle: sharing works at the **record zone** level, not the individual record. A shared hierarchy needs a root record in a **custom zone** in the owner's **private database**; invited participants access that same data through the **shared database** — never the owner's private database.

## Quick reference

| Need | API / pattern |
|---|---|
| App's CloudKit entry point | `CKContainer(identifier:)` / `CKContainer.default()` |
| Databases | `container.privateCloudDatabase`, `.publicCloudDatabase`, `.sharedCloudDatabase` |
| Custom zone for shareable data | `CKRecordZone(zoneName:)` saved via `CKModifyRecordZonesOperation` (the default zone cannot be shared) |
| Share a record hierarchy | `CKShare(rootRecord:)` saved together with the root record in one `CKModifyRecordsOperation` |
| Invite a participant | `CKUserIdentityLookupInfo` → `CKFetchShareParticipantsOperation` → `share.addParticipant` |
| Present system share UI | `UICloudSharingController` (UIKit) or a share-sheet wrapper |
| Discover records shared with me | `fetchAllRecordZones(in: .shared)`, then `CKFetchRecordZoneChangesOperation` on the shared DB |
| Permission levels | `CKShare.ParticipantPermission` (`.readOnly` / `.readWrite`) |
| Find a record's share | `record.share` reference → fetch the `CKShare` by that `CKRecord.ID` |
| Incremental sync | `CKFetchDatabaseChangesOperation` (zone-level) + `CKFetchRecordZoneChangesOperation` (record-level), persisting a `CKServerChangeToken` per zone |
| Server vs. local conflict | Catch `CKError.serverRecordChanged`, read `ckError.serverRecord`, merge local field changes into it, resave that instance |
| Push-driven sync | `CKSubscription` (`CKRecordZoneSubscription` / `CKQuerySubscription`) with silent push → re-run the change-token fetch; never trust the push payload as data |
| Batch save errors | `CKError.partialFailure` → inspect `partialErrorsByItemID`, retry only the failed record IDs |
| Schema changes after Production deploy | Additive only — see Common mistakes |

## Example: sharing a record and inviting a participant

```swift
import CloudKit

func shareNote(_ note: CKRecord, database: CKDatabase) async throws -> CKShare {
    // Root record + share must be created/saved together, in the record's own custom zone.
    let share = CKShare(rootRecord: note)
    share[CKShare.SystemFieldKey.title] = "Shared Note" as CKRecordValue
    share.publicPermission = .none // invite-only; use .readOnly/.readWrite for link-based sharing

    let op = CKModifyRecordsOperation(recordsToSave: [note, share], recordIDsToDelete: nil)
    op.savePolicy = .ifServerRecordUnchanged

    return try await withCheckedThrowingContinuation { continuation in
        op.modifyRecordsResultBlock = { result in
            switch result {
            case .success: continuation.resume(returning: share)
            case .failure(let error): continuation.resume(throwing: error)
            }
        }
        database.add(op)
    }
}

func inviteParticipant(email: String, permission: CKShare.ParticipantPermission,
                        to share: CKShare, container: CKContainer) async throws {
    let lookupInfo = CKUserIdentityLookupInfo(emailAddress: email)
    let op = CKFetchShareParticipantsOperation(userIdentityLookupInfos: [lookupInfo])

    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
        var participant: CKShare.Participant?
        op.perShareParticipantResultBlock = { _, result in
            if case .success(let found) = result { participant = found }
        }
        op.fetchShareParticipantsResultBlock = { result in
            switch result {
            case .success:
                if let participant {
                    participant.permission = permission
                    share.addParticipant(participant)
                }
                continuation.resume()
            case .failure(let error):
                continuation.resume(throwing: error)
            }
        }
        container.add(op)
    }

    try await container.privateCloudDatabase.save(share)
}
```

## Common mistakes

- **Root record vs. shared record zone confusion**: a `CKShare` must live in the *same* zone as its root record, and that zone must be a **custom zone** — the default zone can't be shared. Participants see the data under `CKContainer.sharedCloudDatabase` using the same zone ID but the *owner's* `CKRecordZone.ID.ownerName`; fetch it via `fetchAllRecordZones(in: .shared)` rather than assuming it shows up in your own private zone list.
- **Ignoring `CKError.partialFailure` on batch saves**: `CKModifyRecordsOperation` can partially succeed. Inspect `partialErrorsByItemID` and retry/resolve only the records that actually failed — treating the whole batch as fully failed (or fully succeeded) silently corrupts state for the records that didn't match.
- **Not handling "Production schema is immutable"**: once a record type or field ships to the Production CloudKit environment, you can add new fields/indexes but cannot delete or retype existing ones. Design additive, nullable fields from the start, and validate schema changes in the Development environment before deploying them.
- **Treating push payloads as data**: a `CKSubscription` silent-push notification only signals *that* something changed — it doesn't reliably carry the changed record. Always re-run `CKFetchDatabaseChangesOperation` / `CKFetchRecordZoneChangesOperation` against the persisted `CKServerChangeToken`; don't parse the notification payload as the record.
- **Resaving a stale copy after `serverRecordChanged`**: don't discard the conflict and blindly overwrite. Take `ckError.serverRecord` (which carries the current `recordChangeTag`), apply your local field changes onto it, then save that instance.
- **Confusing public/private/shared databases**: the public database has no per-user ownership, so `CKShare` doesn't apply to it — collaboration only works on private-database records via sharing, or on public records with explicit custom permissions.
