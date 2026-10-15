import { describe, expect, it } from "vitest";
import { resolveAgainstDirectory, type DirectoryEntry } from "@/lib/resolve";

/**
 * Ask-once alias memory (AC-7), directory-level contract: once an attorney's
 * resolution has written an ALIAS_OF node for the ambiguous spelling, that
 * spelling exact-matches its node and is never asked again. (The graph-side
 * write + traversal is covered in tests/int/decide.test.ts.)
 */
describe("ask-once alias memory (AC-7)", () => {
  it("before resolution: 'R. Kane' is uncertain with the candidate's key attached", async () => {
    const dir: DirectoryEntry[] = [{ key: "p_rkane", name: "Robert T. Kane", kind: "Person" }];
    const r = await resolveAgainstDirectory({ name: "R. Kane", kind: "person", role: "adverse" }, dir);
    expect(r.status).toBe("uncertain");
    expect(r.nodeId).toBe(null);
    expect(r.candidateKey).toBe("p_rkane"); // what the attorney confirms at sign-off
  });

  it("after resolution: the alias node exists and the same spelling exact-matches, no question asked", async () => {
    const dir: DirectoryEntry[] = [
      { key: "p_rkane", name: "Robert T. Kane", kind: "Person" },
      { key: "alias_01", name: "R. Kane", kind: "Person" }, // written by the decision (ALIAS_OF -> p_rkane)
    ];
    const r = await resolveAgainstDirectory({ name: "R. Kane", kind: "person", role: "adverse" }, dir);
    expect(r.status).toBe("matched");
    expect(r.nodeId).toBe("alias_01");
    expect(r.confidence).toBe(1);
  });
});
