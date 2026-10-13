import webpush from 'web-push';
import { PushSubscription } from '../models/PushSubscription.js';

export function configurePush(config) {
  webpush.setVapidDetails(config.VAPID_SUBJECT, config.VAPID_PUBLIC_KEY, config.VAPID_PRIVATE_KEY);
}

export async function defaultSender(subscription, body) {
  return webpush.sendNotification(subscription, body, { TTL: 600 });
}

// Sends one payload to every device of a user. Gone subscriptions (404 or 410) are removed.
// Error details (endpoints, payloads) are never logged.
export async function sendToUser(userId, payload, sender = defaultSender) {
  const subs = await PushSubscription.find({ userId }).lean();
  const body = JSON.stringify(payload);
  let delivered = 0;

  for (const sub of subs) {
    try {
      await sender({ endpoint: sub.endpoint, keys: sub.keys }, body);
      delivered += 1;
      await PushSubscription.updateOne({ _id: sub._id }, { $set: { lastSuccessAt: new Date(), failureCount: 0 } });
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await PushSubscription.deleteOne({ _id: sub._id });
      } else {
        await PushSubscription.updateOne({ _id: sub._id }, { $inc: { failureCount: 1 } });
      }
    }
  }
  return { delivered };
}
