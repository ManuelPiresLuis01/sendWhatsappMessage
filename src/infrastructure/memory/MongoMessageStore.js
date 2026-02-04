import { MongoClient } from "mongodb";

export class MongoMessageStore {
  constructor(uri, dbName) {
    this.uri = uri;
    this.dbName = dbName || "whatsapp_bot";
    this.client = null;
    this.collection = null;
    this.dailyCollection = null;
    this.usersCollection = null;
  }

  async connect() {
    if (!this.uri) {
      throw new Error("MONGODB_URI is not set");
    }

    this.client = new MongoClient(this.uri);
    await this.client.connect();
    const db = this.client.db(this.dbName);
    this.collection = db.collection("messages");
    this.dailyCollection = db.collection("daily_counts");
    this.usersCollection = db.collection("users");
  }

  async ensureUser(userId) {
    if (!this.usersCollection) {
      throw new Error("MongoMessageStore not connected");
    }

    await this.usersCollection.updateOne(
      { userId },
      { $setOnInsert: { userId, firstMessageAt: new Date() } },
      { upsert: true }
    );
  }

  async addMessage(userId, role, body) {
    if (!this.collection) {
      throw new Error("MongoMessageStore not connected");
    }

    await this.collection.insertOne({
      userId,
      role,
      body,
      createdAt: new Date()
    });
  }

  async trimToLimit(userId, role, limitPerRole) {
    const stale = await this.collection
      .find({ userId, role })
      .sort({ createdAt: -1 })
      .skip(limitPerRole)
      .project({ _id: 1 })
      .toArray();

    if (!stale.length) {
      return;
    }

    await this.collection.deleteMany({
      _id: { $in: stale.map((doc) => doc._id) }
    });
  }

  async cleanUp(userId, maxMessages) {
    if (!this.collection) {
      throw new Error("MongoMessageStore not connected");
    }

    const stale = await this.collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(maxMessages)
      .project({ _id: 1 })
      .toArray();

    if (!stale.length) {
      return;
    }

    await this.collection.deleteMany({
      _id: { $in: stale.map((doc) => doc._id) }
    });
  }

  async getConversation(userId, limitPerRole) {
    if (!this.collection) {
      throw new Error("MongoMessageStore not connected");
    }

    const [userMessages, botMessages] = await Promise.all([
      this.collection
        .find({ userId, role: "user" })
        .sort({ createdAt: -1 })
        .limit(limitPerRole)
        .toArray(),
      this.collection
        .find({ userId, role: "bot" })
        .sort({ createdAt: -1 })
        .limit(limitPerRole)
        .toArray()
    ]);

    return [...userMessages, ...botMessages].sort((a, b) => a.createdAt - b.createdAt);
  }

  async incrementDailyCount(userId, dateKey) {
    if (!this.dailyCollection) {
      throw new Error("MongoMessageStore not connected");
    }

    const result = await this.dailyCollection.findOneAndUpdate(
      { userId, dateKey },
      { $inc: { count: 1 }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, returnDocument: "after" }
    );

    return result?.count || result?.value?.count || 0;
  }
}
