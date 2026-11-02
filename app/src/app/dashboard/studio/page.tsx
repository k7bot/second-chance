import { StudioClient } from "./studio-client";
import { studioAiModels } from "@/lib/studio-ai";
export const dynamic = "force-dynamic";
export default function Studio() {
  return <StudioClient models={studioAiModels()} />;
}
