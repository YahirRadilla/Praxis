import { describe, expect, it } from "vitest";
import { app, prisma, registerUser, request } from "./helpers";

describe("conversations", () => {
  it("creates a PENDING message request on the first message", async () => {
    const sender = await registerUser("STUDENT", "Chat First Sender");
    const recipient = await registerUser("TEACHER", "Chat First Recipient");

    const res = await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ recipientId: recipient.user.id, text: "Hola, ¿tienes un momento?" });

    expect(res.status).toBe(201);
    expect(res.body.conversation.status).toBe("PENDING");
    expect(res.body.conversation.viewerIsInitiator).toBe(true);
    expect(res.body.conversation.initiatorId).toBe(sender.user.id);
    expect(res.body.conversation.otherUser).toEqual({
      id: recipient.user.id,
      name: recipient.user.name,
      accountType: recipient.user.accountType,
    });
    expect(res.body.message.text).toBe("Hola, ¿tienes un momento?");
    expect(res.body.message.senderId).toBe(sender.user.id);

    const recipientRequests = await request(app)
      .get("/api/conversations?box=requests")
      .set("Authorization", `Bearer ${recipient.token}`);
    expect(recipientRequests.body).toHaveLength(1);
    expect(recipientRequests.body[0].id).toBe(res.body.conversation.id);

    const recipientInbox = await request(app)
      .get("/api/conversations?box=inbox")
      .set("Authorization", `Bearer ${recipient.token}`);
    expect(recipientInbox.body).toHaveLength(0);

    const senderInbox = await request(app)
      .get("/api/conversations?box=inbox")
      .set("Authorization", `Bearer ${sender.token}`);
    expect(senderInbox.body).toHaveLength(1);
    expect(senderInbox.body[0].status).toBe("PENDING");
  });

  it("lets the initiator send more messages while PENDING without duplicating the request notification", async () => {
    const sender = await registerUser("ORGANIZATION", "Chat Repeat Sender");
    const recipient = await registerUser("STUDENT", "Chat Repeat Recipient");

    const first = await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ recipientId: recipient.user.id, text: "Primer mensaje" });

    const second = await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ recipientId: recipient.user.id, text: "Segundo mensaje" });

    expect(second.status).toBe(201);
    expect(second.body.conversation.id).toBe(first.body.conversation.id);
    expect(second.body.conversation.status).toBe("PENDING");

    const notificationCount = await prisma.notification.count({
      where: { userId: recipient.user.id, type: "MESSAGE_REQUEST_RECEIVED" },
    });
    expect(notificationCount).toBe(1);
  });

  it("accepts a request, exposing it in both inboxes and notifying the initiator", async () => {
    const sender = await registerUser("STUDENT", "Chat Accept Sender");
    const recipient = await registerUser("TEACHER", "Chat Accept Recipient");

    const created = await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ recipientId: recipient.user.id, text: "¿Podemos hablar?" });

    const accepted = await request(app)
      .patch(`/api/conversations/${created.body.conversation.id}`)
      .set("Authorization", `Bearer ${recipient.token}`)
      .send({ status: "ACCEPTED" });

    expect(accepted.status).toBe(200);
    expect(accepted.body.status).toBe("ACCEPTED");

    const senderInbox = await request(app)
      .get("/api/conversations?box=inbox")
      .set("Authorization", `Bearer ${sender.token}`);
    expect(senderInbox.body.map((c: any) => c.id)).toContain(created.body.conversation.id);

    const recipientInbox = await request(app)
      .get("/api/conversations?box=inbox")
      .set("Authorization", `Bearer ${recipient.token}`);
    expect(recipientInbox.body.map((c: any) => c.id)).toContain(created.body.conversation.id);

    const recipientRequests = await request(app)
      .get("/api/conversations?box=requests")
      .set("Authorization", `Bearer ${recipient.token}`);
    expect(recipientRequests.body).toHaveLength(0);

    const notifications = await prisma.notification.findMany({
      where: { userId: sender.user.id, type: "MESSAGE_REQUEST_ACCEPTED" },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].message).toContain(recipient.user.name);
    expect(notifications[0].link).toBe(`/mensajes/${recipient.user.id}`);
  });

  it("enforces who can respond and when", async () => {
    const sender = await registerUser("STUDENT", "Chat Auth Sender");
    const recipient = await registerUser("TEACHER", "Chat Auth Recipient");
    const outsider = await registerUser("STUDENT", "Chat Auth Outsider");

    const created = await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ recipientId: recipient.user.id, text: "Hola" });
    const conversationId = created.body.conversation.id;

    const initiatorPatch = await request(app)
      .patch(`/api/conversations/${conversationId}`)
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ status: "ACCEPTED" });
    expect(initiatorPatch.status).toBe(403);
    expect(initiatorPatch.body.message).toBe("Solo quien recibió la solicitud puede responderla.");

    const outsiderPatch = await request(app)
      .patch(`/api/conversations/${conversationId}`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({ status: "ACCEPTED" });
    expect(outsiderPatch.status).toBe(404);

    const outsiderRead = await request(app)
      .post(`/api/conversations/${conversationId}/read`)
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(outsiderRead.status).toBe(404);

    const outsiderWith = await request(app)
      .get(`/api/conversations/with/${sender.user.id}`)
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(outsiderWith.status).toBe(200);
    expect(outsiderWith.body.conversation).toBeNull();

    const accepted = await request(app)
      .patch(`/api/conversations/${conversationId}`)
      .set("Authorization", `Bearer ${recipient.token}`)
      .send({ status: "ACCEPTED" });
    expect(accepted.status).toBe(200);

    const alreadyResolved = await request(app)
      .patch(`/api/conversations/${conversationId}`)
      .set("Authorization", `Bearer ${recipient.token}`)
      .send({ status: "REJECTED" });
    expect(alreadyResolved.status).toBe(409);
    expect(alreadyResolved.body.message).toBe("Esta solicitud ya fue resuelta.");
  });

  it("rejects a request, hiding it from both lists and blocking the initiator's next message", async () => {
    const sender = await registerUser("STUDENT", "Chat Reject Sender");
    const recipient = await registerUser("TEACHER", "Chat Reject Recipient");

    const created = await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ recipientId: recipient.user.id, text: "Hola" });

    const rejected = await request(app)
      .patch(`/api/conversations/${created.body.conversation.id}`)
      .set("Authorization", `Bearer ${recipient.token}`)
      .send({ status: "REJECTED" });
    expect(rejected.status).toBe(200);
    expect(rejected.body.status).toBe("REJECTED");

    const senderInbox = await request(app)
      .get("/api/conversations?box=inbox")
      .set("Authorization", `Bearer ${sender.token}`);
    expect(senderInbox.body.map((c: any) => c.id)).toContain(created.body.conversation.id);

    const recipientInbox = await request(app)
      .get("/api/conversations?box=inbox")
      .set("Authorization", `Bearer ${recipient.token}`);
    expect(recipientInbox.body.map((c: any) => c.id)).not.toContain(created.body.conversation.id);

    const recipientRequests = await request(app)
      .get("/api/conversations?box=requests")
      .set("Authorization", `Bearer ${recipient.token}`);
    expect(recipientRequests.body.map((c: any) => c.id)).not.toContain(created.body.conversation.id);

    const secondAttempt = await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ recipientId: recipient.user.id, text: "¿Puedo intentar de nuevo?" });
    expect(secondAttempt.status).toBe(403);
    expect(secondAttempt.body.message).toBe("Esta persona no aceptó tu solicitud de mensaje.");
  });

  it("collapses a reverse-direction first message into the same row and implicitly accepts it", async () => {
    const userA = await registerUser("STUDENT", "Chat Reverse A");
    const userB = await registerUser("TEACHER", "Chat Reverse B");

    const aToB = await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ recipientId: userB.user.id, text: "Hola desde A" });
    expect(aToB.body.conversation.status).toBe("PENDING");

    const bToA = await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ recipientId: userA.user.id, text: "Hola desde B" });

    expect(bToA.status).toBe(201);
    expect(bToA.body.conversation.id).toBe(aToB.body.conversation.id);
    expect(bToA.body.conversation.status).toBe("ACCEPTED");

    const rowCount = await prisma.conversation.count({
      where: {
        OR: [
          { userAId: userA.user.id, userBId: userB.user.id },
          { userAId: userB.user.id, userBId: userA.user.id },
        ],
      },
    });
    expect(rowCount).toBe(1);
  });

  it("re-accepts implicitly when the recipient messages back after rejecting", async () => {
    const sender = await registerUser("STUDENT", "Chat Reopen Sender");
    const recipient = await registerUser("TEACHER", "Chat Reopen Recipient");

    const created = await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ recipientId: recipient.user.id, text: "Hola" });

    await request(app)
      .patch(`/api/conversations/${created.body.conversation.id}`)
      .set("Authorization", `Bearer ${recipient.token}`)
      .send({ status: "REJECTED" });

    const reply = await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${recipient.token}`)
      .send({ recipientId: sender.user.id, text: "En realidad sí quiero hablar" });

    expect(reply.status).toBe(201);
    expect(reply.body.conversation.id).toBe(created.body.conversation.id);
    expect(reply.body.conversation.status).toBe("ACCEPTED");
  });

  it("validates the message payload", async () => {
    const sender = await registerUser("STUDENT", "Chat Validation Sender");
    const recipient = await registerUser("TEACHER", "Chat Validation Recipient");

    const selfMessage = await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ recipientId: sender.user.id, text: "Hola" });
    expect(selfMessage.status).toBe(400);

    const unknownRecipient = await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ recipientId: 999999999, text: "Hola" });
    expect(unknownRecipient.status).toBe(404);

    const blank = await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ recipientId: recipient.user.id, text: "   " });
    expect(blank.status).toBe(400);

    const tooLong = await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ recipientId: recipient.user.id, text: "a".repeat(2001) });
    expect(tooLong.status).toBe(400);
  });

  it("returns the with/:userId shape before and after a conversation exists, never leaking email", async () => {
    const userA = await registerUser("STUDENT", "Chat With A");
    const userB = await registerUser("TEACHER", "Chat With B");

    const before = await request(app)
      .get(`/api/conversations/with/${userB.user.id}`)
      .set("Authorization", `Bearer ${userA.token}`);
    expect(before.status).toBe(200);
    expect(before.body.conversation).toBeNull();
    expect(before.body.otherUser).toEqual({
      id: userB.user.id,
      name: userB.user.name,
      accountType: userB.user.accountType,
    });
    expect(before.body.otherUser.email).toBeUndefined();

    await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ recipientId: userB.user.id, text: "Primero" });
    await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ recipientId: userB.user.id, text: "Segundo" });

    const after = await request(app)
      .get(`/api/conversations/with/${userB.user.id}`)
      .set("Authorization", `Bearer ${userA.token}`);
    expect(after.status).toBe(200);
    expect(after.body.conversation).not.toBeNull();
    expect(after.body.conversation.messages).toHaveLength(2);
    expect(after.body.conversation.messages[0].text).toBe("Primero");
    expect(after.body.conversation.messages[1].text).toBe("Segundo");
    expect(after.body.otherUser.email).toBeUndefined();
  });

  it("tracks unread counts and pending requests, and clears them on read", async () => {
    const sender = await registerUser("STUDENT", "Chat Unread Sender");
    const recipient = await registerUser("TEACHER", "Chat Unread Recipient");

    const created = await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ recipientId: recipient.user.id, text: "Uno" });
    await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ recipientId: recipient.user.id, text: "Dos" });

    const recipientUnread = await request(app)
      .get("/api/conversations/unread-count")
      .set("Authorization", `Bearer ${recipient.token}`);
    expect(recipientUnread.body.count).toBe(2);
    expect(recipientUnread.body.pendingRequests).toBe(1);

    const senderUnread = await request(app)
      .get("/api/conversations/unread-count")
      .set("Authorization", `Bearer ${sender.token}`);
    expect(senderUnread.body.count).toBe(0);
    expect(senderUnread.body.pendingRequests).toBe(0);

    const markRead = await request(app)
      .post(`/api/conversations/${created.body.conversation.id}/read`)
      .set("Authorization", `Bearer ${recipient.token}`);
    expect(markRead.status).toBe(204);

    const afterRead = await request(app)
      .get("/api/conversations/unread-count")
      .set("Authorization", `Bearer ${recipient.token}`);
    expect(afterRead.body.count).toBe(0);

    const rejected = await request(app)
      .patch(`/api/conversations/${created.body.conversation.id}`)
      .set("Authorization", `Bearer ${recipient.token}`)
      .send({ status: "REJECTED" });
    expect(rejected.status).toBe(200);

    await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ recipientId: recipient.user.id, text: "Tres" })
      .then((res) => expect(res.status).toBe(403));

    const afterRejected = await request(app)
      .get("/api/conversations/unread-count")
      .set("Authorization", `Bearer ${recipient.token}`);
    expect(afterRejected.body.count).toBe(0);
  });

  it("requires auth on every route", async () => {
    const userA = await registerUser("STUDENT", "Chat Anon A");
    const userB = await registerUser("TEACHER", "Chat Anon B");

    const created = await request(app)
      .post("/api/conversations/messages")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ recipientId: userB.user.id, text: "Hola" });
    const conversationId = created.body.conversation.id;

    const list = await request(app).get("/api/conversations");
    expect(list.status).toBe(401);

    const unread = await request(app).get("/api/conversations/unread-count");
    expect(unread.status).toBe(401);

    const withUser = await request(app).get(`/api/conversations/with/${userB.user.id}`);
    expect(withUser.status).toBe(401);

    const send = await request(app)
      .post("/api/conversations/messages")
      .send({ recipientId: userB.user.id, text: "Hola" });
    expect(send.status).toBe(401);

    const patch = await request(app)
      .patch(`/api/conversations/${conversationId}`)
      .send({ status: "ACCEPTED" });
    expect(patch.status).toBe(401);

    const read = await request(app).post(`/api/conversations/${conversationId}/read`);
    expect(read.status).toBe(401);
  });
});
