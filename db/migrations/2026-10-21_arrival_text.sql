-- Arrival text for 28 Ted Rogers Way: landmark, Charles Street warning, buzzer
-- text, Signature Venue lobby line and parking. The Private Wellness Lounge
-- lobby directions are unchanged. Text only, no schema change.
UPDATE settings SET
  venue_details =
    '28 Ted Rogers Way (Couture Condominium), just south of Bloor Street East, Toronto, M4Y 2J4. Our entrance is on Ted Rogers Way, directly across the street from the Rogers Communications Corporate Headquarters. Please note: some GPS apps send people to Charles Street East, which is the wrong side of the building. If that happens, go to Ted Rogers Way and look for the “Couture” sign above the entrance.'
    || E'\n' ||
    'Please buzz the concierge upon arrival for entry. If concierge is unavailable, use the intercom and dial #0253 for access.',
  venue_directions_signature =
    'Once you enter the lobby: turn left right away. The venue entrance is right there.',
  parking =
    'Green P parking is available on Ted Rogers Way, with additional paid parking on nearby sections of Charles Street East and Jarvis Street. The closest parking is on Ted Rogers Way between Bloor Street East and Charles Street East.'
WHERE id = TRUE;
