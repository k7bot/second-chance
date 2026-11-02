import { cookies } from "next/headers";
export const COOKIE = "bs_sub";
export async function currentSubId(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE)?.value;
}
