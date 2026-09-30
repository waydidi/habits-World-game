declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    PERSONAL_SETUP?: string;
    BUCKET?: R2Bucket;
  }
}
