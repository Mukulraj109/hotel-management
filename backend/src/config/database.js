import mongoose from "mongoose";
import logger from "../utils/logger.js";

// Guard against duplicate index declarations (e.g. path `index: true` + `schema.index()`).
if (!globalThis.__mongooseIndexPatchApplied) {
globalThis.__mongooseIndexPatchApplied = true;
const originalSchemaIndex = mongoose.Schema.prototype.index;
const originalSchemaIndexes = mongoose.Schema.prototype.indexes;
mongoose.Schema.prototype.index = function patchedIndex(fields, options = {}) {
  try {
    const normalizeFields = (obj = {}) =>
      JSON.stringify(
        Object.keys(obj)
          .sort()
          .reduce((acc, key) => {
            acc[key] = obj[key];
            return acc;
          }, {})
      );

    const normalizeOptions = (obj = {}) => {
      const copy = { ...obj };
      delete copy.background;
      return JSON.stringify(
        Object.keys(copy)
          .sort()
          .reduce((acc, key) => {
            acc[key] = copy[key];
            return acc;
          }, {})
      );
    };

    const targetFields = normalizeFields(fields);
    const existingIndexes = this.indexes();
    const hasSameFields = existingIndexes.filter(([idxFields]) => normalizeFields(idxFields) === targetFields);
    // Exact duplicate: ignore silently.
    if (
      hasSameFields.some(([_, idxOptions]) => normalizeOptions(idxOptions || {}) === normalizeOptions(options || {}))
    ) {
      return this;
    }

    // Prefer explicit schema indexes over simple path-level `index: true`.
    for (const fieldName of Object.keys(fields || {})) {
      const path = this.path(fieldName);
      if (path?.options?.index === true) {
        delete path.options.index;
      }
    }
  } catch (_err) {
    // Fall back to default behavior if patch logic fails.
  }

  return originalSchemaIndex.call(this, fields, options);
};

mongoose.Schema.prototype.indexes = function patchedIndexes(...args) {
  const indexes = originalSchemaIndexes.call(this, ...args);

  const normalizeFields = (obj = {}) =>
    JSON.stringify(
      Object.keys(obj)
        .sort()
        .reduce((acc, key) => {
          acc[key] = obj[key];
          return acc;
        }, {})
    );

  const normalizeOptions = (obj = {}) => {
    const copy = { ...obj };
    delete copy.background;
    return JSON.stringify(
      Object.keys(copy)
        .sort()
        .reduce((acc, key) => {
          acc[key] = copy[key];
          return acc;
        }, {})
    );
  };

  const deduped = [];
  const seen = new Set();
  for (const [fields, options] of indexes) {
    const key = `${normalizeFields(fields)}|${normalizeOptions(options || {})}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push([fields, options]);
  }

  return deduped;
};
}

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
    if (!mongoUri) {
      throw new Error('Missing MongoDB URI. Set MONGO_URI (or MONGODB_URI / DATABASE_URL).');
    }

    // On Render (and similar serverless/free tiers), a high minPoolSize slows first connect.
    // Override with MONGO_MIN_POOL_SIZE / MONGO_MAX_POOL_SIZE if needed.
    const minPool = Number(process.env.MONGO_MIN_POOL_SIZE);
    const maxPool = Number(process.env.MONGO_MAX_POOL_SIZE);
    const minPoolSize = Number.isFinite(minPool) && minPool >= 0
      ? minPool
      : process.env.RENDER === 'true'
        ? 0
        : 5;
    const maxPoolSize = Number.isFinite(maxPool) && maxPool > 0 ? maxPool : 20;

    const conn = await mongoose.connect(mongoUri, {
      maxPoolSize,
      minPoolSize,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      w: "majority",
      wtimeoutMS: 5000,
      readPreference: "primary",
      readConcern: { level: "majority" },
      autoIndex: process.env.NODE_ENV !== "production",
      autoCreate: process.env.NODE_ENV !== "production",
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Note: Graceful shutdown (SIGINT/SIGTERM) is handled centrally in server.js

  } catch (error) {
  logger.error(`MongoDB connection failed: ${error.message}`, {
    stack: error.stack,
    code: error.code,
    name: error.name
  });
  if (process.env.NODE_ENV === 'production') {
    throw error;
  }
  logger.warn('Server continuing without database outside production');
  return null;
}
};

export default connectDB;
