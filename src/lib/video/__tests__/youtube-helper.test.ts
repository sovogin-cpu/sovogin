import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  extractYouTubeVideoId,
  buildYouTubeEmbedUrl,
  isValidYouTubeInput,
} from "../youtube-helper";
import { isUserAuthorizedForLiveStream } from "../live-authorization";

describe("SOVOGIN — YouTube Helper & Security Suite", () => {
  test("1. Extracts video ID from standard watch URL", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    assert.equal(extractYouTubeVideoId(url), "dQw4w9WgXcQ");
    assert.equal(
      buildYouTubeEmbedUrl(url),
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&modestbranding=1"
    );
  });

  test("2. Extracts video ID from short youtu.be URL", () => {
    const url = "https://youtu.be/dQw4w9WgXcQ";
    assert.equal(extractYouTubeVideoId(url), "dQw4w9WgXcQ");
    assert.equal(isValidYouTubeInput(url), true);
  });

  test("3. Extracts video ID from youtube.com/live URL", () => {
    const url = "https://www.youtube.com/live/dQw4w9WgXcQ?feature=share";
    assert.equal(extractYouTubeVideoId(url), "dQw4w9WgXcQ");
  });

  test("4. Extracts video ID from embed URL", () => {
    const url = "https://www.youtube.com/embed/dQw4w9WgXcQ";
    assert.equal(extractYouTubeVideoId(url), "dQw4w9WgXcQ");
  });

  test("5. Rejects malformed YouTube URLs", () => {
    assert.equal(extractYouTubeVideoId("https://www.youtube.com/watch?invalid=true"), null);
    assert.equal(extractYouTubeVideoId("https://youtu.be/short"), null);
    assert.equal(extractYouTubeVideoId("not-a-url-or-id"), null);
  });

  test("6. Rejects foreign domains and lookalike malicious domains", () => {
    assert.equal(extractYouTubeVideoId("https://vimeo.com/123456789"), null);
    assert.equal(extractYouTubeVideoId("https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ"), null);
    assert.equal(extractYouTubeVideoId("https://evil-youtube.com/watch?v=dQw4w9WgXcQ"), null);
  });

  test("7. Security Check: Rejects raw iframe HTML tags", () => {
    const html = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>';
    assert.equal(extractYouTubeVideoId(html), null);
    assert.equal(buildYouTubeEmbedUrl(html), null);
  });

  test("8. Direct 11-char VIDEO_ID input is accepted", () => {
    const id = "dQw4w9WgXcQ";
    assert.equal(extractYouTubeVideoId(id), "dQw4w9WgXcQ");
    assert.equal(isValidYouTubeInput(id), true);
  });
});

describe("SOVOGIN — Live Access Authorization Policy Suite", () => {
  const targetEventId = "evt-target-100";
  const otherEventId = "evt-other-200";
  const userEmail = "medico@sovogin.org";

  test("9. Unauthenticated user → denied", () => {
    const auth = isUserAuthorizedForLiveStream({
      targetEventId,
      userEmail: null,
      registration: null,
      guestAttendee: null,
    });
    assert.equal(auth, false);
  });

  test("10. Authenticated user without event registration → denied", () => {
    const auth = isUserAuthorizedForLiveStream({
      targetEventId,
      userEmail,
      registration: null,
      guestAttendee: null,
    });
    assert.equal(auth, false);
  });

  test("11. Pending registration → denied", () => {
    const auth = isUserAuthorizedForLiveStream({
      targetEventId,
      userEmail,
      registration: { event_id: targetEventId, email: userEmail, status: "pending" },
      guestAttendee: null,
    });
    assert.equal(auth, false);
  });

  test("12. Confirmed registration for OTHER event → denied", () => {
    const auth = isUserAuthorizedForLiveStream({
      targetEventId,
      userEmail,
      registration: { event_id: otherEventId, email: userEmail, status: "confirmed" },
      guestAttendee: null,
    });
    assert.equal(auth, false);
  });

  test("13. Active associate without registration for target event → denied", () => {
    const auth = isUserAuthorizedForLiveStream({
      targetEventId,
      userEmail,
      registration: null,
      guestAttendee: null,
    });
    assert.equal(auth, false);
  });

  test("14. Active associate with confirmed free registration → allowed", () => {
    const auth = isUserAuthorizedForLiveStream({
      targetEventId,
      userEmail,
      registration: { event_id: targetEventId, email: userEmail, status: "confirmed" },
      guestAttendee: null,
    });
    assert.equal(auth, true);
  });

  test("15. Confirmed registration for target event → allowed", () => {
    const auth = isUserAuthorizedForLiveStream({
      targetEventId,
      userEmail: "registrado@sovogin.org",
      registration: { event_id: targetEventId, email: "registrado@sovogin.org", status: "confirmed" },
      guestAttendee: null,
    });
    assert.equal(auth, true);
  });

  test("16. Guest attendee on event_attendees list → allowed", () => {
    const auth = isUserAuthorizedForLiveStream({
      targetEventId,
      userEmail: "invitado@sovogin.org",
      registration: null,
      guestAttendee: { event_live_id: targetEventId, email: "invitado@sovogin.org" },
    });
    assert.equal(auth, true);
  });
});
