// No longer used: "Send me a test" now goes through the database (push_test).
export async function POST() {
  return new Response("Gone", { status: 410 });
}
