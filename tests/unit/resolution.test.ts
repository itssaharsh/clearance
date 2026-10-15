import { describe, expect, it } from "vitest";
import { orgContainment, personAffinity, resolveAgainstDirectory, type DirectoryEntry } from "@/lib/resolve";
async function dir(names: Array<[string, string, string?]>): Promise<DirectoryEntry[]> {
  return names.map(([key, name, kind]) => ({ key, name, kind: kind ?? "Org" }));
}

describe("entity resolution (AC-3: fails closed, deterministic rules)", () => {
  it("exact normalized match is the only auto-match, confidence 1", async () => {
    const d = await dir([["k1", "Kane Logistics LLC"]]);
    const r = await resolveAgainstDirectory({ name: "kane logistics llc", kind: "org", role: "adverse" }, d);
    expect(r.status).toBe("matched");
    expect(r.nodeId).toBe("k1");
    expect(r.confidence).toBe(1);
  });

  it("a person near-name (initials) lands uncertain with the candidate attached, never auto-matched", async () => {
    const d = await dir([["p1", "Robert T. Kane", "Person"], ["x1", "Granite Row Realty"]]);
    const r = await resolveAgainstDirectory({ name: "R. Kane", kind: "person", role: "adverse" }, d);
    expect(r.status).toBe("uncertain");
    expect(r.nodeId).toBe(null);
    expect(r.candidateKey).toBe("p1");
  });

  it("an unrelated name is new, not uncertain", async () => {
    const d = await dir([["k1", "Kane Logistics LLC"]]);
    const r = await resolveAgainstDirectory({ name: "Tern Freight", kind: "org", role: "prospective_client" }, d);
    expect(r.status).toBe("new");
  });

  it("decoy precision: 'Kane & Sons Plumbing' exact-matches itself, not Kane Logistics", async () => {
    const d = await dir([["k1", "Kane Logistics LLC"], ["k2", "Kane & Sons Plumbing"]]);
    const r = await resolveAgainstDirectory({ name: "Kane & Sons Plumbing", kind: "org", role: "adverse" }, d);
    expect(r.status).toBe("matched");
    expect(r.nodeId).toBe("k2");
  });

  it("personAffinity: contradicting given names are different people; initials ask", () => {
    expect(personAffinity("Elena Vasquez", "Marco Vasquez")).toBe(0); // different given names
    expect(personAffinity("R. Kane", "Robert T. Kane")).toBeGreaterThan(0.7); // initials: ask once
    expect(personAffinity("Kane", "Robert T. Kane")).toBeGreaterThan(0.7); // surname only: ask
    expect(personAffinity("Nora Holt", "Nora Price")).toBe(0); // different surnames
  });

  it("orgContainment: subset of words asks; disjoint words are new; different suffix entity is not contained", () => {
    expect(orgContainment("Northgate", "Northgate Partners")).toBeGreaterThan(0.7);
    expect(orgContainment("Tern Freight", "Fairweather Freight")).toBe(0);
    expect(orgContainment("Meridian Build", "Meridian Group")).toBe(0);
  });
});
