# Partner API Contract

## Administration

| Method and path | Authorization |
|---|---|
| `GET/POST /api/v1/admin/partners` | Administrator |
| `GET/PATCH /api/v1/admin/partners/{partner_id}` | Administrator |
| `PUT /api/v1/admin/partners/{partner_id}/members/{user_id}` | Administrator |
| `DELETE /api/v1/admin/partners/{partner_id}/members/{user_id}` | Administrator |

Membership assignment accepts only `owner`, `manager`, or `staff`. Assignment also grants the
baseline `partner` role when missing. Removing a membership does not remove that global role because
the user may still belong to another organization; the role alone grants no organization access.
There is no public self-membership or administrator provisioning endpoint.

## Partner scope

| Method and path | Authorization |
|---|---|
| `GET /api/v1/partners/me` | Current partner/admin identity; returns actual memberships |
| `PATCH /api/v1/partners/{partner_id}` | Matching owner/manager or admin; no status mutation |
| `GET /api/v1/partners/{partner_id}/offers` | Matching membership or admin |
| `POST /api/v1/partners/{partner_id}/offers` | Matching owner/manager or admin |
| `PATCH /api/v1/partners/{partner_id}/offers/{offer_id}` | Matching owner/manager and owner ID match, or admin |

Every protected operation verifies active user state, database roles, and the composite membership
row. User-supplied partner IDs never override these checks. An offer cannot be reassigned to another
partner through update DTOs. Non-admin partners may publish active offers only while their partner
organization is approved.

Service offers are definitions and integer-VND catalog prices. These APIs do not confirm dated
availability, reserve inventory, create bookings, or initiate payments.
