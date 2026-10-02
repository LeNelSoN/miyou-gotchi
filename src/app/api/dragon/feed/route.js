import { repondreAction } from "@/lib/dragonActionRoute";

export async function POST() {
  return repondreAction("nourrir");
}
