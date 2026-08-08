import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  goal: z.string().trim().min(10).max(1200),
});

export type Recommendation = {
  category: string;
  why: string;
  priority: "essential" | "supporting" | "optional";
};

export type RecommendResult = {
  summary: string;
  recommendations: Recommendation[];
  sample_prep: string[];
};

export const recommendEquipment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<RecommendResult> => {
    const key = process.env["OPENAI_API_KEY"];
    if (!key) throw new Error("AI is not configured");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a laboratory instrumentation advisor for a national research equipment sharing platform in India. " +
              "Given an experiment goal, recommend the instrument categories needed. " +
              "Use these category names when they fit: SEM, TEM, AFM, XRD, FTIR, HPLC, PCR, UTM, CNC, 3D Printer, Laser Cutter, Spectrometer, GC-MS, Optical Microscope, Nanoindenter, DSC. " +
              'Return strict JSON: {"summary": string, "recommendations": [{"category": string, "why": string, "priority": "essential"|"supporting"|"optional"}], "sample_prep": string[]}. ' +
              "Give 3-5 recommendations, each 'why' under 30 words, and 2-4 short sample preparation notes.",
          },
          { role: "user", content: data.goal },
        ],
      }),
    });

    if (res.status === 429) throw new Error("AI is busy right now. Please retry in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
    if (!res.ok) {
      const body = await res.text();
      console.error("AI gateway error", res.status, body);
      throw new Error("The AI assistant could not answer that request.");
    }

    const payload = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as RecommendResult;

    return {
      summary: parsed.summary ?? "",
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.slice(0, 6)
        : [],
      sample_prep: Array.isArray(parsed.sample_prep) ? parsed.sample_prep.slice(0, 5) : [],
    };
  });
