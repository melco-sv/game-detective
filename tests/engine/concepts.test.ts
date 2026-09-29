import { describe, expect, it } from "vitest";
import { detectConcepts } from "@/engine/sql/concepts";

describe("detectConcepts", () => {
  it("mendeteksi where, order-by, limit", () => {
    const c = detectConcepts("SELECT * FROM t WHERE a = 1 ORDER BY a LIMIT 10");
    expect(c.has("where")).toBe(true);
    expect(c.has("order-by")).toBe(true);
    expect(c.has("limit")).toBe(true);
  });

  it("mendeteksi join dan left-join", () => {
    const c1 = detectConcepts("SELECT * FROM a JOIN b ON a.id = b.id");
    expect(c1.has("join")).toBe(true);
    expect(c1.has("left-join")).toBe(false);

    const c2 = detectConcepts("SELECT * FROM a LEFT JOIN b ON a.id = b.id");
    expect(c2.has("join")).toBe(true);
    expect(c2.has("left-join")).toBe(true);
  });

  it("mendeteksi self-join lewat tabel yang sama muncul dua kali", () => {
    const c = detectConcepts("SELECT * FROM pegawai a JOIN pegawai b ON a.atasan_id = b.id");
    expect(c.has("self-join")).toBe(true);
  });

  it("tidak mendeteksi self-join untuk join dua tabel berbeda", () => {
    const c = detectConcepts("SELECT * FROM a JOIN b ON a.id = b.id");
    expect(c.has("self-join")).toBe(false);
  });

  it("mendeteksi group-by, having, aggregate", () => {
    const c = detectConcepts("SELECT kota, COUNT(*) FROM t GROUP BY kota HAVING COUNT(*) > 5");
    expect(c.has("group-by")).toBe(true);
    expect(c.has("having")).toBe(true);
    expect(c.has("aggregate")).toBe(true);
  });

  it("mendeteksi subquery", () => {
    const c = detectConcepts("SELECT * FROM t WHERE id IN (SELECT id FROM u)");
    expect(c.has("subquery")).toBe(true);
  });

  it("mendeteksi cte dan recursive-cte", () => {
    const c1 = detectConcepts("WITH x AS (SELECT 1) SELECT * FROM x");
    expect(c1.has("cte")).toBe(true);
    expect(c1.has("recursive-cte")).toBe(false);

    const c2 = detectConcepts("WITH RECURSIVE x AS (SELECT 1 UNION ALL SELECT n+1 FROM x) SELECT * FROM x");
    expect(c2.has("cte")).toBe(true);
    expect(c2.has("recursive-cte")).toBe(true);
  });

  it("mendeteksi window function lewat OVER(...)", () => {
    const c = detectConcepts("SELECT id, ROW_NUMBER() OVER (ORDER BY id) FROM t");
    expect(c.has("window")).toBe(true);
  });

  it("mendeteksi set-ops (UNION/EXCEPT/INTERSECT)", () => {
    expect(detectConcepts("SELECT a FROM t UNION SELECT a FROM u").has("set-ops")).toBe(true);
    expect(detectConcepts("SELECT a FROM t EXCEPT SELECT a FROM u").has("set-ops")).toBe(true);
    expect(detectConcepts("SELECT a FROM t INTERSECT SELECT a FROM u").has("set-ops")).toBe(true);
  });

  it("tidak terpengaruh kata kunci di dalam string literal", () => {
    const c = detectConcepts("SELECT 'this has JOIN and WHERE inside' AS x FROM t");
    expect(c.has("join")).toBe(false);
    expect(c.has("where")).toBe(false);
  });

  it("mendeteksi like, in, between, null", () => {
    const c = detectConcepts("SELECT * FROM t WHERE a LIKE 'x%' AND b IN (1,2) AND c BETWEEN 1 AND 2 AND d IS NULL");
    expect(c.has("like")).toBe(true);
    expect(c.has("in")).toBe(true);
    expect(c.has("between")).toBe(true);
    expect(c.has("null")).toBe(true);
  });
});
