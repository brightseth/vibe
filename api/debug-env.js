export default async function handler(req, res) {
  return res.status(200).json({
    ARTIFACTS_DUAL_WRITE: process.env.ARTIFACTS_DUAL_WRITE,
    ARTIFACTS_READ_FROM_PG: process.env.ARTIFACTS_READ_FROM_PG,
    POSTGRES_URL_exists: !!process.env.POSTGRES_URL,
    DUAL_WRITE_check: process.env.ARTIFACTS_DUAL_WRITE === 'true',
    value_type: typeof process.env.ARTIFACTS_DUAL_WRITE
  });
}
