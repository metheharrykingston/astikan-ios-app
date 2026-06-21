# Astikan Nearby Doctor Discovery Feature

This build adds a Google Places-backed nearby doctor discovery flow to the user app.

## User flow

1. User opens Doctor page.
2. User taps **Find nearby doctors**.
3. App requests location permission.
4. Backend searches Google Places for `includedTypes: ["doctor"]`.
5. App shows doctor/place cards with:
   - blurred/anonymized avatar
   - name
   - address
   - location/distance
   - primary type
   - types
   - rating when returned
   - **Book Now**
6. After **Book Now**, user chooses:
   - Clinic Visit
   - Video Consultation
7. User enters reason, preferred date/time, patient details and optional report metadata.
8. Backend creates a booking request. It is not a confirmed appointment yet.
9. Astikan confirms availability, slot and pricing before final booking/payment.

## Google Places fields used

The backend asks for only these fields:

```txt
places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types,places.rating
```

It does not ask for phone, website, photos, reviews, opening hours or Google Business pricing.

## Frontend route list

```txt
/nearby-doctors
/nearby-doctors/consult
/nearby-doctors/request
/nearby-doctors/success
```

## Backend APIs needed

```txt
GET /api/doctors/nearby?lat=...&lng=...&radius=5000&limit=10
POST /api/doctors/nearby-booking-requests
GET /api/doctors/nearby-booking-requests/mine
```

## Important UX rule

**Book Now** means **booking request**, not confirmed appointment.

The app shows:

```txt
Astikan will confirm availability and pricing before final booking.
```
