import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  extractYouTubeVideoId,
  buildYouTubeEmbedUrl,
  buildYouTubeLiveChatUrl,
  isValidYouTubeInput,
  parseTransmissionConfig,
  validateExternalTransmissionUrl,
  getTrustedEmbedDomain,
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

  test("5. Direct 11-char VIDEO_ID input is accepted", () => {
    const id = "dQw4w9WgXcQ";
    assert.equal(extractYouTubeVideoId(id), "dQw4w9WgXcQ");
    assert.equal(isValidYouTubeInput(id), true);
  });

  test("6. Rejects invalid or malformed VIDEO_ID strings", () => {
    assert.equal(extractYouTubeVideoId("invalid-id-too-short"), null);
    assert.equal(extractYouTubeVideoId("https://www.youtube.com/watch?invalid=true"), null);
    assert.equal(extractYouTubeVideoId("not-a-url-or-id"), null);
  });

  test("7. Rejects foreign domains and spoofed malicious domains", () => {
    assert.equal(extractYouTubeVideoId("https://vimeo.com/123456789"), null);
    assert.equal(extractYouTubeVideoId("https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ"), null);
    assert.equal(extractYouTubeVideoId("https://evil-youtube.com/watch?v=dQw4w9WgXcQ"), null);
  });

  test("8. Security Check: Rejects raw iframe HTML tags", () => {
    const html = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>';
    assert.equal(extractYouTubeVideoId(html), null);
    assert.equal(buildYouTubeEmbedUrl(html), null);
  });
});

describe("SOVOGIN — Live Access Authorization Policy Suite", () => {
  const targetEventId = "evt-target-100";
  const otherEventId = "evt-other-200";
  const userEmail = "medico@sovogin.com";

  test("9. Unauthenticated / anonymous user → denied", () => {
    const auth = isUserAuthorizedForLiveStream({
      targetEventId,
      userEmail: null,
      registration: null,
      guestAttendee: null,
    });
    assert.equal(auth, false);
  });

  test("10. Authenticated user without registration for target event → denied", () => {
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

  test("13. Confirmed registration for TARGET event → allowed", () => {
    const auth = isUserAuthorizedForLiveStream({
      targetEventId,
      userEmail: "registrado@sovogin.com",
      registration: { event_id: targetEventId, email: "registrado@sovogin.com", status: "confirmed" },
      guestAttendee: null,
    });
    assert.equal(auth, true);
  });
});

describe("SOVOGIN — Transmission Provider & Link Validation Suite", () => {
  test("14. YouTube produces internal nocookie embed URL", () => {
    const config = parseTransmissionConfig("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    assert.equal(config.provider, "youtube");
    assert.equal(
      buildYouTubeEmbedUrl(config.url),
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&modestbranding=1"
    );
  });

  test("15. YouTube provider does NOT produce an external primary redirect URL", () => {
    const config = parseTransmissionConfig("dQw4w9WgXcQ");
    assert.equal(config.provider, "youtube");
    const embedUrl = buildYouTubeEmbedUrl(config.url);
    assert.equal(embedUrl?.startsWith("https://www.youtube-nocookie.com/embed/"), true);
  });

  test("16. Zoom produces authorized external action link", () => {
    const config = parseTransmissionConfig("https://zoom.us/j/1234567890");
    assert.equal(config.provider, "zoom");
    const val = validateExternalTransmissionUrl(config.url);
    assert.equal(val.isValid, true);
    assert.equal(val.url, "https://zoom.us/j/1234567890");
  });

  test("17. Google Meet produces authorized external action link", () => {
    const config = parseTransmissionConfig("https://meet.google.com/abc-defg-hij");
    assert.equal(config.provider, "google_meet");
    const val = validateExternalTransmissionUrl(config.url);
    assert.equal(val.isValid, true);
    assert.equal(val.url, "https://meet.google.com/abc-defg-hij");
  });

  test("18. Microsoft Teams produces authorized external action link", () => {
    const config = parseTransmissionConfig("https://teams.microsoft.com/l/meetup-join/123");
    assert.equal(config.provider, "microsoft_teams");
    const val = validateExternalTransmissionUrl(config.url);
    assert.equal(val.isValid, true);
  });

  test("19. External https link is allowed and validated", () => {
    const val = validateExternalTransmissionUrl("https://stream.example.org/live/100");
    assert.equal(val.isValid, true);
    assert.equal(val.url, "https://stream.example.org/live/100");
  });

  test("20. Unsafe protocols (javascript:, data:, file:) are strictly rejected", () => {
    assert.equal(validateExternalTransmissionUrl("javascript:alert(1)").isValid, false);
    assert.equal(validateExternalTransmissionUrl("data:text/html,<script>alert(1)</script>").isValid, false);
    assert.equal(validateExternalTransmissionUrl("file:///C:/etc/passwd").isValid, false);
    assert.equal(validateExternalTransmissionUrl("http://unsecure-http.example.com").isValid, false);
  });
});

describe("SOVOGIN — YouTube Live Chat Embed & Trusted Host Suite", () => {
  test("21. Trusted host sovogin.com builds valid live chat URL", () => {
    const chatUrl = buildYouTubeLiveChatUrl("dQw4w9WgXcQ", "https://sovogin.com/eventos/live/100");
    assert.equal(
      chatUrl,
      "https://www.youtube.com/live_chat?v=dQw4w9WgXcQ&embed_domain=sovogin.com"
    );
  });

  test("22. Trusted host sovogin.vercel.app builds valid live chat URL", () => {
    const chatUrl = buildYouTubeLiveChatUrl("dQw4w9WgXcQ", "sovogin.vercel.app");
    assert.equal(
      chatUrl,
      "https://www.youtube.com/live_chat?v=dQw4w9WgXcQ&embed_domain=sovogin.vercel.app"
    );
  });

  test("23. Trusted host sovogin-beta.vercel.app builds valid live chat URL", () => {
    const chatUrl = buildYouTubeLiveChatUrl("dQw4w9WgXcQ", "sovogin-beta.vercel.app");
    assert.equal(
      chatUrl,
      "https://www.youtube.com/live_chat?v=dQw4w9WgXcQ&embed_domain=sovogin-beta.vercel.app"
    );
  });

  test("24. Localhost allowed in development context", () => {
    const localChatUrl = buildYouTubeLiveChatUrl("dQw4w9WgXcQ", "localhost:3000");
    assert.equal(
      localChatUrl,
      "https://www.youtube.com/live_chat?v=dQw4w9WgXcQ&embed_domain=localhost"
    );
  });

  test("25. Unknown or spoofed host suppresses chat URL (returns null) without breaking video", () => {
    const spoofedChatUrl = buildYouTubeLiveChatUrl("dQw4w9WgXcQ", "evil-attacker.example.com");
    assert.equal(spoofedChatUrl, null);

    // Video embed remains valid and working even when chat is suppressed
    const videoEmbed = buildYouTubeEmbedUrl("dQw4w9WgXcQ");
    assert.equal(
      videoEmbed,
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&modestbranding=1"
    );
  });

  test("26. getTrustedEmbedDomain never returns obsolete sovogin.org domain", () => {
    assert.equal(getTrustedEmbedDomain("sovogin.com"), "sovogin.com");
    assert.notEqual(getTrustedEmbedDomain(null), "sovogin.org");
    assert.equal(getTrustedEmbedDomain(null), "sovogin.com");
  });
});
