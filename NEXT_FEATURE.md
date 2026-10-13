# Next feature: live drone GPS tracking

Status: planned, not implemented  
Recorded: 2026-10-13

## Goal

Show the aircraft's actual GPS position and flight trail on the SkySafe map, alongside the planned route. Keep the mobile map clear by putting connection details in a collapsible panel.

The existing **Use my location** action reads the browser/device location. The existing flight preview animates a simulated drone. Neither currently receives aircraft telemetry.

## DJI FPV compatibility

DJI currently lists the DJI FPV as not supporting its Windows, Mobile, or Onboard SDKs. Do not promise direct access to its built-in GPS through an official SDK or assume that connecting the goggles by USB exposes browser-readable telemetry.

Confirm the user's actual aircraft, goggles/controller, phone operating system, firmware, and willingness to use an external tracker before selecting the integration.

## Integration options

| Option | Capability | Prerequisites |
| --- | --- | --- |
| External GPS/cellular tracker | Live or near-live position from a tracker carried by the drone | A device suitable for the aircraft, accessible API/protocol, known update interval, power and mounting assessment, and network coverage |
| SDK-supported aircraft | Aircraft position and other telemetry through a companion mobile app | Exact drone/controller/SDK compatibility confirmed; companion app forwards supported fields to the server |
| Flight-record import | Replay a completed flight on the map | Obtain an exported sample and validate decoding, encryption/version requirements, timestamps, and coordinate fields before promising import support |

Flight-record replay is a separate feature from live tracking. Unofficial DJI FPV telemetry extraction remains unverified and is not the implementation baseline.

## Proposed connection

```text
Aircraft telemetry or external tracker
    -> companion app / provider gateway
    -> authenticated telemetry server
    -> WebSocket or server-sent events
    -> SkySafe aircraft marker and trail
```

SkySafe is currently frontend-only. Live tracking requires a trusted telemetry source and a backend or compatible provider service; adding a Connect button alone will not create a drone connection.

## Initial feature scope

- Pair a telemetry source and select the aircraft/tracker to display.
- Show separate states for disconnected, connecting, live, stale, and connection error.
- Display the aircraft marker, recent trail, last update time, and available position accuracy.
- Provide an optional follow-aircraft mode; manual map movement pauses following, with an explicit recenter action.
- Compare the actual trail with the planned route without rewriting the user's plan.
- Show altitude, speed, heading, and battery only when supplied with known units and meaning. Tracker battery must not be labeled as aircraft battery.
- Keep browser location, simulated preview, recorded replay, and actual aircraft telemetry visibly distinct.
- Warn when telemetry enters a loaded verified prohibited/restricted zone. Map alerts do not control or stop the aircraft, and incomplete zone coverage must remain visible.

## Telemetry contract

Required fields:

- `deviceId`: authenticated source identity.
- `recordedAt`: UTC timestamp from the source.
- `receivedAt`: UTC timestamp assigned by the server.
- `latitude`, `longitude`: validated WGS84 coordinates.
- `source`: aircraft SDK, external tracker, or recorded import.

Optional fields, only when supported:

- `altitudeMeters` with an explicit altitude reference.
- `groundSpeedMps`, `headingDegrees`, and `horizontalAccuracyMeters`.
- `aircraftBatteryPercent` and `trackerBatteryPercent` as separate fields.
- Sequence number or other provider identifier for deduplication and ordering.

Reject invalid coordinates and malformed messages. Handle duplicate and out-of-order updates. Derive stale thresholds from the verified source update interval; do not keep displaying an old fix as live or extrapolate it into a fabricated live position.

## Delivery steps

1. Confirm hardware and obtain a real sample of the intended telemetry or exported flight record.
2. Prove access to GPS updates and measure timing, units, and disconnect behavior.
3. Define the source adapter and authenticated ingestion API; keep provider credentials out of frontend environment variables.
4. Add per-device authorization, encrypted transport, and a clear location retention policy.
5. Implement map tracking, optional follow mode, trail rendering, and connection status.
6. Add planned-versus-actual comparison and alerts against available verified zones.
7. Validate against a real device before labeling the integration supported.

## Acceptance criteria

- A supported real device updates its own marker and trail at its documented cadence.
- Phone location and preview simulation are never presented as drone telemetry.
- Loss of GPS or transport changes the status to stale/disconnected and retains a labeled last-known position.
- Reconnection handles missed, duplicate, and out-of-order data without drawing misleading jumps.
- One user cannot publish to or subscribe to another user's device without authorization.
- Follow mode, pan-to-pause, and recenter work on phone and desktop layouts without covering the map.
- Recorded flights are labeled as replay; imported formats are tested against supported sample files.
- Existing route editing and no-fly-zone planning blocks continue to work independently of tracking.

## Sources and verification

Reviewed on 2026-10-13. Recheck compatibility when implementation begins.

- [DJI Product SDK Compatibility](https://repair.dji.com/help/content?customId=01700000763&documentType=&lang=en&paperDocType=ARTICLE&re=US&spaceId=17)
- [DJI Mobile SDK](https://developer.dji.com/mobile-sdk-v4)
- [DJI Fly and DJI GO 4 Flight Record Export Guide](https://repair.dji.com/help/content?customId=en-us03400006894&documentType=artical&lang=en&paperDocType=paper&re=US&spaceId=34)
- [Traccar API reference](https://www.traccar.org/api-reference/) — possible tracker integration reference; no tracker compatibility has been established.
