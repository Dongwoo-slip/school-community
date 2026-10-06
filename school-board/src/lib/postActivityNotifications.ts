import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSign } from "node:crypto";
import { connect } from "node:http2";

type ActivityType = "comment" | "like";
type AdminClient = SupabaseClient<any, "public", any>;

type NotifyPostActivityInput = {
  sb: AdminClient;
  postId: string;
  actor: Pick<User, "id" | "email">;
  type: ActivityType;
  commentId?: string | null;
  reactionId?: string | null;
};

type ApnsConfig = {
  teamId: string;
  keyId: string;
  bundleId: string;
  privateKey: string;
  environment: "development" | "production";
};

function usernameFromEmail(email: string | null | undefined) {
  if (!email) return "unknown";
  const at = email.indexOf("@");
  return at >= 0 ? email.slice(0, at) : email;
}

async function actorUsername(sb: AdminClient, actor: Pick<User, "id" | "email">) {
  const { data } = await sb.from("profiles").select("username").eq("id", actor.id).maybeSingle();
  return data?.username ?? usernameFromEmail(actor.email);
}

function notificationText(type: ActivityType) {
  if (type === "comment") {
    return {
      title: "새 댓글",
      body: "내 게시글에 새 댓글이 달렸습니다.",
    };
  }

  return {
    title: "새 좋아요",
    body: "내 게시글에 좋아요가 눌렸습니다.",
  };
}

function apnsEnvironment(value: string | undefined): "development" | "production" {
  if (value === "production") return "production";
  if (value === "development") return "development";
  return process.env.VERCEL_ENV === "production" ? "production" : "development";
}

function getApnsConfig(): ApnsConfig | null {
  const teamId = process.env.APNS_TEAM_ID;
  const keyId = process.env.APNS_KEY_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const bundleId = process.env.APNS_BUNDLE_ID || "com.squarecj.app";
  const environment = apnsEnvironment(process.env.APNS_ENV);

  if (!teamId || !keyId || !privateKey) return null;
  return { teamId, keyId, privateKey, bundleId, environment };
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function createApnsJwt(config: ApnsConfig) {
  const header = base64Url(JSON.stringify({ alg: "ES256", kid: config.keyId }));
  const payload = base64Url(JSON.stringify({ iss: config.teamId, iat: Math.floor(Date.now() / 1000) }));
  const data = `${header}.${payload}`;
  const signature = createSign("sha256").update(data).sign({
    key: config.privateKey,
    dsaEncoding: "ieee-p1363",
  });
  return `${data}.${base64Url(signature)}`;
}

async function sendApns(token: string, payload: Record<string, unknown>, config: ApnsConfig) {
  const host = config.environment === "production" ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com";
  const client = connect(host);

  try {
    const jwt = createApnsJwt(config);
    const body = JSON.stringify(payload);

    await new Promise<void>((resolve, reject) => {
      const req = client.request({
        ":method": "POST",
        ":path": `/3/device/${token}`,
        authorization: `bearer ${jwt}`,
        "apns-topic": config.bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      });

      let status = 0;
      let chunks = "";

      req.setEncoding("utf8");
      req.on("response", (headers) => {
        status = Number(headers[":status"] ?? 0);
      });
      req.on("data", (chunk) => {
        chunks += chunk;
      });
      req.on("end", () => {
        if (status >= 200 && status < 300) resolve();
        else reject(new Error(`APNs ${status}: ${chunks || "request failed"}`));
      });
      req.on("error", reject);
      req.end(body);
    });

    return { ok: true as const };
  } catch (e: any) {
    return { ok: false as const, error: e?.message ?? String(e) };
  } finally {
    client.close();
  }
}

async function sendPushToUser(
  sb: AdminClient,
  recipientId: string,
  type: ActivityType,
  postId: string,
) {
  const config = getApnsConfig();
  if (!config) return;

  const { data: tokens, error } = await sb
    .from("push_tokens")
    .select("id,token,environment,enabled")
    .eq("user_id", recipientId)
    .eq("platform", "ios")
    .eq("environment", config.environment)
    .eq("enabled", true);

  if (error || !tokens?.length) return;

  const text = notificationText(type);
  await Promise.all(
    tokens.map(async (row: any) => {
      const result = await sendApns(
        String(row.token),
        {
          aps: {
            alert: text,
            sound: "default",
          },
          type,
          post_id: postId,
        },
        config,
      );

      if (!result.ok && /BadDeviceToken|Unregistered|DeviceTokenNotForTopic/.test(result.error)) {
        await sb.from("push_tokens").update({ enabled: false, last_error: result.error }).eq("id", row.id);
      } else if (!result.ok) {
        await sb.from("push_tokens").update({ last_error: result.error }).eq("id", row.id);
      } else {
        await sb.from("push_tokens").update({ last_error: null, last_sent_at: new Date().toISOString() }).eq("id", row.id);
      }
    }),
  );
}

export async function notifyPostActivity(input: NotifyPostActivityInput) {
  const { sb, postId, actor, type } = input;

  const { data: post, error: postError } = await sb
    .from("posts")
    .select("id,author_id,board,title")
    .eq("id", postId)
    .maybeSingle();

  if (postError || !post?.author_id) return { ok: false as const, skipped: "post_not_found" as const };
  if (String(post.author_id) === String(actor.id)) return { ok: true as const, skipped: "self_activity" as const };

  const recipientId = String(post.author_id);
  const actorName = await actorUsername(sb, actor);

  if (type === "like") {
    const { data: existing } = await sb
      .from("notifications")
      .select("id")
      .eq("recipient_id", recipientId)
      .eq("actor_id", actor.id)
      .eq("post_id", postId)
      .eq("type", "like")
      .maybeSingle();

    if (existing?.id) return { ok: true as const, skipped: "duplicate_like" as const };
  }

  const row = {
    recipient_id: recipientId,
    actor_id: actor.id,
    actor_username: actorName,
    type,
    post_id: postId,
    comment_id: input.commentId ?? null,
    reaction_id: input.reactionId ?? null,
    board: post.board ?? null,
    post_title: post.title ? String(post.title).slice(0, 120) : null,
    read: false,
  };

  const { data: inserted, error } = await sb.from("notifications").insert(row).select("id").maybeSingle();

  if (error) {
    if (type === "like" && /duplicate|unique/i.test(error.message)) {
      return { ok: true as const, skipped: "duplicate_like" as const };
    }
    console.error("Failed to create post activity notification:", error.message);
    return { ok: false as const, error: error.message };
  }

  await sendPushToUser(sb, recipientId, type, postId);
  return { ok: true as const, id: inserted?.id ?? null };
}
