import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

admin.initializeApp();
setGlobalOptions({ region: "asia-southeast1", maxInstances: 10 });

interface ZaloMeResponse {
  id?: string;
  name?: string;
  picture?: { data?: { url?: string } };
  error?: number;
  message?: string;
}

/**
 * Exchanges a Zalo Mini App access token (obtained client-side via zmp-sdk's
 * getAccessToken) for a Firebase custom token. The token is verified against
 * Zalo's own Graph API server-side, so a client can never forge another
 * user's identity - Firestore/Storage rules then trust request.auth.uid.
 */
export const zaloLogin = onCall(async (request) => {
  const accessToken = request.data?.accessToken;
  if (!accessToken || typeof accessToken !== "string") {
    throw new HttpsError("invalid-argument", "Thiếu accessToken.");
  }

  const zaloRes = await fetch(
    `https://graph.zalo.me/v2.0/me?fields=id,name,picture&access_token=${encodeURIComponent(accessToken)}`,
    { headers: { access_token: accessToken } }
  );
  const zaloData = (await zaloRes.json()) as ZaloMeResponse;

  if (!zaloData.id) {
    throw new HttpsError("unauthenticated", "Không xác thực được tài khoản Zalo.");
  }

  const uid = `zalo:${zaloData.id}`;
  const now = Date.now();

  await admin
    .firestore()
    .collection("users")
    .doc(uid)
    .set(
      {
        uid,
        zaloId: zaloData.id,
        name: zaloData.name ?? "Người dùng Zalo",
        avatar: zaloData.picture?.data?.url ?? null,
        updatedAt: now,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  const customToken = await admin.auth().createCustomToken(uid, {
    zaloId: zaloData.id,
  });

  return {
    token: customToken,
    profile: {
      uid,
      zaloId: zaloData.id,
      name: zaloData.name ?? "Người dùng Zalo",
      avatar: zaloData.picture?.data?.url ?? null,
    },
  };
});
